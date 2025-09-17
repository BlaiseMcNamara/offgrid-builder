'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* ------------------------------------------------------------------
   Mini Stepper (inline so this file is 100% drop-in)
-------------------------------------------------------------------*/
function Stepper({
  steps,
  current,
  onGo,
}: {
  steps: string[];
  current: number;
  onGo: (n: number) => void;
}) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <button
          key={s}
          type="button"
          onClick={() => onGo(i)}
          className={`step ${i === current ? 'active' : ''} ${
            i < current ? 'done' : ''
          }`}
        >
          <span className="stepNum">{i + 1}</span>
          <span>{s}</span>
        </button>
      ))}
      <style jsx>{`
        .stepper {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .step {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--text);
          font-weight: 500;
        }
        .step.active {
          border-color: #111;
          background: #111;
          color: #fff;
        }
        .step.done {
          border-color: #1112;
        }
        .stepNum {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #111;
          color: #fff;
          font-size: 12px;
        }
        .step.active .stepNum {
          background: #fff;
          color: #111;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------
   Pricing + End options
-------------------------------------------------------------------*/
type Family = 'BatterySingle' | 'BatteryTwin' | 'Welding';
type Gauge = string;

type EndVariant = {
  id: string;
  label: string;
  compat: readonly string[]; // supported gauges
};
type EndType = 'Lug' | 'Anderson' | 'BatteryClamp' | 'Bare';
type EndChoice = { type: EndType | ''; variantId: string | '' };

const END_OPTIONS: Record<EndType, { label: string; variants: EndVariant[] }> = {
  Lug: {
    label: 'Tinned Lug',
    variants: [
      { id: 'lug-6mm-6hole', label: '6mm² • 6mm hole', compat: ['8', '6mm', '6'] },
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6', '4', '3'] },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3', '2', '1'] },
      { id: 'lug-35mm-10hole', label: '35mm² • 10mm hole', compat: ['1', '0'] },
      { id: 'lug-50mm-10hole', label: '50mm² • 10mm hole', compat: ['0', '00'] },
      { id: 'lug-70mm-10hole', label: '70mm² • 10mm hole', compat: ['00', '000'] },
      { id: 'lug-95mm-12hole', label: '95mm² • 12mm hole', compat: ['000', '0000'] },
    ],
  },
  Anderson: {
    label: 'Anderson SB',
    variants: [
      { id: 'sb50', label: 'SB50', compat: ['8', '6', '4', '3'] },
      { id: 'sb120', label: 'SB120', compat: ['2', '1', '0'] },
      { id: 'sb175', label: 'SB175', compat: ['0', '00', '000'] },
      { id: 'sb350', label: 'SB350', compat: ['000', '0000'] },
    ],
  },
  BatteryClamp: {
    label: 'Battery Clamp',
    variants: [
      { id: 'post-pos', label: 'Top Post (+)', compat: ['4', '3', '2', '1', '0'] },
      { id: 'post-neg', label: 'Top Post (−)', compat: ['4', '3', '2', '1', '0'] },
    ],
  },
  Bare: {
    label: 'Bare End',
    variants: [{ id: 'bare', label: 'Bare (with heat-shrink)', compat: ['6mm', '8', '6', '4', '3', '2', '1', '0', '00', '000', '0000'] }],
  },
};

// pretty money helpers
const cents = (n: number) => Math.round(n * 100);
const dollars = (c: number) => (c / 100).toFixed(2);

/* ------------------------------------------------------------------
   Simple SVGs for the cable + end preview
-------------------------------------------------------------------*/
function EndIcon({ type }: { type: EndType | '' }) {
  // neutral end icons (just for buttons)
  if (type === 'Bare' || type === '') {
    return (
      <svg width="28" height="28" viewBox="0 0 40 40">
        <rect x="8" y="12" rx="3" ry="3" width="24" height="16" fill="#dcdfe3" />
        <rect x="14" y="12" width="2" height="16" fill="#c8ccd1" />
      </svg>
    );
  }
  // generic lug-ish icon
  return (
    <svg width="28" height="28" viewBox="0 0 40 40">
      <rect x="12" y="13" rx="2" ry="2" width="16" height="14" fill="#dcdfe3" />
      <circle cx="20" cy="16" r="3" fill="#c8ccd1" />
    </svg>
  );
}

function CablePreview({
  left,
  right,
}: {
  left: EndType | '';
  right: EndType | '';
}) {
  return (
    <div className="preview">
      <svg viewBox="0 0 1200 160" width="100%" height="160">
        {/* left end */}
        {left ? (
          <>
            <rect x="70" y="52" width="38" height="56" rx="6" fill="#d9dde2" />
            <circle cx="89" cy="80" r="9" fill="#c9ced4" />
          </>
        ) : (
          <>
            <rect x="70" y="62" width="36" height="36" rx="6" fill="#d9dde2" />
          </>
        )}
        {/* ferrule-ish adapter */}
        <rect x="110" y="60" width="32" height="40" rx="4" fill="#cfd3d8" />

        {/* cable body */}
        <rect x="142" y="60" width="916" height="40" rx="18" fill="url(#g)" />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stopColor="#3c3f43" />
            <stop offset="1" stopColor="#2a2d30" />
          </linearGradient>
        </defs>

        {/* right adapter + end */}
        <rect x="1058" y="60" width="32" height="40" rx="4" fill="#cfd3d8" />
        {right ? (
          <>
            <rect x="1090" y="52" width="38" height="56" rx="6" fill="#d9dde2" />
            <circle cx="1109" cy="80" r="9" fill="#c9ced4" />
          </>
        ) : (
          <>
            <rect x="1092" y="62" width="36" height="36" rx="6" fill="#d9dde2" />
          </>
        )}
      </svg>

      <style jsx>{`
        .preview {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------------------------*/
export default function Builder() {
  const steps = ['Type', 'Gauge', 'Length', 'Ends', 'Extras', 'Review'];
  const [step, setStep] = useState(0);

  const [family, setFamily] = useState<Family>('BatterySingle');
  const [gauge, setGauge] = useState<Gauge>('4');
  const [lengthM, setLengthM] = useState<number>(1.5);
  const [pairMode, setPairMode] = useState<boolean>(false);

  const [endA, setEndA] = useState<EndChoice>({ type: '', variantId: '' });
  const [endB, setEndB] = useState<EndChoice>({ type: '', variantId: '' });
  const [whichEnd, setWhichEnd] = useState<'A' | 'B'>('A');

  const [sleeve, setSleeve] = useState<boolean>(false);
  const [insulators, setInsulators] = useState<boolean>(false);
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');

  const lengthCm = Math.round(lengthM * 100);

  /* --------------------------------------------------------------
     Pricing via Shopify (live)
  -------------------------------------------------------------- */
  const [priceCache, setPriceCache] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Build all SKUs we might need
  const allEndSkus = useMemo(() => {
    const ids = Object.values(END_OPTIONS).flatMap((g) => g.variants.map((v) => v.id));
    return ids.map((id) => `END-${id.toUpperCase()}`);
  }, []);

  const baseSku = `CABLE-${family}-${gauge}-CM`;
  const sleeveSku = `SLEEVE-${gauge}-CM`;
  const insSku = 'INSULATOR-LUG-BOOT';

  async function fetchPrices(skus: string[], { debug = false } = {}) {
    setLoadingPrices(true);
    try {
      const r = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus, debug }),
      });
      const j = (await r.json()) as {
        prices: Record<string, { price: number | null }>;
      };
      const updated: Record<string, number | null> = { ...priceCache };
      for (const [sku, v] of Object.entries(j.prices)) updated[sku] = v?.price ?? null;
      setPriceCache(updated);
    } catch (e) {
      // swallow; UI will show missing price notes
    } finally {
      setLoadingPrices(false);
    }
  }

  // Pull base + sleeve + ALL ends once per (family,gauge) change
  useEffect(() => {
    setEndA((p) => ({ ...p, variantId: '' }));
    setEndB((p) => ({ ...p, variantId: '' }));
    setPairMode(family === 'BatteryTwin');
    const skus = [baseSku, sleeveSku, insSku, ...allEndSkus];
    void fetchPrices(skus);
  }, [family, gauge]); // eslint-disable-line

  // helpers
  const p = (sku: string) => priceCache[sku]; // per unit (cm or each)
  const basePerMCents = (p(baseSku) ?? 0) * 100; // base sku is per cm → per m *100
  const baseCableCents = cents((pairMode ? 2 : 1) * lengthM * (p(baseSku) ?? 0) * 100);
  const sleeveCents =
    sleeve && p(sleeveSku) != null
      ? cents((pairMode ? 2 : 1) * lengthCm * (p(sleeveSku) ?? 0))
      : 0;

  const endVarA =
    endA.type && endA.variantId
      ? END_OPTIONS[endA.type].variants.find((v) => v.id === endA.variantId)
      : undefined;
  const endVarBSrc =
    endB.type && endB.variantId
      ? END_OPTIONS[endB.type].variants.find((v) => v.id === endB.variantId)
      : undefined;

  const endPriceA =
    endVarA ? cents((pairMode ? 2 : 1) * (p(`END-${endVarA.id.toUpperCase()}`) ?? 0)) : 0;
  const endPriceB =
    endVarBSrc ? cents((pairMode ? 2 : 1) * (p(`END-${endVarBSrc.id.toUpperCase()}`) ?? 0)) : 0;
  const insCents = insulators ? cents((pairMode ? 4 : 2) * (p(insSku) ?? 0)) : 0;

  const subtotal = baseCableCents + sleeveCents + endPriceA + endPriceB + insCents;
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  /* --------------------------------------------------------------
     UX helpers
  -------------------------------------------------------------- */
  const filteredEndTypes: EndType[] = useMemo(() => {
    // Only show types that have 1+ compatible variants for current gauge
    const types: EndType[] = [];
    (Object.keys(END_OPTIONS) as EndType[]).forEach((t) => {
      const has = END_OPTIONS[t].variants.some((v) => v.compat.includes(gauge));
      if (has) types.push(t);
    });
    return types;
  }, [gauge]);

  function setEnd(type: EndType, variantId: string) {
    if (whichEnd === 'A') setEndA({ type, variantId });
    else setEndB({ type, variantId });
  }

  const selectedLeftType: EndType | '' = endA.type || '';
  const selectedRightType: EndType | '' = endB.type || '';

  function buildShopifyLineItems() {
    const items: any[] = [];
    const props: any = {
      _family: family,
      _gauge: gauge,
      _length_m: lengthM.toFixed(2),
      _pair_mode: pairMode ? 'yes' : 'no',
      _label_a: labelA,
      _label_b: labelB,
    };

    if (pairMode) {
      items.push({ sku: baseSku, quantity: lengthCm, properties: { ...props, _core: 'red' } });
      items.push({ sku: baseSku, quantity: lengthCm, properties: { ...props, _core: 'black' } });
    } else {
      items.push({ sku: baseSku, quantity: lengthCm, properties: props });
    }

    if (endVarA)
      items.push({
        sku: `END-${endVarA.id.toUpperCase()}`,
        quantity: pairMode ? 2 : 1,
        properties: { position: 'A' },
      });
    if (endVarBSrc)
      items.push({
        sku: `END-${endVarBSrc.id.toUpperCase()}`,
        quantity: pairMode ? 2 : 1,
        properties: { position: 'B' },
      });

    if (sleeve)
      items.push({ sku: sleeveSku, quantity: pairMode ? lengthCm * 2 : lengthCm, properties: {} });

    if (insulators)
      items.push({ sku: insSku, quantity: pairMode ? 4 : 2, properties: {} });

    return items;
  }

  async function addToCart() {
    const missing: string[] = [];
    if (p(baseSku) == null) missing.push(baseSku);
    if (sleeve && p(sleeveSku) == null) missing.push(sleeveSku);
    if (insulators && p(insSku) == null) missing.push(insSku);
    if (endVarA && p(`END-${endVarA.id.toUpperCase()}`) == null)
      missing.push(`END-${endVarA.id.toUpperCase()}`);
    if (endVarBSrc && p(`END-${endVarBSrc.id.toUpperCase()}`) == null)
      missing.push(`END-${endVarBSrc.id.toUpperCase()}`);

    if (missing.length) {
      alert(`Missing price for: ${missing.join(', ')}`);
      return;
    }

    const items = buildShopifyLineItems();
    const r = await fetch('/api/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const { checkoutUrl, error } = await r.json();
    if (error) {
      alert(error);
      return;
    }
    const target = typeof window !== 'undefined' && window.top ? window.top : window;
    target.location.href = checkoutUrl;
  }

  /* --------------------------------------------------------------
     Panels
  -------------------------------------------------------------- */
  const StepType = (
    <div className="card">
      <div className="section-title">Choose cable type</div>
      <div className="tileGrid">
        {[
          { key: 'BatterySingle', label: 'Battery — Single Core' },
          { key: 'Welding', label: 'Welding Cable' },
          { key: 'BatteryTwin', label: 'Battery — Twin (pair)' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tile ${family === (t.key as Family) ? 'selected' : ''}`}
            onClick={() => {
              setFamily(t.key as Family);
              setPairMode(t.key === 'BatteryTwin');
            }}
          >
            <span className="tileLabel">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const StepGauge = (
    <div className="card">
      <div className="section-title">Gauge</div>
      <input
        className="input"
        value={gauge}
        onChange={(e) => setGauge(e.target.value as Gauge)}
        placeholder="e.g. 4, 0, 00, 6mm, 95mm2"
      />
      <div className="hint">Prices are fetched live from Shopify for the selected gauge.</div>
      <div className="lede" style={{ marginTop: 12 }}>
        {loadingPrices ? 'Loading prices…' : `Base (per m): $${dollars(basePerMCents)}`}
      </div>
    </div>
  );

  const StepLength = (
    <div className="card">
      <div className="section-title">Length</div>
      <div className="row">
        <input
          type="number"
          step="0.01"
          min={0.05}
          className="input"
          value={lengthM}
          onChange={(e) => setLengthM(parseFloat(e.target.value || '0'))}
        />
        <div className="pillMuted">≈ {lengthCm} cm</div>
      </div>
      <label className={`switch ${family === 'BatteryTwin' ? 'disabled' : ''}`}>
        <input
          type="checkbox"
          checked={pairMode}
          onChange={(e) => setPairMode(e.target.checked)}
          disabled={family !== 'BatteryTwin'}
        />
        <span>Pair mode (red/black)</span>
      </label>
    </div>
  );

  const StepEnds = (
    <div className="card">
      <div className="section-title">Ends</div>

      <CablePreview left={selectedLeftType} right={selectedRightType} />

      <div className="seg">
        <button
          type="button"
          className={`segBtn ${whichEnd === 'A' ? 'active' : ''}`}
          onClick={() => setWhichEnd('A')}
        >
          Left
        </button>
        <button
          type="button"
          className={`segBtn ${whichEnd === 'B' ? 'active' : ''}`}
          onClick={() => setWhichEnd('B')}
        >
          Right
        </button>
      </div>

      <div className="lede" style={{ marginBottom: 4 }}>
        Choose end type
      </div>
      <div className="endTypeRow">
        {filteredEndTypes.map((t) => {
          const active =
            (whichEnd === 'A' ? endA.type : endB.type) === t ? 'active' : '';
          return (
            <button
              key={t}
              type="button"
              className={`endType ${active}`}
              onClick={() => {
                // select first compatible variant by default
                const first = END_OPTIONS[t].variants.find((v) => v.compat.includes(gauge));
                setEnd(t, first?.id ?? '');
              }}
              title={END_OPTIONS[t].label}
            >
              <EndIcon type={t} />
              <div>{END_OPTIONS[t].label}</div>
            </button>
          );
        })}
      </div>

      {/* Variant chips (only compatible) */}
      {(whichEnd === 'A' ? endA.type : endB.type) && (
        <>
          <div className="lede" style={{ marginTop: 8 }}>
            Variant (compatible with {gauge} B&S)
          </div>
          <div className="chipRow">
            {END_OPTIONS[(whichEnd === 'A' ? endA.type : endB.type) as EndType].variants
              .filter((v) => v.compat.includes(gauge))
              .map((v) => {
                const selected =
                  (whichEnd === 'A' ? endA.variantId : endB.variantId) === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`chip ${selected ? 'selected' : ''}`}
                    onClick={() => setEnd((whichEnd === 'A' ? endA.type : endB.type) as EndType, v.id)}
                  >
                    {v.label}
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );

  const StepExtras = (
    <div className="card">
      <div className="section-title">Extras</div>
      <label className="check">
        <input type="checkbox" checked={sleeve} onChange={(e) => setSleeve(e.target.checked)} />
        Add braided sleeving (full length)
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={insulators}
          onChange={(e) => setInsulators(e.target.checked)}
        />
        Add lug insulators (pair)
      </label>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input" placeholder="Label A" value={labelA} onChange={(e) => setLabelA(e.target.value)} />
        <input className="input" placeholder="Label B" value={labelB} onChange={(e) => setLabelB(e.target.value)} />
      </div>
    </div>
  );

  const StepReview = (
    <div className="card">
      <div className="section-title">Review</div>
      <div className="rowCards">
        <div className="subcard">
          <div className="miniTitle">Configuration</div>
          <div className="kv"><span>Type</span><strong>{family}{pairMode ? ' (pair)' : ''}</strong></div>
          <div className="kv"><span>Gauge</span><strong>{gauge} B&S</strong></div>
          <div className="kv"><span>Length</span><strong>{lengthM.toFixed(2)} m</strong></div>
          <div className="kv"><span>Ends</span><strong>{endVarA?.label || '—'} / {endVarBSrc?.label || '—'}</strong></div>
          <div className="kv"><span>Sleeving</span><strong>{sleeve ? 'Full' : 'None'}</strong></div>
          <div className="kv"><span>Insulators</span><strong>{insulators ? 'Yes' : 'No'}</strong></div>
        </div>
        <div className="subcard">
          <div className="miniTitle">Price</div>
          <div className="kv"><span>Base cable</span><b>${dollars(baseCableCents)}</b></div>
          <div className="kv"><span>Ends</span><b>${dollars(endPriceA + endPriceB)}</b></div>
          <div className="kv"><span>Sleeving</span><b>${dollars(sleeveCents)}</b></div>
          <div className="kv"><span>Insulators</span><b>${dollars(insCents)}</b></div>
          <div className="rule" />
          <div className="kv"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
          <div className="kv"><span>GST (10%)</span><b>${dollars(gst)}</b></div>
          <div className="kv big"><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
        </div>
      </div>
    </div>
  );

  const panels = [StepType, StepGauge, StepLength, StepEnds, StepExtras, StepReview];

  /* --------------------------------------------------------------
     Render
  -------------------------------------------------------------- */
  return (
    <div className="wrap">
      <h1 className="h1">Cable Designer</h1>
      <p className="ledeTop">Design precision power cables — clean, fast, exact.</p>

      <Stepper steps={steps} current={step} onGo={setStep} />

      <div className="grid">
        <div>
          {panels[step]}
          <div className="actions">
            <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="btnPrimary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
                Continue
              </button>
            ) : (
              <button className="btnPrimary" onClick={addToCart}>
                Add to cart
              </button>
            )}
          </div>
        </div>

        <aside className="summary card">
          <div className="miniTitle">Summary</div>
          <div className="lede">{family}{pairMode ? ' • pair' : ''} • {gauge} B&S • {lengthM.toFixed(2)} m</div>
          <div className="kv"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
          <div className="kv"><span>GST (10%)</span><b>${dollars(gst)}</b></div>
          <div className="kv big"><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
          {loadingPrices && <div className="hint" style={{ marginTop: 8 }}>Fetching live prices…</div>}
        </aside>
      </div>

      {/* light theme styles */}
      <style jsx>{`
        :global(:root) {
          --bg: #ffffff;
          --text: #0a0a0a;
          --line: #e6e8eb;
          --muted: #f7f8fa;
          --primary: #111111;
        }
        .wrap {
          max-width: 1100px;
          margin: 32px auto 80px;
          padding: 0 20px;
          color: var(--text);
        }
        .h1 {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .ledeTop {
          color: #5b6168;
          margin: 0 0 18px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 16px;
        }
        .subcard {
          background: var(--muted);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 14px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 160px;
          gap: 10px;
          align-items: center;
        }
        .rowCards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .row {
            grid-template-columns: 1fr;
          }
          .rowCards {
            grid-template-columns: 1fr;
          }
        }
        .summary {
          position: sticky;
          top: 16px;
        }
        .section-title {
          font-weight: 600;
          margin-bottom: 10px;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #fff;
          font-size: 16px;
        }
        .pillMuted {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          height: 40px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--muted);
        }
        .tileGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .tile {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px;
          background: #fff;
          text-align: left;
        }
        .tile.selected {
          border-color: #111;
          box-shadow: 0 0 0 2px #111 inset;
        }
        .tileLabel {
          font-weight: 600;
        }
        .seg {
          display: inline-flex;
          border: 1px solid var(--line);
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0 10px;
        }
        .segBtn {
          padding: 8px 14px;
          background: #fff;
          color: #111;
        }
        .segBtn.active {
          background: #111;
          color: #fff;
        }
        .endTypeRow {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .endType {
          display: flex;
          gap: 10px;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 10px 12px;
          background: #fff;
        }
        .endType.active {
          border-color: #111;
        }
        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chip {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 12px;
          background: #fff;
        }
        .chip.selected {
          border-color: #111;
          background: #111;
          color: #fff;
        }
        .check {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
        }
        .switch {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 10px;
          opacity: 1;
        }
        .switch.disabled {
          opacity: 0.55;
          pointer-events: none;
        }
        .miniTitle {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .kv {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed var(--line);
        }
        .kv.big {
          font-size: 18px;
        }
        .rule {
          height: 1px;
          background: var(--line);
          margin: 8px 0;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .btn,
        .btnPrimary {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #fff;
        }
        .btnPrimary {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .hint {
          color: #6a7077;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
