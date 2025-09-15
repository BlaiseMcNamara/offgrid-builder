export const runtime = 'edge'
const ADMIN = `https://${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/admin/api/2025-04/graphql.json`
const GQL = `#graphql
query ($q: String!) {
  productVariants(first: 1, query: $q) { edges { node { id sku } } }
}`

export async function POST(req: Request) {
  const { skus } = await req.json()
  const results: Record<string,string> = {}
  for (const sku of skus as string[]) {
    const r = await fetch(ADMIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
      },
      body: JSON.stringify({ query: GQL, variables: { q: `sku:${JSON.stringify(sku)}` } })
    })
    const json = await r.json()
    const id = json?.data?.productVariants?.edges?.[0]?.node?.id
    if (!id) return new Response(JSON.stringify({ error: `SKU not found: ${sku}` }), { status: 400 })
    results[sku] = id
  }
  return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } })
}
