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