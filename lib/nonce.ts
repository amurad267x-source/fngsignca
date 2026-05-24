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