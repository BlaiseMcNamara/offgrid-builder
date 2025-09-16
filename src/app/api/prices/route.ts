// src/app/api/prices/route.ts
export const runtime = 'edge'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

const ADMIN = `https://${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/admin/api/2025-04/graphql.json`

const QUERY = `#graphql
  query VariantBySku($q: String!) {
    productVariants(first: 1, query: $q) {
      nodes {
        id
        sku
        price
        inventoryItem { unitCost { amount currencyCode } }
      }
    }
  }
`

export async function POST(req: Request) {
  try {
    const { skus } = (await req.json()) as { skus: string[] }
    const out: Record<string, { price: number; cost: number | null }> = {}

    for (const sku of skus || []) {
      const r = await fetch(ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
        },
        body: JSON.stringify({ query: QUERY, variables: { q: `sku:${JSON.stringify(sku)}` } })
      })
      const j = (await r.json()) as any
      const v = j?.data?.productVariants?.nodes?.[0]
      out[sku] = v
        ? { price: v.price ? parseFloat(v.price) : 0, cost: v.inventoryItem?.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : null }
        : { price: 0, cost: null }
    }

    return new Response(JSON.stringify({ prices: out }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices lookup failed', message: e?.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
