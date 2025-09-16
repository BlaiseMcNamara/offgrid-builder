export const runtime = 'edge'

const ADMIN = `https://${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/admin/api/2025-04/graphql.json`
const GQL = `#graphql
query ($q: String!) {
  productVariants(first: 1, query: $q) { edges { node { id sku } } }
}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: Request) {
  try {
    const { skus } = await req.json() as { skus: string[] }
    const results: Record<string, string> = {}

    for (const sku of skus) {
      const r = await fetch(ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
        },
        body: JSON.stringify({ query: GQL, variables: { q: `sku:${JSON.stringify(sku)}` } })
      })
      const json = await r.json() as any
      const id = json?.data?.productVariants?.edges?.[0]?.node?.id
      if (!id) {
        return new Response(JSON.stringify({ error: `SKU not found: ${sku}` }), { status: 400, headers: corsHeaders })
      }
      results[sku] = id
    }

    return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected error', message: e?.message }), { status: 500, headers: corsHeaders })
  }
}
