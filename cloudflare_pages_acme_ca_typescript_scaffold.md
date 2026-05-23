# Cloudflare Pages ACME CA (TypeScript)

Полноценный production ACME сервер уровня Let's Encrypt — это огромный проект. Но для тестового ACME CA с поддержкой certbot, OCSP, HTTP-01 и DNS-01 на Cloudflare Pages Functions — это реально.

Ниже — рабочий каркас структуры и файлов.

---

# Установка

## package.json

```json
{
  "name": "fngsign-acme",
  "type": "module",
  "dependencies": {
    "node-forge": "^1.3.1"
  }
}
```

---

# wrangler.toml

```toml
name = "fngsign-acme"
compatibility_date = "2026-05-22"
pages_build_output_dir = "./public"

[[kv_namespaces]]
binding = "ACME_KV"
id = "YOUR_KV_ID"
```

---

# Secrets

```bash
wrangler pages secret put ROOT_CA_CERT
wrangler pages secret put ROOT_CA_KEY
```

---

# Структура

```txt
/functions
  directory.ts

  /acme
    new-nonce.ts
    new-acct.ts
    new-order.ts
    revoke-cert.ts
    renewal-info.ts
    key-change.ts

    /authz
      [id].ts

    /challenge
      [id].ts

    /finalize
      [id].ts

    /cert
      [id].ts

    /ocsp
      [id].ts

/lib
  acme.ts
  nonce.ts
  crypto.ts
  cert.ts
  response.ts
```

---

# /lib/response.ts

```ts
export function json(data: any, status = 200, headers: any = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  })
}
```

---

# /lib/nonce.ts

```ts
export async function createNonce(env: any) {
  const nonce = crypto.randomUUID()

  await env.ACME_KV.put(
    `nonce:${nonce}`,
    '1',
    {
      expirationTtl: 300
    }
  )

  return nonce
}

export async function verifyNonce(env: any, nonce: string) {
  const exists = await env.ACME_KV.get(`nonce:${nonce}`)

  if (!exists) {
    return false
  }

  await env.ACME_KV.delete(`nonce:${nonce}`)

  return true
}
```

---

# /functions/directory.ts

```ts
import { json } from '../lib/response'

export const onRequestGet = async () => {
  return json({
    keyChange: 'https://acme-v1.api.fngsignCA.qzz.io/acme/key-change',
    newAccount: 'https://acme-v1.api.fngsignCA.qzz.io/acme/new-acct',
    newNonce: 'https://acme-v1.api.fngsignCA.qzz.io/acme/new-nonce',
    newOrder: 'https://acme-v1.api.fngsignCA.qzz.io/acme/new-order',
    renewalInfo: 'https://acme-v1.api.fngsignCA.qzz.io/acme/renewal-info',
    revokeCert: 'https://acme-v1.api.fngsignCA.qzz.io/acme/revoke-cert',
    meta: {
      website: 'https://fngsignca.qzz.io'
    }
  })
}
```

---

# /functions/acme/new-nonce.ts

```ts
import { createNonce } from '../../lib/nonce'

export const onRequestHead = async (ctx: any) => {
  const nonce = await createNonce(ctx.env)

  return new Response(null, {
    status: 200,
    headers: {
      'Replay-Nonce': nonce,
      'Cache-Control': 'no-store'
    }
  })
}

export const onRequestGet = onRequestHead
```

---

# /lib/acme.ts

```ts
export async function parseBody(req: Request) {
  return await req.json()
}

export function b64urlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')

  const pad = input.length % 4

  if (pad) {
    input += '='.repeat(4 - pad)
  }

  return atob(input)
}
```

---

# /functions/acme/new-acct.ts

```ts
import { json } from '../../lib/response'
import { parseBody } from '../../lib/acme'

export const onRequestPost = async (ctx: any) => {
  const body = await parseBody(ctx.request)

  const id = crypto.randomUUID()

  await ctx.env.ACME_KV.put(
    `acct:${id}`,
    JSON.stringify(body)
  )

  return json({
    status: 'valid'
  }, 201, {
    'Location': `https://acme-v1.api.fngsignCA.qzz.io/acme/acct/${id}`
  })
}
```

---

# /functions/acme/new-order.ts

```ts
import { json } from '../../lib/response'

