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