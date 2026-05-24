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