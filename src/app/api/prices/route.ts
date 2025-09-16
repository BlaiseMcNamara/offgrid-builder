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

// Admin API: variant.price is Money => price { amount }
const QUERY = `#graphql
  query VariantBySku($q: String!) {
    productVariants(first: 1, query: $q) {
      nodes {
        id
        sku
        price { amount currencyCode }
        inventoryItem { unitCost { amount currencyCode } }
      }
    }
  }
`

export async function POST(req: Request) {
  try {
    const { skus } = (await req.json()) as { skus: string[] }
    const out: Record<string, { price: number | null; cost: number | null }> = {}

    for (const sku of skus || []) {
      const r = await fetch(ADMIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
        },
        body: JSON.stringify({ query: QUERY, variables: { q: `sku:${JSON.stringify(sku)}` } })
      })
      if (!r.ok) {
        const body = await r.text()
        return new Response(JSON.stringify({ error: 'admin_graphql_error', status: r.status, body }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }

      const j = (await r.json()) as any
      const v = j?.data?.productVariants?.nodes?.[0]

      if (v) {
        const p = v?.price?.amount != null ? Number(v.price.amount) : null
        const c = v?.inventoryItem?.unitCost?.amount != null ? Number(v.inventoryItem.unitCost.amount) : null
        out[sku] = { price: Number.isFinite(p as number) ? (p as number) : null, cost: Number.isFinite(c as number) ? (c as number) : null }
      } else {
        out[sku] = { price: null, cost: null } // IMPORTANT: null, not 0
      }
    }

    return new Response(JSON.stringify({ prices: out }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
