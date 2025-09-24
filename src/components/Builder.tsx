'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* ================================================================
   STEP INDICATOR (inline, so the file is drop-in)
================================================================ */
function Steps({
  labels,
  current,
  onGo,
}: { labels: string[]; current: number; onGo: (n: number) => void }) {
  return (
    <div className="steps">
      {labels.map((t, i) => (
        <button
          key={t}
          type="button"
          className={`s ${i === current ? 'active' : i < current ? 'done' : ''}`}
          onClick={() => onGo(i)}
        >
          <span className="n">{i + 1}</span>
          <span>{t}</span>
        </button>
      ))}
      <style jsx>{`
        .steps{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px}
        .s{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid #e6e8eb;background:#fff;color:#111;font-weight:600}
        .s .n{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:12px}
        .s.active{background:#111;color:#fff}
        .s.active .n{background:#fff;color:#111}
        .s.done{opacity:.7}
      `}</style>
    </div>
  );
}

/* ================================================================
   DATA
================================================================ */
type Family = 'BatterySingle' | 'BatteryTwin' | 'Welding';
type Gauge = string;

type EndVariant = { id: string; label: string; compat: readonly string[] };
type EndType = 'Lug' | 'BatteryClamp' | 'Anderson';
type EndChoice = { type: EndType | ''; variantId: string | '' };

const END_OPTIONS: Record<EndType, { label: string; variants: EndVariant[] }> = {
  Lug: {
    label: 'Lugs',
    variants: [
      { id: 'lug-6mm-6hole', label: '6mm² • 6mm hole', compat: ['8','6mm','6'] },
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'] },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'] },
      { id: 'lug-35mm-10hole', label: '35mm² • 10mm hole', compat: ['1','0'] },
      { id: 'lug-50mm-10hole', label: '50mm² • 10mm hole', compat: ['0','00'] },
      { id: 'lug-70mm-10hole', label: '70mm² • 10mm hole', compat: ['00','000'] },
      { id: 'lug-95mm-12hole', label: '95mm² • 12mm hole', compat: ['000','0000'] },
    ],
  },
  BatteryClamp: {
    label: 'Battery terminals',
    variants: [
      { id: 'post-pos', label: 'Top Post (+)', compat: ['4','3','2','1','0'] },
      { id: 'post-neg', label: 'Top Post (−)', compat: ['4','3','2','1','0'] },
    ],
  },
  Anderson: {
    label: 'Anderson plugs',
    variants: [
      { id: 'sb50', label: 'SB50', compat: ['8','6','4','3'] },
      { id: 'sb120', label: 'SB120', compat: ['2','1','0'] },
      { id: 'sb175', label: 'SB175', compat: ['0','00','000'] },
      { id: 'sb350', label: 'SB350', compat: ['000','0000'] },
    ],
  },
};

const cents = (n: number) => Math.round(n * 100);
const fmt = (cents: number) => (cents / 100).toFixed(2);
const fmtM = (m: number) => `${m.toFixed(2)} m`;

