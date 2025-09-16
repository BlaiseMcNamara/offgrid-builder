// src/app/api/prices/route.ts
export const runtime = 'edge'

/* CORS (Shopify iframe safe) */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

/* Env */
const SHOP  = process.env.NEXT_PUBLIC_SHOP_DOMAIN!   // e.g. j93t9x-xc.myshopify.com
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!

/* Types */
type RestVariant = {
  id: number | string
  sku: string
  product_id?: number | string
  price: number | null
}
type GqlVariant = {
  id: string
  sku: string
  price: number | null
  product?: string
}

// Replace your restVariantBySku with this:

async function restVariantBySku(sku: string): Promise<RestVariant[]> {
  // ask for a big page so the exact SKU is likely included
  const url =
    `https://${SHOP}/admin/api/2024-10/variants.json` +
    `?limit=250&fields=id,sku,product_id,price&sku=${encodeURIComponent(sku)}`

  const r = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error(`REST ${r.status}: ${await r.text()}`)

  const j = (await r.json()) as any

  // Map then FILTER to the **exact** SKU (trimmed)
  const variants: RestVariant[] = (j?.variants ?? [])
    .map((v: any): RestVariant => ({
      id: v.id,
      sku: (v.sku ?? '').trim(),
      product_id: v.product_id,
      price: v.price != null ? Number(v.price) : null,
    }))
    .filter((v: RestVariant) => v.sku === sku)   // ← critical line

  return variants
}


/* ---------- GraphQL fallback: fuzzy search ---------- */
const GQL = `#graphql
  query VariantBySku($q: String!) {
    productVariants(first: 5, query: $q) {
      nodes { id sku price { amount } product { title } }
    }
  }
`
async function gqlVariantSearch(sku: string): Promise<GqlVariant[]> {
  const url = `https://${SHOP}/admin/api/2025-04/graphql.json`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL, variables: { q: `sku:${JSON.stringify(sku)}` } }),
  })
  if (!r.ok) throw new Error(`GQL ${r.status}: ${await r.text()}`)

  const j = (await r.json()) as any
  const nodes = j?.data?.productVariants?.nodes ?? []
  const out: GqlVariant[] = nodes.map((n: any): GqlVariant => ({
    id: n.id,
    sku: (n.sku ?? '').trim(),
    price: n?.price?.amount != null ? Number(n.price.amount) : null,
    product: n?.product?.title,
  }))
  return out
}

/* ---------- Handler ---------- */
export async function POST(req: Request) {
  try {
    const { skus, debug } = (await req.json()) as { skus: string[]; debug?: boolean }
    const prices: Record<string, { price: number | null }> = {}
    const diag: Record<string, any> = {}

    for (const raw of skus || []) {
      const sku = String(raw).trim()

      let matches: RestVariant[] = await restVariantBySku(sku)

      if (matches.length === 0) {
        const g: GqlVariant[] = await gqlVariantSearch(sku)
        // Map GQL -> REST-like shape (explicit type on n to satisfy TS)
        matches = g.map((n: GqlVariant): RestVariant => ({
          id: n.id,
          sku: n.sku,
          product_id: undefined,
          price: n.price,
        }))
        if (debug) diag[sku] = { rest_matches: 0, gql_matches: g.length, gql: g }
      } else if (debug) {
        diag[sku] = { rest_matches: matches.length, rest: matches }
      }

      // Only accept a single, numeric match
      if (matches.length === 1 && matches[0].price != null && Number.isFinite(matches[0].price)) {
        prices[sku] = { price: matches[0].price as number }
      } else {
        prices[sku] = { price: null }
        if (debug && !diag[sku]) diag[sku] = { ambiguous_or_missing: matches }
      }
    }

    const body = debug ? { prices, debug: diag } : { prices }
    return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
}
