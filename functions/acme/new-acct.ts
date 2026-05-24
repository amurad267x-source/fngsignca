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