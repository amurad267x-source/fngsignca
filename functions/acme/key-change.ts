import { json } from '../../lib/response'

if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "method_not_allowed",
        message: "Use POST"
      }),
      {
        status: 405,
        headers: {
          "content-type": "application/json",
          "Allow": "POST"
        }
      }
    )
  }

export const onRequestPost = async () => {
  return json({
    status: 'ok'
  })
}
