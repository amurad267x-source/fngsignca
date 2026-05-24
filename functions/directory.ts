export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      keyChange:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/key-change',

      newAccount:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/new-acct',

      newNonce:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/new-nonce',

      newOrder:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/new-order',

      renewalInfo:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/renewal-info',

      revokeCert:
        'https://acme-v1.api.fngsignCA.qzz.io/acme/revoke-cert'
    }),
    {
      headers: {
        'content-type': 'application/json'
      }
    }
  )
}
