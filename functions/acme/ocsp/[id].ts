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