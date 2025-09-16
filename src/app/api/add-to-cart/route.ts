export const runtime = 'edge'

const STOREFRONT = `https://${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/api/2025-04/graphql.json`
const CART_CREATE = `#graphql
mutation ($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { message } }
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
    const { items } = await req.json() as {
      items: Array<{ sku: string; quantity: number; properties?: Record<string, string> }>
    }

    // Build an absolute URL to the **local** API (no env var needed)
    const here = new URL(req.url)
    const resolveUrl = new URL('/api/resolve-skus', `${here.protocol}//${here.host}`)

    const skuRes = await fetch(resolveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: items.map(i => i.sku) })
    })
    const { results, error: resolveError } = await skuRes.json() as any
    if (resolveError) {
      return new Response(JSON.stringify({ error: resolveError }), { status: 400, headers: corsHeaders })
    }

    const lines = items.map(i => ({
      quantity: i.quantity,
      merchandiseId: results[i.sku],
      attributes: Object.entries(i.properties || {}).map(([key, value]) => ({ key, value }))
    }))

    const r = await fetch(STOREFRONT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN!
      },
      body: JSON.stringify({ query: CART_CREATE, variables: { lines } })
    })
    const json = await r.json() as any
    const url = json?.data?.cartCreate?.cart?.checkoutUrl
    if (!url) {
      return new Response(JSON.stringify({ error: 'Cart create failed', details: json }), { status: 400, headers: corsHeaders })
    }
    return new Response(JSON.stringify({ checkoutUrl: url }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected error', message: e?.message }), { status: 500, headers: corsHeaders })
  }
}
