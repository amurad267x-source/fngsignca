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