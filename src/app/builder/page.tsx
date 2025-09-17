'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* =======================================================
   INLINE STEPPER (self-contained)
======================================================= */
function Stepper({
  steps,
  current,
  onGo,
}: {
  steps: string[];
  current: number;
  onGo: (i: number) => void;
}) {
  return (
    <ol className="steps" role="tablist" aria-label="Builder steps">
      {steps.map((t, i) => (
        <li key={t}>
          <button
            type="button"
            className={`step ${i === current ? 'cur' : i < current ? 'done' : ''}`}
            onClick={() => onGo(i)}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="idx">{i + 1}</span>
            <span className="lbl">{t}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* =======================================================
   DATA
======================================================= */
type Family = 'BatterySingle' | 'BatteryTwin' | 'Welding';
const GAUGES: Record<Family, string[]> = {
  BatterySingle: ['0000','000','00','0','1','2','3','4','6','8','6mm'],
  BatteryTwin:   ['0000','000','00','0','1','2','3','4','6','8','6mm'],
  Welding:       ['95mm2','70mm2','50mm2','35mm2','0000','000','00','0','1','2','3','4','6','8'],
};

type EndType = 'Lug' | 'Anderson' | 'BatteryClamp' | 'Bare';
type EndVariant = { id: string; label: string; compat: readonly string[] };

const END_OPTIONS: Record<EndType, { label: string; variants: EndVariant[] }> = {
  Lug: {
    label: 'Tinned Lug',
    variants: [
      { id: 'lug-6mm-6hole',  label: '6mm² • 6mm hole',  compat: ['8','6mm','6'] },
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'] },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'] },
      { id: 'lug-35mm-10hole',label: '35mm² • 10mm hole',compat: ['1','0'] },
      { id: 'lug-50mm-10hole',label: '50mm² • 10mm hole',compat: ['0','00'] },
      { id: 'lug-70mm-10hole',label: '70mm² • 10mm hole',compat: ['00','000'] },
      { id: 'lug-95mm-12hole',label: '95mm² • 12mm hole',compat: ['000','0000'] },
    ],
  },
  Anderson: {
    label: 'Anderson SB',
    variants: [
      { id: 'sb50',  label: 'SB50',  compat: ['8','6','4','3'] },
      { id: 'sb120', label: 'SB120', compat: ['2','1','0'] },
      { id: 'sb175', label: 'SB175', compat: ['0','00','000'] },
      { id: 'sb350', label: 'SB350', compat: ['000','0000'] },
    ],
  },
  BatteryClamp: {
    label: 'Battery Clamp',
    variants: [
      { id: 'post-pos', label: 'Top Post (+)', compat: ['4','3','2','1','0'] },
      { id: 'post-neg', label: 'Top Post (−)', compat: ['4','3','2','1','0'] },
    ],
  },
  Bare: {
    label: 'Bare End',
    variants: [
      { id: 'bare', label: 'Bare (with heat-shrink)', compat: ['6mm','8','6','4','3','2','1','0','00','000','0000'] },
    ],
  },
};

/** What end types make sense per family */
const ALLOWED_ENDS: Record<Family, EndType[]> = {
  BatterySingle: ['Lug','Anderson','BatteryClamp','Bare'],
  BatteryTwin:   ['Lug','Anderson','Bare'],
  Welding:       ['Lug','Anderson','Bare'],
};

/* =======================================================
   HELPERS
======================================================= */
type Gauge = string;
type EndChoice = { type: EndType | ''; variantId: string | '' };
type PriceEntry = { price: number | null };

const cents   = (n:number)=>Math.round(n*100);
const dollars = (c:number)=> (c/100).toFixed(2);

const TTL = 5 * 60 * 1000; // 5 mins
function getLocalPrice(sku: string): number | null | undefined {
  try {
    const obj = JSON.parse(localStorage.getItem('price:'+sku) || 'null');
    if (!obj) return undefined;
    if (obj.exp < Date.now()) { localStorage.removeItem('price:'+sku); return undefined; }
    return obj.price as number | null;
  } catch { return undefined; }
}
function setLocalPrice(sku: string, price: number | null) {
  try { localStorage.setItem('price:'+sku, JSON.stringify({ price, exp: Date.now()+TTL })) } catch {}
}
function isCompat(variantId?: string, g?: string){
  if (!variantId || !g) return false;
  const all = Object.values(END_OPTIONS).flatMap(o => o.variants);
  const v = all.find(x => x.id === variantId);
  return !!v && v.compat.includes(g);
}

/* =======================================================
   SVG CABLE PREVIEW
======================================================= */
function LugEnd({side,label}:{side:'left'|'right',label?:string}) {
  const flip = side==='right' ? 1 : -1;
  // simple lug: pad + barrel + heatshrink
  return (
    <g transform={side==='left' ? 'translate(120,0)' : 'translate(1080,0) scale(-1,1)'} aria-label={`Lug ${side}`}>
      <rect x="0" y="34" width="46" height="32" rx="4" fill="#d8dadd" stroke="#c9ccd1"/>
      <circle cx="18" cy="50" r="7" fill="#ffffff" stroke="#c9ccd1"/>
      <rect x="44" y="36" width="24" height="28" rx="6" fill="#c9ccd1"/>
      <rect x="66" y="38" width="30" height="24" rx="6" fill="#aeb3ba"/>
      {label ? <text x="12" y="30" fontSize="10" fill="#7b8088">{label}</text> : null}
    </g>
  );
}
function AndersonEnd({side,size}:{side:'left'|'right',size:'50'|'120'|'175'|'350'}) {
  const color = '#bfc6ce';
  return (
    <g transform={side==='left' ? 'translate(116,0)' : 'translate(1084,0) scale(-1,1)'} aria-label={`Anderson SB${size} ${side}`}>
      <rect x="0" y="30" width="60" height="40" rx="6" fill={color} stroke="#aeb5be"/>
      <rect x="8" y="38" width="18" height="14" rx="2" fill="#88909a"/>
      <rect x="34" y="38" width="18" height="14" rx="2" fill="#88909a"/>
      <text x="30" y="28" fontSize="10" textAnchor="middle" fill="#7b8088">SB{size}</text>
    </g>
  );
}
function ClampEnd({side,pol}:{side:'left'|'right',pol:'+'|'-'}) {
  return (
    <g transform={side==='left' ? 'translate(108,0)' : 'translate(1092,0) scale(-1,1)'} aria-label={`Battery clamp ${pol} ${side}`}>
      <rect x="0" y="32" width="70" height="36" rx="6" fill="#d8dadd" stroke="#c9ccd1"/>
      <circle cx="22" cy="50" r="8" fill="#b8bec6"/>
      <text x="52" y="52" fontSize="14" fill="#8b9097" textAnchor="middle">{pol}</text>
    </g>
  );
}
function BareEnd({side}:{side:'left'|'right'}) {
  return (
    <g transform={side==='left' ? 'translate(140,0)' : 'translate(1060,0) scale(-1,1)'} aria-label={`Bare ${side}`}>
      <rect x="0" y="40" width="28" height="16" rx="8" fill="#aeb3ba"/>
    </g>
  );
}

function CablePreview({
  gauge,
  endLeft,
  endRight,
  pulseSide,
}:{
  gauge: string;
  endLeft: { type?: EndType, variantId?: string };
  endRight: { type?: EndType, variantId?: string };
  pulseSide: 'A'|'B'|null;
}) {
  // map variant -> visual component
  const renderEnd = (side:'left'|'right', variantId?: string, type?: EndType) => {
    if (!variantId || !type) return <BareEnd side={side} />;
    if (type === 'Lug') return <LugEnd side={side} label={gauge} />;
    if (type === 'Anderson') {
      const size = variantId.toUpperCase().includes('350') ? '350'
        : variantId.toUpperCase().includes('175') ? '175'
        : variantId.toUpperCase().includes('120') ? '120' : '50';
      return <AndersonEnd side={side} size={size as any} />;
    }
    if (type === 'BatteryClamp') return <ClampEnd side={side} pol={variantId==='post-pos' ? '+' : '-'} />;
    return <BareEnd side={side} />;
  };

  return (
    <div className="preview">
      <svg viewBox="0 0 1200 120" width="100%" height="120" role="img" aria-label="Cable preview">
        {/* copper */}
        <rect x="156" y="54" width="60" height="12" rx="6" fill="#c77d49"/>
        <rect x="984" y="54" width="60" height="12" rx="6" fill="#c77d49"/>
        {/* jacket */}
        <defs>
          <linearGradient id="cableGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#35383c"/><stop offset="1" stopColor="#26292c"/>
          </linearGradient>
        </defs>
        <rect x="210" y="46" width="780" height="28" rx="14" fill="url(#cableGrad)"/>

        {/* ends */}
        <g className={`end end-left ${pulseSide==='A' ? 'pulse' : ''}`}>{renderEnd('left', endLeft.variantId, endLeft.type)}</g>
        <g className={`end end-right ${pulseSide==='B' ? 'pulse' : ''}`}>{renderEnd('right', endRight.variantId, endRight.type)}</g>
      </svg>
    </div>
  );
}

/* =======================================================
   PAGE
======================================================= */
export default function Page() {
  const UI_VERSION = 'UI v3.0 (light)';

  const steps = ['Type','Gauge','Length','Ends','Extras','Review'];
  const [step, setStep] = useState(0);

  const [family, setFamily]   = useState<Family>('BatterySingle');
  const [gauge, setGauge]     = useState<Gauge>('4');
  const [lengthM, setLengthM] = useState<number>(1.5);
  const [pairMode, setPairMode] = useState<boolean>(false);
  const [endA, setEndA] = useState<EndChoice>({ type:'', variantId:'' });
  const [endB, setEndB] = useState<EndChoice>({ type:'', variantId:'' });
  const [sleeve, setSleeve] = useState<boolean>(false);
  const [insulators, setInsulators] = useState<boolean>(false);
  const [labelA, setLabelA] = useState(''); const [labelB, setLabelB] = useState('');
  const [activeSide, setActiveSide] = useState<'A'|'B'>('A');
  const [pulseSide, setPulseSide] = useState<'A'|'B'|null>(null);

  // prices
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({});
  const [priceLoading, setPriceLoading] = useState(false);

  const safeLengthM = Number.isFinite(lengthM) && lengthM > 0 ? lengthM : 1.5;
  const lengthCm = Math.round(safeLengthM*100);
  const endUnits = (pairMode ? 2 : 1);

  // PRICE FETCH (kept from v2)
  function neededSkus(): string[] {
    const set = new Set<string>();
    set.add(`CABLE-${family}-${gauge}-CM`);
    if (endA.variantId) set.add(`END-${endA.variantId.toUpperCase()}`);
    if (endB.variantId) set.add(`END-${endB.variantId.toUpperCase()}`);
    if (sleeve) set.add(`SLEEVE-${gauge}-CM`);
    if (insulators) set.add('INSULATOR-LUG-BOOT');
    return Array.from(set);
  }
  useEffect(() => {
    const ctrl = new AbortController();
    const all = neededSkus();
    const pre: Record<string, PriceEntry> = {};
    const missing: string[] = [];
    for (const sku of all) {
      const p = getLocalPrice(sku);
      if (p !== undefined) pre[sku] = { price: p };
      else missing.push(sku);
    }
    if (Object.keys(pre).length) setPrices(prev => ({ ...pre, ...prev }));
    if (!missing.length) return;

    setPriceLoading(true);
    fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: missing }),
      signal: ctrl.signal
    })
      .then(r => r.json())
      .then((d: any) => {
        const map = d?.prices || {};
        for (const [sku, v] of Object.entries(map) as [string, any][]) {
          setLocalPrice(sku, v?.price ?? null);
        }
        setPrices(prev => ({ ...prev, ...map }));
      })
      .finally(() => setPriceLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, gauge, sleeve, insulators, endA.variantId, endB.variantId]);

  function requirePrice(sku: string): number | null {
    const p = prices[sku]?.price;
    return (p == null || !Number.isFinite(p) || p <= 0) ? null : p;
  }

  // Auto-clear invalid on family/gauge change
  useEffect(() => {
    if (endA.type && !ALLOWED_ENDS[family].includes(endA.type)) setEndA({ type:'', variantId:'' });
    if (endB.type && !ALLOWED_ENDS[family].includes(endB.type)) setEndB({ type:'', variantId:'' });
    if (endA.variantId && !isCompat(endA.variantId, gauge)) setEndA(p => ({ ...p, variantId:'' }));
    if (endB.variantId && !isCompat(endB.variantId, gauge)) setEndB(p => ({ ...p, variantId:'' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, gauge]);

  // selection pulse confirmation
  function chooseEnd(side:'A'|'B', payload: EndChoice){
    if (side==='A') setEndA(payload); else setEndB(payload);
    setPulseSide(side);
    setTimeout(()=>setPulseSide(null), 350);
  }

  // PRICE MATH
  const missing: string[] = [];

  const cablePerCm = requirePrice(`CABLE-${family}-${gauge}-CM`);
  if (cablePerCm == null) missing.push(`CABLE-${family}-${gauge}-CM`);
  const baseCableCents = cablePerCm != null ? cents(cablePerCm * lengthCm * (pairMode ? 2 : 1)) : 0;

  const endPriceA = endA.variantId ? requirePrice(`END-${endA.variantId.toUpperCase()}`) : 0;
  if (endA.variantId && endPriceA == null) missing.push(`END-${endA.variantId.toUpperCase()}`);
  const endPriceB = endB.variantId ? requirePrice(`END-${endB.variantId.toUpperCase()}`) : 0;
  if (endB.variantId && endPriceB == null) missing.push(`END-${endB.variantId.toUpperCase()}`);
  const endCents = cents(((endPriceA || 0) + (endPriceB || 0)) * endUnits);

  const sleevePerCm = sleeve ? requirePrice(`SLEEVE-${gauge}-CM`) : 0;
  if (sleeve && sleevePerCm == null) missing.push(`SLEEVE-${gauge}-CM`);
  const sleeveCents = cents((sleevePerCm || 0) * lengthCm * (pairMode ? 2 : 1));

  const insBoot = insulators ? requirePrice('INSULATOR-LUG-BOOT') : 0;
  if (insulators && insBoot == null) missing.push('INSULATOR-LUG-BOOT');
  const insulatorCents = cents((insBoot || 0) * (pairMode ? 4 : 2));

  const subtotal = baseCableCents + endCents + sleeveCents + insulatorCents;
  const gst = Math.round(subtotal * 0.10);
  const total = subtotal + gst;

  // CART + CHECKOUT
  function buildShopifyLineItems(){
    const items:any[] = [];
    const sku = `CABLE-${family}-${gauge}-CM`;
    const props:any = { _family:family, _gauge:gauge, _length_m:safeLengthM.toFixed(2), _pair_mode: pairMode?'yes':'no', _label_a:labelA, _label_b:labelB };
    if(pairMode){
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'red'} });
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'black'} });
    }else{
      items.push({ sku, quantity: lengthCm, properties: props });
    }
    const endUnits = (pairMode ? 2 : 1);
    if(endA.variantId) items.push({ sku: `END-${endA.variantId.toUpperCase()}`, quantity: endUnits, properties:{ position:'A' } });
    if(endB.variantId) items.push({ sku: `END-${endB.variantId.toUpperCase()}`, quantity: endUnits, properties:{ position:'B' } });
    if(sleeve) items.push({ sku: `SLEEVE-${gauge}-CM`, quantity: pairMode?lengthCm*2:lengthCm });
    if(insulators) items.push({ sku:`INSULATOR-LUG-BOOT`, quantity: pairMode?4:2 });
    return items;
  }
  async function addToCart(){
    const items = buildShopifyLineItems();
    const r = await fetch('/api/add-to-cart', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items })
    });
    const { checkoutUrl, error } = await r.json();
    if (error) { alert(error); return }
    const target = (typeof window !== 'undefined' && window.top) ? window.top : window;
    target.location.href = checkoutUrl;
  }

  /* ---------- UI blocks ---------- */

  const familyTiles = useMemo(() => ([
    { key:'BatterySingle', label:'Battery — Single Core' },
    { key:'Welding',       label:'Welding Cable' },
    { key:'BatteryTwin',   label:'Battery — Twin' },
  ] as const), []);

  const StepType = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Cable type</div>
        <div className="card-sub">Choose the family that fits your job.</div>
      </header>
      <div className="tiles">
        {familyTiles.map(t => (
          <button
            key={t.key}
            type="button"
            className={`tile ${family===t.key ? 'selected':''}`}
            onClick={() => { setFamily(t.key as Family); setPairMode(t.key==='BatteryTwin'); }}
            title={t.label}
          >
            <div className="tile-label">{t.label}</div>
          </button>
        ))}
      </div>
    </section>
  );

  const StepGauge = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Gauge</div>
        <div className="card-sub">Pick the conductor size.</div>
      </header>
      <select className="select" value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
        {GAUGES[family].map(g=><option key={g} value={g}>{g}</option>)}
      </select>
      <label className="switch" style={{marginTop:12}}>
        <input type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)} disabled={family!=='BatteryTwin'} />
        <span>Pair mode (red/black)</span>
      </label>
    </section>
  );

  const StepLength = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Length</div>
        <div className="card-sub">Set an exact length for precision fit.</div>
      </header>
      <div className="row">
        <div className="field">
          <div className="field-top">
            <label>Metres</label>
            <span className="hint">{lengthCm} cm</span>
          </div>
          <input className="input" type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))}/>
        </div>
      </div>
    </section>
  );

  const StepEnds = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Ends</div>
        <div className="card-sub">Choose terminations with a visual preview.</div>
      </header>

      {/* Live SVG preview */}
      <CablePreview
        gauge={gauge}
        endLeft={{ type:endA.type||undefined, variantId:endA.variantId||undefined }}
        endRight={{ type:endB.type||undefined, variantId:endB.variantId||undefined }}
        pulseSide={pulseSide}
      />

      {/* Left / Right segmented control */}
      <div className="seg">
        <button type="button" className={activeSide==='A' ? 'on' : ''} onClick={()=>setActiveSide('A')}>Left</button>
        <button type="button" className={activeSide==='B' ? 'on' : ''} onClick={()=>setActiveSide('B')}>Right</button>
      </div>
      <div className="seg-hint">Active: <strong>{activeSide==='A' ? 'Left' : 'Right'}</strong></div>

      {/* Allowed end types with only compatible variants */}
      {ALLOWED_ENDS[family]
        .map((t) => {
          const vars = END_OPTIONS[t].variants.filter(v => v.compat.includes(gauge));
          return { type: t, label: END_OPTIONS[t].label, vars };
        })
        .filter(group => group.vars.length > 0)
        .map(group => (
          <div className="end-group" key={group.type}>
            <div className="end-type">{group.label}</div>
            <div className="chips">
              {group.vars.map(v => {
                const sel = (activeSide==='A' && endA.variantId===v.id) || (activeSide==='B' && endB.variantId===v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`chip ${sel?'sel':''}`}
                    onClick={() => chooseEnd(activeSide, { type: group.type as EndType, variantId: v.id })}
                    title={v.label}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      }

      <div className="clear-row">
        <button
          type="button"
          className="chip ghost"
          onClick={() => chooseEnd(activeSide, { type:'', variantId:'' })}
        >
          No termination
        </button>
      </div>
    </section>
  );

  const StepExtras = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Extras</div>
        <div className="card-sub">Add protection and labels.</div>
      </header>
      <label className="switch">
        <input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)}/>
        <span>Full-length braided sleeving</span>
      </label>
      <label className="switch">
        <input type="checkbox" checked={insulators} onChange={e=>setInsulators(e.target.checked)}/>
        <span>Lug insulators (pair)</span>
      </label>
      <div className="row" style={{marginTop:10}}>
        <div className="field">
          <div className="field-top"><label>Label A</label></div>
          <input className="input" placeholder="e.g. Start Battery" value={labelA} onChange={e=>setLabelA(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-top"><label>Label B</label></div>
          <input className="input" placeholder="e.g. Inverter +" value={labelB} onChange={e=>setLabelB(e.target.value)} />
        </div>
      </div>
    </section>
  );

  const StepReview = (
    <section className="card">
      <header className="card-h">
        <div className="card-t">Review</div>
        <div className="card-sub">Confirm configuration and pricing.</div>
      </header>

      <div className="review-grid">
        <div className="card subtle">
          <div className="kv"><span>Type</span><strong>{family}{pairMode?' (pair)':''}</strong></div>
          <div className="kv"><span>Gauge</span><strong>{gauge} B&S</strong></div>
          <div className="kv"><span>Length</span><strong>{safeLengthM.toFixed(2)} m</strong></div>
          <div className="kv"><span>Ends</span><strong>{(endA.variantId && endA.type) ? END_OPTIONS[endA.type].variants.find(v=>v.id===endA.variantId)?.label : '—'} / {(endB.variantId && endB.type) ? END_OPTIONS[endB.type].variants.find(v=>v.id===endB.variantId)?.label : '—'}</strong></div>
          <div className="kv"><span>Sleeving</span><strong>{sleeve ? 'Full' : 'None'}</strong></div>
          <div className="kv"><span>Insulators</span><strong>{insulators ? 'Yes' : 'No'}</strong></div>
        </div>

        <div className="card subtle">
          {priceLoading ? (
            <>
              <div className="skeleton-row" /><div className="skeleton-row" />
              <div className="skeleton-row short" />
            </>
          ) : missing.length ? (
            <div className="warn" style={{marginBottom:8}}>
              Missing price for: {missing.join(', ')}
            </div>
          ) : (
            <>
              <div className="kv"><span>Base cable</span><strong>${dollars(baseCableCents)}</strong></div>
              <div className="kv"><span>Ends</span><strong>${dollars(endCents)}</strong></div>
              <div className="kv"><span>Sleeving</span><strong>${dollars(sleeveCents)}</strong></div>
              <div className="kv"><span>Insulators</span><strong>${dollars(insulatorCents)}</strong></div>
              <div className="rule" />
              <div className="kv big"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
              <div className="kv"><span>GST (10%)</span><strong>${dollars(gst)}</strong></div>
              <div className="kv xl"><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
            </>
          )}
        </div>
      </div>
    </section>
  );

  const panels = [StepType, StepGauge, StepLength, StepEnds, StepExtras, StepReview];
  const disableCheckout = priceLoading || missing.length > 0;

  return (
    <div className="wrap" data-ui-version={UI_VERSION}>
      <header className="hero">
        <div className="hero-title">Cable Builder</div>
        <div className="hero-sub">Design precision power cables — clean, fast, exact.</div>
        <div className="hero-ver">{UI_VERSION}</div>
      </header>

      <Stepper steps={steps} current={step} onGo={setStep} />

      <main className="grid">
        <div className="main">
          {panels[step]}
          <div className="cta-row">
            <button className="btn ghost" onClick={()=>setStep(s=>Math.max(0, s-1))} disabled={step===0}>Back</button>
            {step<steps.length-1
              ? <button className="btn primary" onClick={()=>setStep(s=>Math.min(steps.length-1, s+1))}>Continue</button>
              : <button className="btn primary" onClick={addToCart} disabled={disableCheckout}>
                  {disableCheckout ? 'Prices not ready' : 'Add to cart'}
                </button>}
          </div>
        </div>

        <aside className="aside">
          <div className="card sticky">
            <div className="card-h">
              <div className="card-t">Summary</div>
              <div className="card-sub">{family}{pairMode?' (pair)':''} • {gauge} B&S • {safeLengthM.toFixed(2)} m</div>
            </div>
            {priceLoading ? (
              <>
                <div className="skeleton-row" /><div className="skeleton-row" />
                <div className="skeleton-row short" />
              </>
            ) : missing.length ? (
              <div className="warn">Missing price for: {missing.join(', ')}</div>
            ) : (
              <>
                <div className="kv"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
                <div className="kv"><span>GST (10%)</span><strong>${dollars(gst)}</strong></div>
                <div className="kv xl"><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
              </>
            )}
          </div>
        </aside>
      </main>

      {/* LIGHT THEME (Apple-esque) */}
      <style jsx>{`
        :root{
          --bg:#f6f7f9; --card:#ffffff; --line:#e7e9ee; --muted:#f1f3f6;
          --text:#0b0c0e; --sub:#6b737c; --brand:#0071e3; --brand2:#4aa3ff; --ok:#11884b; --warn:#b2401b;
        }
        .wrap{ color:var(--text); background:var(--bg); min-height:100vh; padding:28px; }
        .hero{ margin:2px 0 18px; }
        .hero-title{ font-size:32px; font-weight:800; letter-spacing:.2px; }
        .hero-sub{ color:var(--sub); margin-top:6px; }
        .hero-ver{ color:var(--sub); font-size:12px; opacity:.7; margin-top:4px; }

        .steps{ display:flex; gap:8px; list-style:none; padding:0; margin:14px 0 22px; }
        .step{ display:flex; align-items:center; gap:8px; background:var(--muted); border:1px solid var(--line);
          padding:8px 12px; border-radius:999px; font-weight:600; color:#394047; }
        .step .idx{ display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px;
          border-radius:999px; background:#e9edf2; }
        .step.done .idx{ background:#d9ecff; }
        .step.cur{ background:#e9f2ff; border-color:#cfe6ff; color:#0b3a64; }
        .step.cur .idx{ background:#cfe6ff; }

        .grid{ display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:22px; }
        @media (max-width: 980px){ .grid{ grid-template-columns:1fr; } .aside{ order:-1; } }

        .card{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; }
        .card.subtle{ background:#fafbfc; }
        .card-h{ margin-bottom:10px; }
        .card-t{ font-weight:800; font-size:18px; }
        .card-sub{ color:var(--sub); font-size:14px; margin-top:2px; }

        .tiles{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-top:6px; }
        .tile{ background:var(--muted); border:1px solid var(--line); border-radius:14px; padding:14px; text-align:center; }
        .tile.selected{ outline:2px solid var(--brand); background:#eef6ff; }

        .select, .input{ width:100%; border:1px solid var(--line); background:#fff; border-radius:12px; padding:10px 12px; font-size:16px; }
        .row{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
        .field-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .hint{ color:var(--sub); font-size:12px; }

        .switch{ display:flex; align-items:center; gap:10px; padding:8px 0; }
        .switch input{ width:18px; height:18px; }

        .seg{ display:inline-flex; border:1px solid var(--line); background:#fff; border-radius:999px; overflow:hidden; margin:6px 0; }
        .seg button{ padding:8px 16px; border:none; background:transparent; font-weight:700; color:#5b636b; }
        .seg button.on{ background:#111; color:#fff; }
        .seg-hint{ color:var(--sub); font-size:12px; margin-top:4px; }

        .chips{ display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 2px; }
        .chip{ border:1px solid var(--line); background:#fff; border-radius:999px; padding:8px 12px; font-weight:600; }
        .chip.sel{ border-color:var(--brand); box-shadow:0 0 0 2px rgba(0,113,227,.12); }
        .chip.ghost{ background:var(--muted); }

        .end-group{ margin-top:10px; }
        .end-type{ color:#2e3338; font-weight:700; font-size:14px; margin:8px 0 4px; }

        .cta-row{ display:flex; gap:10px; margin-top:16px; }
        .btn{ border:1px solid var(--line); border-radius:12px; padding:10px 14px; font-weight:700; background:#fff; }
        .btn.primary{ background:var(--brand); color:#fff; border-color:var(--brand); }
        .btn.primary:disabled{ opacity:.6; }
        .btn.ghost{ background:#fff; }

        .aside .sticky{ position:sticky; top:16px; }
        .kv{ display:flex; align-items:center; justify-content:space-between; padding:8px 0; }
        .kv.big{ font-size:18px; font-weight:800; }
        .kv.xl{ font-size:20px; font-weight:800; }
        .rule{ height:1px; background:var(--line); margin:10px 0; }
        .warn{ color:var(--warn); font-weight:700; }

        .skeleton-row{ height:16px; background:linear-gradient(90deg,#f2f4f7,#e9edf2,#f2f4f7); border-radius:8px; margin:8px 0;
          animation:sh 1.3s linear infinite; } .skeleton-row.short{ width:60%; }
        @keyframes sh{ 0%{background-position:-30% 0} 100%{background-position:130% 0} }

        /* Preview */
        .preview{ background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:8px; }
        .end.pulse{ filter:drop-shadow(0 0 6px rgba(0,113,227,.35)); animation:blink .35s ease; }
        @keyframes blink{ 0%{opacity:.5} 100%{opacity:1} }
      `}</style>
    </div>
  );
}
