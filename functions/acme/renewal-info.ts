import { json } from '../../lib/response'

export const onRequestPost = async () => {
  return json({
    suggestedWindow: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 86400000).toISOString()
    }
  })
}