import { json } from '../../lib/response'

export const onRequestPost = async () => {
  return json({
    status: 'revoked'
  })
}