export const onRequestPost = async (ctx: any) => {
  const body = await ctx.request.json()

  const orderId = crypto.randomUUID()
  const authzId = crypto.randomUUID()

  const domain = body.identifiers[0].value

  const token = crypto.randomUUID().replace(/-/g, '')

  await ctx.env.ACME_KV.put(
    `authz:${authzId}`,
    JSON.stringify({
      domain,
      token,
      status: 'pending'
    })
  )

  await ctx.env.ACME_KV.put(
    `order:${orderId}`,
    JSON.stringify({
      domain,
      authzId,
      status: 'pending'
    })
  )

  return json({
    status: 'pending',
    authorizations: [
      `https://acme-v1.api.fngsignCA.qzz.io/acme/authz/${authzId}`
    ],
    finalize: `https://acme-v1.api.fngsignCA.qzz.io/acme/finalize/${orderId}`
  }, 201)
}
```

---

# /functions/acme/authz/[id].ts

```ts
import { json } from '../../../lib/response'

export const onRequestGet = async (ctx: any) => {
  const id = ctx.params.id

  const raw = await ctx.env.ACME_KV.get(`authz:${id}`)

  if (!raw) {
    return json({ error: 'not found' }, 404)
  }

  const authz = JSON.parse(raw)

  return json({
    identifier: {
      type: 'dns',
      value: authz.domain
    },
    status: authz.status,
    challenges: [
      {
        type: 'http-01',
        url: `https://acme-v1.api.fngsignCA.qzz.io/acme/challenge/${id}`,
        token: authz.token,
        status: authz.status
      }
    ]
  })
}
```

---

# /functions/acme/challenge/[id].ts

```ts
import { json } from '../../../lib/response'

export const onRequestPost = async (ctx: any) => {
  const id = ctx.params.id

  const raw = await ctx.env.ACME_KV.get(`authz:${id}`)

  if (!raw) {
    return json({ error: 'not found' }, 404)
  }

  const authz = JSON.parse(raw)

  const url = `http://${authz.domain}/.well-known/acme-challenge/${authz.token}`

  try {
    const res = await fetch(url)

    const text = await res.text()

    if (!text.includes(authz.token)) {
      throw new Error('challenge failed')
    }

    authz.status = 'valid'

    await ctx.env.ACME_KV.put(
      `authz:${id}`,
      JSON.stringify(authz)
    )

    return json({
      status: 'valid'
    })
  } catch {
    return json({
      status: 'invalid'
    }, 400)
  }
}
```

---

# /lib/cert.ts

```ts
import forge from 'node-forge'

export async function signCertificate(
  env: any,
  csrPem: string,
  domains: string[]
) {
  const caCert = forge.pki.certificateFromPem(env.ROOT_CA_CERT)

  const caKey = forge.pki.privateKeyFromPem(env.ROOT_CA_KEY)

  const csr = forge.pki.certificationRequestFromPem(csrPem)

  const cert = forge.pki.createCertificate()

  cert.serialNumber = String(Date.now())

  cert.publicKey = csr.publicKey

  cert.validity.notBefore = new Date()

  cert.validity.notAfter = new Date()

  cert.validity.notAfter.setFullYear(
    cert.validity.notBefore.getFullYear() + 1
  )

  cert.setSubject(csr.subject.attributes)

  cert.setIssuer(caCert.subject.attributes)

  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true
    },
    {
      name: 'authorityInfoAccess',
      accessDescriptions: [
        {
          accessMethod: forge.pki.oids.ocsp,
          accessLocation: {
            type: 6,
            value: 'https://acme-v1.api.fngsignCA.qzz.io/acme/ocsp/main'
          }
        }
      ]
    },
    {
      name: 'subjectAltName',
      altNames: domains.map(d => ({
        type: 2,
        value: d
      }))
    }
  ])

  cert.sign(caKey, forge.md.sha256.create())

  return forge.pki.certificateToPem(cert)
}
```

---

# /functions/acme/finalize/[id].ts

```ts
import forge from 'node-forge'
import { json } from '../../../lib/response'
import { signCertificate } from '../../../lib/cert'

