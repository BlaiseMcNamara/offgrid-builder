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

const SHOP  = process.env.NEXT_PUBLIC_SHOP_DOMAIN!;       // e.g. j93t9x-xc.myshopify.com
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

async function findBySku(sku: string) {
  // Restrict fields for speed; product_id included to help spot dupes.
  const url = `https://${SHOP}/admin/api/2024-10/variants.json?sku=${encodeURIComponent(sku)}&fields=id,sku,price,product_id`;
  const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error(`Admin REST ${r.status}: ${await r.text()}`);
  const j = await r.json() as any;
  const variants = (j?.variants ?? []).map((v: any) => ({
    id: v.id, sku: v.sku?.trim(), product_id: v.product_id, price: v.price != null ? Number(v.price) : null
  }));
  return variants;
}

export async function POST(req: Request) {
  try {
    const { skus, debug } = (await req.json()) as { skus: string[]; debug?: boolean };
    const out: Record<string, { price: number | null }> = {};
    const diag: Record<string, any> = {};

    for (const raw of skus || []) {
      const sku = String(raw).trim();
      const variants = await findBySku(sku);
      if (variants.length === 1 && variants[0].price != null && Number.isFinite(variants[0].price)) {
        out[sku] = { price: variants[0].price as number };
      } else {
        out[sku] = { price: null }; // builder treats null as "missing"
      }
      if (debug) {
        diag[sku] = { matches: variants.length, variants };
      }
    }

    const body = debug ? { prices: out, debug: diag } : { prices: out };
    return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
