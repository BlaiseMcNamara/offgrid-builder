// src/app/api/prices/route.ts
export const runtime = 'edge'

/* ---------- CORS ---------- */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

/* ---------- Env ---------- */
const SHOP  = process.env.NEXT_PUBLIC_SHOP_DOMAIN!   // e.g. j93t9x-xc.myshopify.com
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
const GQL_URL = `https://${SHOP}/admin/api/2025-04/graphql.json`

/* ---------- Small in-memory cache (per region instance) ---------- */
type CacheEntry = { price: number | null; exp: number }
const PRICE_TTL_MS = 5 * 60 * 1000
const g = globalThis as any
if (!g.__PRICE_CACHE) g.__PRICE_CACHE = new Map<string, CacheEntry>()
const CACHE: Map<string, CacheEntry> = g.__PRICE_CACHE

function getCached(sku: string): number | null | undefined {
  const e = CACHE.get(sku)
  if (!e) return undefined
  if (e.exp < Date.now()) { CACHE.delete(sku); return undefined }
  return e.price
}
function setCached(sku: string, price: number | null) {
  CACHE.set(sku, { price, exp: Date.now() + PRICE_TTL_MS })
}

/* ---------- GraphQL: batch search by many SKUs in one go ---------- */
const GQL = `#graphql
  query VariantsBySku($q: String!) {
    productVariants(first: 100, query: $q) {
      nodes { sku price { amount } }
    }
  }
`

async function gqlLookup(skus: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (skus.length === 0) return out

  // Build OR query: sku:"A" OR sku:"B" ...
  const q = skus.map(s => `sku:${JSON.stringify(s)}`).join(' OR ')
  const r = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL, variables: { q } }),
  })
  if (!r.ok) throw new Error(`GQL ${r.status}: ${await r.text()}`)
  const j = await r.json() as any
  const nodes = j?.data?.productVariants?.nodes ?? []
  for (const n of nodes) {
    const sku = (n?.sku ?? '').trim()
    const price = n?.price?.amount != null ? Number(n.price.amount) : null
    if (sku && price != null && Number.isFinite(price)) out.set(sku, price)
  }
  return out
}

/* ---------- REST exact fallback for any misses ---------- */
type RestVariant = { id: string | number; sku: string; price: number | null }

async function restExact(sku: string): Promise<RestVariant[]> {
  const url =
    `https://${SHOP}/admin/api/2024-10/variants.json` +
    `?limit=250&fields=id,sku,price&sku=${encodeURIComponent(sku)}`

  const r = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }
  })
  if (!r.ok) throw new Error(`REST ${r.status}: ${await r.text()}`)

  const j = await r.json() as any
  const variants: RestVariant[] = (j?.variants ?? [])
    .map((v: any): RestVariant => ({
      id: v.id,
      sku: (v.sku ?? '').trim(),
      price: v.price != null ? Number(v.price) : null,
    }))
    .filter((v: RestVariant) => v.sku === sku) // <-- add type here

  return variants
}

/* ---------- Handler ---------- */
export async function POST(req: Request) {
  try {
    const { skus } = (await req.json()) as { skus: string[] }
    const wanted = Array.from(new Set((skus || []).map(s => String(s).trim())))

    const result: Record<string, { price: number | null }> = {}
    const toLookup: string[] = []

    // 1) serve from cache
    for (const sku of wanted) {
      const c = getCached(sku)
      if (c !== undefined) result[sku] = { price: c }
      else toLookup.push(sku)
    }

    // 2) batch GraphQL for the rest (single call for up to 100)
    if (toLookup.length) {
      const chunks: string[][] = []
      for (let i = 0; i < toLookup.length; i += 100) chunks.push(toLookup.slice(i, i + 100))
      for (const chunk of chunks) {
        const map = await gqlLookup(chunk)
        for (const sku of chunk) {
          const p = map.get(sku)
          if (p != null) { result[sku] = { price: p }; setCached(sku, p) }
        }
      }
    }

    // 3) REST fallback for any still missing
    for (const sku of wanted) {
      if (result[sku]) continue
      const matches = await restExact(sku)
      if (matches.length === 1 && matches[0].price != null && Number.isFinite(matches[0].price)) {
        const p = matches[0].price as number
        result[sku] = { price: p }; setCached(sku, p)
      } else {
        result[sku] = { price: null }; setCached(sku, null)
      }
    }

    return new Response(JSON.stringify({ prices: result }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