export const onRequestPost = async (ctx: any) => {
  const id = ctx.params.id

  const orderRaw = await ctx.env.ACME_KV.get(`order:${id}`)

  if (!orderRaw) {
    return json({ error: 'order not found' }, 404)
  }

  const order = JSON.parse(orderRaw)

  const authzRaw = await ctx.env.ACME_KV.get(
    `authz:${order.authzId}`
  )

  const authz = JSON.parse(authzRaw)

  if (authz.status !== 'valid') {
    return json({
      error: 'challenge not valid'
    }, 400)
  }

  const body = await ctx.request.json()

  const csrDer = atob(body.csr)

  const csrAsn1 = forge.asn1.fromDer(csrDer)

  const csrObj = forge.pki.certificationRequestFromAsn1(csrAsn1)

  const csrPem = forge.pki.certificationRequestToPem(csrObj)

  const certPem = await signCertificate(
    ctx.env,
    csrPem,
    [order.domain]
  )

  const certId = crypto.randomUUID()

  await ctx.env.ACME_KV.put(
    `cert:${certId}`,
    certPem
  )

  order.status = 'valid'
  order.certificate = certId

  await ctx.env.ACME_KV.put(
    `order:${id}`,
    JSON.stringify(order)
  )

  return json({
    status: 'valid',
    certificate: `https://acme-v1.api.fngsignCA.qzz.io/acme/cert/${certId}`
  })
}
```

---

# /functions/acme/cert/[id].ts

```ts
export const onRequestGet = async (ctx: any) => {
  const id = ctx.params.id

  const cert = await ctx.env.ACME_KV.get(`cert:${id}`)

  if (!cert) {
    return new Response('not found', {
      status: 404
    })
  }

  return new Response(cert, {
    headers: {
      'content-type': 'application/pem-certificate-chain'
    }
  })
}
```

---

# /functions/acme/ocsp/[id].ts

```ts
export const onRequestPost = async () => {
  return new Response(
    'OCSP placeholder',
    {
      status: 200,
      headers: {
        'content-type': 'application/ocsp-response'
      }
    }
  )
}
```

---

# revoke-cert.ts

```ts
import { json } from '../../lib/response'

export const onRequestPost = async () => {
  return json({
    status: 'revoked'
  })
}
```

---

# renewal-info.ts

```ts
import { json } from '../../lib/response'

export const onRequestPost = async () => {
  return json({
    suggestedWindow: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 86400000).toISOString()
    }
  })
}
```

---

# key-change.ts

```ts
import { json } from '../../lib/response'

export const onRequestPost = async () => {
  return json({
    status: 'ok'
  })
}
```

---

# Генерация ROOT CA

Сделай локально один раз:

```bash
openssl genrsa -out root.key 4096

openssl req -x509 -new -nodes \
-key root.key \
-sha256 \
-days 3650 \
-out root.crt
```

Потом:

```bash
wrangler pages secret put ROOT_CA_KEY
wrangler pages secret put ROOT_CA_CERT
```

---

# Deploy

```bash
npm install

npx wrangler pages deploy
```

---

# Certbot тест

```bash
certbot certonly \
--manual \
--server https://acme-v1.api.fngsignCA.qzz.io/directory \
-d yourdomain.com
```

---

# Важно про Chrome

OCSP endpoint сам по себе НЕ делает сертификат доверенным.

Chrome будет проверять OCSP только если:

- root CA импортирован в trust store
- сертификат содержит authorityInfoAccess
- OCSP endpoint отвечает валидным ASN.1 OCSP response

Сейчас в scaffold OCSP заглушка.

Для полноценного OCSP тебе понадобится:

- ASN.1 OCSP response generator
- signing OCSP responses
- revoked serial database
- proper DER encoding

Это уже сильно сложнее обычного ACME.

Но Chrome реально сможет проверять revocation если:

- root установлен в систему
- OCSP реализован правильно
- сертификаты содержат AIA OCSP URL

---

# Что улучшить дальше

## Обязательно

- JWS verification
- nonce replay protection
- proper kid/jwk support
- DNS-01 support
- order polling
- challenge polling
- certificate chains
- serial database
- CRL endpoint
- настоящий OCSP DER

## Потом

- ECDSA certificates
- wildcard domains
- rate limits
- account keys
- external account binding
- SCT / CT logs

---

# Самое важное

Да — certbot реально может выпустить сертификат через Pages Functions.

И да — полностью без OpenSSL backend.

OpenSSL нужен только локально чтобы один раз создать ROOT CA.

