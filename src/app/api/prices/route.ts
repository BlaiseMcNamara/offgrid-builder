// src/app/api/prices/route.ts
export const runtime = 'edge'

// CORS (embedded in Shopify)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

const SHOP = process.env.NEXT_PUBLIC_SHOP_DOMAIN // MUST be *.myshopify.com
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

const BASE = `https://${SHOP}/admin/api/2024-10/variants.json?sku=`

async function fetchVariantBySku(sku: string) {
  const url = BASE + encodeURIComponent(sku)
  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': TOKEN!,
      'Content-Type': 'application/json'
    }
  })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Admin REST ${r.status}: ${body}`)
  }
  const j = await r.json() as any
  // REST returns { variants: [ { id, sku, price, ... } ] }
  const v = j?.variants?.[0]
  if (!v) return { price: null as number | null, _debug: { found: false } }
  const priceNum = v.price != null ? Number(v.price) : null
  return { price: Number.isFinite(priceNum as number) ? (priceNum as number) : null, _debug: { found: true, sku: v.sku } }
}

export async function POST(req: Request) {
  try {
    const { skus, debug } = (await req.json()) as { skus: string[]; debug?: boolean }
    if (!Array.isArray(skus) || skus.length === 0) {
      return new Response(JSON.stringify({ prices: {} }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const entries = await Promise.all(
      skus.map(async (sku) => {
        try {
          const v = await fetchVariantBySku(sku)
          return [sku, { price: v.price }] as const
        } catch (e: any) {
          return [sku, { price: null, error: e?.message ?? String(e) }] as const
        }
      })
    )

    const prices: Record<string, { price: number | null }> = Object.fromEntries(entries)

    return new Response(JSON.stringify({ prices }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
