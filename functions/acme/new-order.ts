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