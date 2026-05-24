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
        url: `https://acme-v1.api.fngsignCA.qzz.io/acme/chall/${id}`,
        token: authz.token,
        status: authz.status
      }
    ]
  })
}