export const runtime = 'edge';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

const SHOP  = process.env.NEXT_PUBLIC_SHOP_DOMAIN!;       // e.g. j93t9x-xc.myshopify.com (must be *.myshopify.com)
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

// --- REST: exact, case-sensitive match
async function restVariantBySku(sku: string) {
  const url = `https://${SHOP}/admin/api/2024-10/variants.json?sku=${encodeURIComponent(sku)}&fields=id,sku,product_id,price`;
  const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error(`REST ${r.status}: ${await r.text()}`);
  const j = await r.json() as any;
  const variants = (j?.variants ?? []).map((v: any) => ({
    id: v.id,
    sku: (v.sku ?? '').trim(),
    product_id: v.product_id,
    price: v.price != null ? Number(v.price) : null,
  }));
  return variants;
}

// --- GraphQL: fuzzy fallback search if REST finds nothing (helps when there’s a hidden character)
const GQL = `#graphql
  query VariantBySku($q: String!) {
    productVariants(first: 5, query: $q) {
      nodes { id sku price { amount } product { id title } }
    }
  }
`;
async function gqlVariantSearch(sku: string) {
  const url = `https://${SHOP}/admin/api/2025-04/graphql.json`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL, variables: { q: `sku:${JSON.stringify(sku)}` } }),
  });
  if (!r.ok) throw new Error(`GQL ${r.status}: ${await r.text()}`);
  const j = await r.json() as any;
  const nodes = j?.data?.productVariants?.nodes ?? [];
  return nodes.map((n: any) => ({
    id: n.id,
    sku: (n.sku ?? '').trim(),
    price: n.price?.amount != null ? Number(n.price.amount) : null,
    product: n.product?.title,
  }));
}

export async function POST(req: Request) {
  try {
    const { skus, debug } = (await req.json()) as { skus: string[]; debug?: boolean };
    const out: Record<string, { price: number | null }> = {};
    const diag: Record<string, any> = {};

    for (const raw of skus || []) {
      const sku = String(raw).trim();

      // 1) REST exact
      let matches = await restVariantBySku(sku);

      // 2) GQL fallback if none
      if (matches.length === 0) {
        const g = await gqlVariantSearch(sku);
        matches = g.map((n) => ({ id: n.id, sku: n.sku, product_id: undefined, price: n.price }));
        if (debug) diag[sku] = { rest_matches: 0, gql_matches: g.length, gql: g };
      } else if (debug) {
        diag[sku] = { rest_matches: matches.length, rest: matches };
      }

      // Use price only if there is exactly ONE match and it’s numeric
      if (matches.length === 1 && matches[0].price != null && Number.isFinite(matches[0].price)) {
        out[sku] = { price: matches[0].price as number };
      } else {
        out[sku] = { price: null };
        if (debug && !diag[sku]) diag[sku] = { ambiguous_or_missing: matches };
      }
    }

    const body = debug ? { prices: out, debug: diag } : { prices: out };
    return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'prices_lookup_failed', message: e?.message ?? String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