/* ================================================================
   SMALL ICONS
================================================================ */
function TypeTile({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`tile ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="t">{label}</span>
      <style jsx>{`
        .tile{border:1px solid #e6e8eb;border-radius:14px;background:#fff;padding:16px;text-align:left}
        .tile.active{border-color:#111;box-shadow:0 0 0 2px #111 inset}
        .t{font-weight:600}
      `}</style>
    </button>
  );
}

function EndTypeButton({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`endType ${active ? 'active' : ''}`} onClick={onClick} type="button">
      <span>{label}</span>
      <style jsx>{`
        .endType{display:flex;align-items:center;gap:8px;border:1px solid #e6e8eb;border-radius:12px;padding:10px 12px;background:#fff}
        .endType.active{border-color:#111}
      `}</style>
    </button>
  );
}

function Chip({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
      <style jsx>{`
        .chip{border:1px solid #e6e8eb;border-radius:999px;background:#fff;padding:8px 12px}
        .chip.active{background:#111;color:#fff;border-color:#111}
      `}</style>
    </button>
  );
}

/* ================================================================
   MAIN
================================================================ */
export default function Builder() {
  const labels = ['Cable', 'Length', 'Left end', 'Right end', 'Heat-shrink'];
  const [step, setStep] = useState(0);

  const [family, setFamily] = useState<Family>('BatterySingle');
  const [gauge, setGauge] = useState<Gauge>('4');
  const [lengthM, setLengthM] = useState<number>(1.0); // default 1.00 m
  const [pairMode, setPairMode] = useState<boolean>(false); // auto when BatteryTwin

  const [left, setLeft] = useState<EndChoice>({ type: '', variantId: '' });
  const [right, setRight] = useState<EndChoice>({ type: '', variantId: '' });

  const [addSleeve, setAddSleeve] = useState(false);
  const [addInsulators, setAddInsulators] = useState(false);

  const lengthCm = Math.round(lengthM * 100);

  // pricing cache (live from Shopify)
  const [priceCache, setPriceCache] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // SKUs
  const baseSku = `CABLE-${family}-${gauge}-CM`;
  const sleeveSku = `SLEEVE-${gauge}-CM`;
  const insSku = 'INSULATOR-LUG-BOOT';
  const allEndSkus = useMemo(
    () =>
      (Object.values(END_OPTIONS) as { variants: EndVariant[] }[])
        .flatMap((o) => o.variants)
        .map((v) => `END-${v.id.toUpperCase()}`),
    []
  );

  // fetch prices helper
  async function fetchPrices(skus: string[]) {
    setLoadingPrices(true);
    try {
      const r = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus }),
      });
      const j = (await r.json()) as { prices: Record<string, { price: number | null }> };
      const next: Record<string, number | null> = { ...priceCache };
      for (const [k, v] of Object.entries(j.prices)) next[k] = v?.price ?? null;
      setPriceCache(next);
    } catch (e) {
      // ignore; totals will show missing price
    } finally {
      setLoadingPrices(false);
    }
  }

  // On family/gauge change: fetch base+sleeve+ins+all ends; reset ends; set pair mode
  useEffect(() => {
    setLeft({ type: '', variantId: '' });
    setRight({ type: '', variantId: '' });
    setPairMode(family === 'BatteryTwin');
    void fetchPrices([baseSku, sleeveSku, insSku, ...allEndSkus]);
  }, [family, gauge]); // eslint-disable-line

  // price reader
  const p = (sku: string) => priceCache[sku];

  // computed totals
  const baseCableCents = cents((p(baseSku) ?? 0) * lengthCm * (pairMode ? 2 : 1));
  const sleeveCents =
    addSleeve && p(sleeveSku) != null
      ? cents((p(sleeveSku) ?? 0) * lengthCm * (pairMode ? 2 : 1))
      : 0;
  const endCentsLeft =
    left.variantId && left.type
      ? cents((p(`END-${left.variantId.toUpperCase()}`) ?? 0) * (pairMode ? 2 : 1))
      : 0;
  const endCentsRight =
    right.variantId && right.type
      ? cents((p(`END-${right.variantId.toUpperCase()}`) ?? 0) * (pairMode ? 2 : 1))
      : 0;
  const insCents =
    addInsulators && p(insSku) != null
      ? cents((p(insSku) ?? 0) * (pairMode ? 4 : 2))
      : 0;

  const subtotal = baseCableCents + sleeveCents + endCentsLeft + endCentsRight + insCents;
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  // filtering: only types with at least 1 compatible variant
  const availableTypes: EndType[] = useMemo(() => {
    return (Object.keys(END_OPTIONS) as EndType[]).filter((t) =>
      END_OPTIONS[t].variants.some((v) => v.compat.includes(gauge))
    );
  }, [gauge]);

  function compatibleVariants(t: EndType | ''): EndVariant[] {
    if (!t) return [];
    return END_OPTIONS[t as EndType].variants.filter((v) => v.compat.includes(gauge));
  }

  // Length controls: +/- 1cm (0.01 m)
  const bump = (delta: number) => {
    setLengthM((x) => {
      const v = Math.max(0.01, Math.round((x + delta) * 100) / 100);
      return Number(v.toFixed(2));
    });
  };

  function totalsBox() {
    return (
      <div className="totals">
        <div className="row"><span>Subtotal (ex GST)</span><strong>${fmt(subtotal)}</strong></div>
        <div className="row"><span>GST (10%)</span><span>${fmt(gst)}</span></div>
        <div className="row big"><span>Total (inc GST)</span><strong>${fmt(total)}</strong></div>
        {loadingPrices && <div className="hint">Fetching live prices…</div>}
        <style jsx>{`
          .totals{margin-top:14px;border:1px solid #e6e8eb;border-radius:14px;background:#fff;padding:14px}
          .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e6e8eb}
          .row:last-child{border-bottom:0}
          .row.big{font-size:18px}
          .hint{margin-top:8px;color:#6a7077;font-size:13px}
        `}</style>
      </div>
    );
  }

  // build Shopify line items
  function buildShopifyLineItems() {
    const items: any[] = [];
    const props: any = {
      _family: family,
      _gauge: gauge,
      _length_m: lengthM.toFixed(2),
      _pair_mode: pairMode ? 'yes' : 'no',
    };

    if (pairMode) {
      items.push({ sku: baseSku, quantity: lengthCm, properties: { ...props, _core: 'red' } });
      items.push({ sku: baseSku, quantity: lengthCm, properties: { ...props, _core: 'black' } });
    } else {
      items.push({ sku: baseSku, quantity: lengthCm, properties: props });
    }

    if (left.variantId) items.push({ sku: `END-${left.variantId.toUpperCase()}`, quantity: pairMode ? 2 : 1, properties: { position: 'A' } });
    if (right.variantId) items.push({ sku: `END-${right.variantId.toUpperCase()}`, quantity: pairMode ? 2 : 1, properties: { position: 'B' } });

    if (addSleeve) items.push({ sku: sleeveSku, quantity: pairMode ? lengthCm * 2 : lengthCm });
    if (addInsulators) items.push({ sku: insSku, quantity: pairMode ? 4 : 2 });

    return items;
  }

  async function addToCart() {
    // guard missing prices
    const missing: string[] = [];
    if (p(baseSku) == null) missing.push(baseSku);
    if (addSleeve && p(sleeveSku) == null) missing.push(sleeveSku);
    if (addInsulators && p(insSku) == null) missing.push(insSku);
    if (left.variantId && p(`END-${left.variantId.toUpperCase()}`) == null) missing.push(`END-${left.variantId.toUpperCase()}`);
    if (right.variantId && p(`END-${right.variantId.toUpperCase()}`) == null) missing.push(`END-${right.variantId.toUpperCase()}`);

    if (missing.length) { alert(`Missing price for: ${missing.join(', ')}`); return; }

    const items = buildShopifyLineItems();
    const r = await fetch('/api/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const { checkoutUrl, error } = await r.json();
    if (error) { alert(error); return; }
    (window.top ?? window).location.href = checkoutUrl;
  }

  /* ------------------------------------------------------------
     STEP PANELS
  ------------------------------------------------------------ */
  const Step1 = (
    <div className="card">
      <div className="title">Choose your cable</div>
      <div className="gridTiles">
        <TypeTile label="Battery — Single Core" active={family === 'BatterySingle'} onClick={() => { setFamily('BatterySingle'); setPairMode(false); }} />
        <TypeTile label="Welding Cable" active={family === 'Welding'} onClick={() => { setFamily('Welding'); setPairMode(false); }} />
        <TypeTile label="Battery — Twin (pair)" active={family === 'BatteryTwin'} onClick={() => { setFamily('BatteryTwin'); setPairMode(true); }} />
      </div>

      <div className="mt12">
        <label className="lab">Gauge</label>
        <input
          className="input"
          value={gauge}
          onChange={(e) => setGauge(e.target.value as Gauge)}
          placeholder="e.g. 4, 0, 00, 6mm, 95mm2"
        />
      </div>
      <style jsx>{`
        .card{border:1px solid #e6e8eb;border-radius:18px;background:#fff;padding:16px}
        .title{font-weight:700;margin-bottom:10px}
        .gridTiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
        .mt12{margin-top:12px}
        .lab{display:block;margin-bottom:6px;color:#4f5560;font-weight:600}
        .input{width:100%;padding:10px 12px;border:1px solid #e6e8eb;border-radius:12px;background:#fff}
      `}</style>
    </div>
  );

  const Step2 = (
    <div className="card">
      <div className="title">Length</div>
      <div className="row">
        <div className="qtyBox">
          <button className="inc" onClick={() => bump(-0.01)}>-</button>
          <div className="qty">{fmtM(lengthM)}</div>
          <button className="inc" onClick={() => bump(+0.01)}>+</button>
        </div>
        <div className="pill">{pairMode ? 'Pair (red/black)' : 'Single core'}</div>
      </div>

      <div className="hint">Prices update live from Shopify. Base is per cm; totals include {pairMode ? 'both cores' : 'the core'}.</div>

      {totalsBox()}

      <style jsx>{`
        .card{border:1px solid #e6e8eb;border-radius:18px;background:#fff;padding:16px}
        .title{font-weight:700;margin-bottom:10px}
        .row{display:flex;align-items:center;gap:12px;margin:6px 0 8px}
        .qtyBox{display:flex;align-items:center;border:1px solid #e6e8eb;border-radius:12px;background:#fff;overflow:hidden}
        .qty{min-width:120px;text-align:center;font-weight:700;padding:8px 12px}
        .inc{width:40px;height:40px;font-size:18px;border:0;background:#f7f8fa}
        .pill{border:1px solid #e6e8eb;border-radius:12px;background:#f7f8fa;padding:8px 12px}
        .hint{margin-top:6px;color:#6a7077;font-size:13px}
      `}</style>
    </div>
  );

  function EndStep(which: 'left' | 'right') {
    const choice = which === 'left' ? left : right;
    const setChoice = which === 'left' ? setLeft : setRight;
    const activeType: EndType | '' = choice.type;

    return (
      <div className="card">
        <div className="title">{which === 'left' ? 'Left termination' : 'Right termination'}</div>

        <div className="typeRow">
          {availableTypes.map((t) => (
            <EndTypeButton
              key={t}
              label={END_OPTIONS[t].label}
              active={activeType === t}
              onClick={() => {
                const first = compatibleVariants(t)[0];
                setChoice({ type: t, variantId: first?.id ?? '' });
              }}
            />
          ))}
        </div>

        {activeType && (
          <>
            <div className="sub">Variant (compatible with {gauge})</div>
            <div className="chips">
              {compatibleVariants(activeType).map((v) => (
                <Chip
                  key={v.id}
                  label={v.label}
                  active={choice.variantId === v.id}
                  onClick={() => setChoice({ type: activeType, variantId: v.id })}
                />
              ))}
            </div>
          </>
        )}

        {totalsBox()}

        <style jsx>{`
          .card{border:1px solid #e6e8eb;border-radius:18px;background:#fff;padding:16px}
          .title{font-weight:700;margin-bottom:10px}
          .typeRow{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:8px}
          .sub{margin:8px 0 6px;color:#4f5560;font-weight:600}
          .chips{display:flex;gap:8px;flex-wrap:wrap}
        `}</style>
      </div>
    );
  }

  const Step3 = EndStep('left');
  const Step4 = EndStep('right');

  const Step5 = (
    <div className="card">
      <div className="title">Heat-shrink & extras</div>
      <label className="check">
        <input type="checkbox" checked={addInsulators} onChange={(e) => setAddInsulators(e.target.checked)} />
        Lug insulator boots (pair)
      </label>
      <label className="check">
        <input type="checkbox" checked={addSleeve} onChange={(e) => setAddSleeve(e.target.checked)} />
        Braided sleeving (full length)
      </label>

      {totalsBox()}

      <div className="actions">
        <button className="btn" onClick={() => setStep(3)}>Back</button>
        <button className="btnPrimary" onClick={addToCart}>Add to cart</button>
      </div>

      <style jsx>{`
        .card{border:1px solid #e6e8eb;border-radius:18px;background:#fff;padding:16px}
        .title{font-weight:700;margin-bottom:10px}
        .check{display:flex;align-items:center;gap:10px;padding:6px 0}
        .actions{display:flex;gap:10px;margin-top:12px}
        .btn,.btnPrimary{padding:10px 14px;border-radius:12px;border:1px solid #e6e8eb;background:#fff}
        .btnPrimary{background:#111;color:#fff;border-color:#111}
      `}</style>
    </div>
  );

  const panels = [Step1, Step2, Step3, Step4, Step5];

  return (
    <div className="wrap">
      <h1 className="h1">Cable Builder</h1>
      <p className="lede">Design precision power cables — fast, clean, exact.</p>

      <Steps labels={labels} current={step} onGo={setStep} />

      {panels[step]}

      {/* NAV (no summary on step 1; prices from step 2 shown inside each panel) */}
      <div className="nav">
        <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        {step < labels.length - 1 ? (
          <button className="btnPrimary" onClick={() => setStep((s) => Math.min(labels.length - 1, s + 1))}>
            Continue
          </button>
        ) : null}
      </div>

      <style jsx>{`
        :global(:root){--line:#e6e8eb}
        .wrap{max-width:900px;margin:32px auto 80px;padding:0 20px;color:#0a0a0a}
        .h1{font-size:36px;font-weight:700;letter-spacing:-.02em;margin:0 0 4px}
        .lede{color:#5b6168;margin:0 0 12px}
        .nav{display:flex;gap:10px;margin:14px 0}
        .btn,.btnPrimary{padding:10px 14px;border-radius:12px;border:1px solid #e6e8eb;background:#fff}
        .btnPrimary{background:#111;color:#fff;border-color:#111}
      `}</style>
    </div>
  );
}
