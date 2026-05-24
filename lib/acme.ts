export async function parseBody(req: Request) {
  return await req.json()
}

export function b64urlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')

  const pad = input.length % 4

  if (pad) {
    input += '='.repeat(4 - pad)
  }

  return atob(input)
}