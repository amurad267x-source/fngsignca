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