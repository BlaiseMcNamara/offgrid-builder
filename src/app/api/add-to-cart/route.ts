export const runtime = 'edge'
const STOREFRONT = `https://${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/api/2025-04/graphql.json`
const CART_CREATE = `#graphql
mutation ($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { message } }
}`

export async function POST(req: Request) {
  const { items } = await req.json()
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/resolve-skus`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ skus: items.map((i:any)=>i.sku) })
  })
  const { results } = await res.json()
  const lines = items.map((i:any) => ({
    quantity: i.quantity,
    merchandiseId: results[i.sku],
    attributes: Object.entries(i.properties||{}).map(([key,value])=>({ key, value }))
  }))
  const r = await fetch(STOREFRONT, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN! },
    body: JSON.stringify({ query: CART_CREATE, variables: { lines } })
  })
  const json = await r.json()
  const url = json?.data?.cartCreate?.checkoutUrl
  if(!url) return new Response(JSON.stringify({ error:'Cart create failed', json }), { status:400 })
  return new Response(JSON.stringify({ checkoutUrl: url }), { headers: { 'Content-Type':'application/json' } })
}
