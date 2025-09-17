'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Stepper from './Stepper'

/* -------------------------------------------------------
   Configuration (data only — no prices here)
------------------------------------------------------- */
type Family = 'BatterySingle' | 'BatteryTwin' | 'Welding'
const GAUGES: Record<Family, string[]> = {
  BatterySingle: ['0000','000','00','0','1','2','3','4','6','8','6mm'],
  BatteryTwin:   ['0000','000','00','0','1','2','3','4','6','8','6mm'],
  Welding:       ['95mm2','70mm2','50mm2','35mm2']
}

type EndType = 'Lug' | 'Anderson' | 'BatteryClamp' | 'Bare'
type EndVariant = { id: string; label: string; compat: readonly string[] }
const END_OPTIONS: Record<EndType, { label: string; variants: EndVariant[] }> = {
  Lug: {
    label: 'Tinned Lug',
    variants: [
      { id: 'lug-6mm-6hole',  label: '6mm² • 6mm hole', compat: ['8','6mm','6'] },
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'] },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'] },
      { id: 'lug-35mm-10hole',label: '35mm² • 10mm hole',compat: ['1','0'] },
      { id: 'lug-50mm-10hole',label: '50mm² • 10mm hole',compat: ['0','00'] },
      { id: 'lug-70mm-10hole',label: '70mm² • 10mm hole',compat: ['00','000'] },
      { id: 'lug-95mm-12hole',label: '95mm² • 12mm hole',compat: ['000','0000'] }
    ]
  },
  Anderson: {
    label: 'Anderson SB',
    variants: [
      { id: 'sb50',  label: 'SB50',  compat: ['8','6','4','3'] },
      { id: 'sb120', label: 'SB120', compat: ['2','1','0'] },
      { id: 'sb175', label: 'SB175', compat: ['0','00','000'] },
      { id: 'sb350', label: 'SB350', compat: ['000','0000'] }
    ]
  },
  BatteryClamp: {
    label: 'Battery Clamp',
    variants: [
      { id: 'post-pos', label: 'Top Post (+)', compat: ['4','3','2','1','0'] },
      { id: 'post-neg', label: 'Top Post (−)', compat: ['4','3','2','1','0'] }
    ]
  },
  Bare: {
    label: 'Bare End',
    variants: [
      { id: 'bare', label: 'Bare (with heat-shrink)', compat: ['6mm','8','6','4','3','2','1','0','00','000','0000'] }
    ]
  }
}

/* -------------------------------------------------------
   Types & helpers
------------------------------------------------------- */
type Gauge = string
type EndChoice = { type: EndType | ''; variantId: string | '' }
type PriceEntry = { price: number | null }

const cents = (n:number)=>Math.round(n*100)
const dollars = (c:number)=> (c/100).toFixed(2)

/* Small, crisp SVG tiles */
const CableSVG = ({variant}:{variant:'single'|'welding'|'twin'}) => {
  if (variant === 'twin') return (
    <svg viewBox="0 0 220 80" width="100%" height="80" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor="#e05858"/><stop offset="1" stopColor="#c63b3b"/></linearGradient>
        <linearGradient id="g2" x1="0" x2="1"><stop offset="0" stopColor="#3b3e41"/><stop offset="1" stopColor="#2a2d30"/></linearGradient>
      </defs>
      <rect x="8" y="18" rx="12" ry="12" width="200" height="20" fill="url(#g1)"/>
      <rect x="8" y="42" rx="12" ry="12" width="200" height="20" fill="url(#g2)"/>
      <circle cx="14" cy="28" r="6.5" fill="#c98a53"/><circle cx="14" cy="52" r="6.5" fill="#c98a53"/>
    </svg>
  )
  const grad = variant==='single' ? ['#3b3e41','#2a2d30'] : ['#e05858','#c63b3b']
  return (
    <svg viewBox="0 0 220 60" width="100%" height="60" aria-hidden>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor={grad[0]}/><stop offset="1" stopColor={grad[1]}/></linearGradient></defs>
      <rect x="8" y="18" rx="14" ry="14" width="200" height="24" fill="url(#g)"/>
      <circle cx="14" cy="30" r="7.5" fill="#c98a53"/>
    </svg>
  )
}

/* Local client cache (5 min) */
const TTL = 5 * 60 * 1000
function getLocalPrice(sku: string): number | null | undefined {
  try {
    const obj = JSON.parse(localStorage.getItem('price:'+sku) || 'null')
    if (!obj) return undefined
    if (obj.exp < Date.now()) { localStorage.removeItem('price:'+sku); return undefined }
    return obj.price as number | null
  } catch { return undefined }
}
function setLocalPrice(sku: string, price: number | null) {
  try { localStorage.setItem('price:'+sku, JSON.stringify({ price, exp: Date.now()+TTL })) } catch {}
}

/* =======================================================
   Component
======================================================= */
export default function Builder(){
  const steps = ['Type','Gauge','Length','Ends','Extras','Review']
  const [step, setStep] = useState(0)

  const [family, setFamily] = useState<Family>('BatterySingle')
  const [gauge, setGauge]   = useState<Gauge>('4')
  const [lengthM, setLengthM] = useState<number>(1.5)
  const [pairMode, setPairMode] = useState<boolean>(false)
  const [endA, setEndA] = useState<EndChoice>({ type:'', variantId:'' })
  const [endB, setEndB] = useState<EndChoice>({ type:'', variantId:'' })
  const [sleeve, setSleeve] = useState<boolean>(false)
  const [insulators, setInsulators] = useState<boolean>(false)
  const [labelA, setLabelA] = useState(''); const [labelB, setLabelB] = useState('')

  const safeLengthM = Number.isFinite(lengthM) && lengthM > 0 ? lengthM : 1.5
  const lengthCm = Math.round(safeLengthM*100)
  const endUnits = (pairMode ? 2 : 1)

  /* --------- Live prices (Shopify only) --------- */
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({})
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  function neededSkus(): string[] {
    const set = new Set<string>()
    set.add(`CABLE-${family}-${gauge}-CM`)
    if (endA.variantId) set.add(`END-${endA.variantId.toUpperCase()}`)
    if (endB.variantId) set.add(`END-${endB.variantId.toUpperCase()}`)
    if (sleeve) set.add(`SLEEVE-${gauge}-CM`)
    if (insulators) set.add('INSULATOR-LUG-BOOT')
    return Array.from(set)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    const all = neededSkus()

    // pull any cached values first for instant UI
    const pre: Record<string, PriceEntry> = {}
    const missing: string[] = []
    for (const sku of all) {
      const p = getLocalPrice(sku)
      if (p !== undefined) pre[sku] = { price: p }
      else missing.push(sku)
    }
    if (Object.keys(pre).length) setPrices(prev => ({ ...pre, ...prev }))
    if (!missing.length) return

    setPriceLoading(true); setPriceError(null)
    fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: missing }),
      signal: ctrl.signal
    })
      .then(r => r.json())
      .then((d) => {
        if (d?.error) { setPriceError('Price service error'); return }
        const map = d?.prices || {}
        for (const [sku, v] of Object.entries(map)) setLocalPrice(sku, (v as any)?.price ?? null)
        setPrices(prev => ({ ...prev, ...map }))
      })
      .catch(e => { if (e.name !== 'AbortError') setPriceError('Could not load prices') })
      .finally(() => setPriceLoading(false))

    return () => ctrl.abort()
  }, [family, gauge, sleeve, insulators, endA.variantId, endB.variantId])

  function requirePrice(sku: string): number | null {
    const p = prices[sku]?.price
    return (p == null || !Number.isFinite(p) || p <= 0) ? null : p
  }

  const endVarA  = endA.type ? END_OPTIONS[endA.type].variants.find(v=>v.id===endA.variantId) : undefined
  const endVarB  = endB.type ? END_OPTIONS[endB.type].variants.find(v=>v.id===endB.variantId) : undefined

  const missing: string[] = []

  const cablePerCm = requirePrice(`CABLE-${family}-${gauge}-CM`)
  if (cablePerCm == null) missing.push(`CABLE-${family}-${gauge}-CM`)
  const baseCableCents = cablePerCm != null ? cents(cablePerCm * lengthCm * (pairMode ? 2 : 1)) : 0

  const endPriceA = endA.variantId ? requirePrice(`END-${endA.variantId.toUpperCase()}`) : 0
  if (endA.variantId && endPriceA == null) missing.push(`END-${endA.variantId.toUpperCase()}`)
  const endPriceB = endB.variantId ? requirePrice(`END-${endB.variantId.toUpperCase()}`) : 0
  if (endB.variantId && endPriceB == null) missing.push(`END-${endB.variantId.toUpperCase()}`)
  const endCents = cents(((endPriceA || 0) + (endPriceB || 0)) * endUnits)

  const sleevePerCm = sleeve ? requirePrice(`SLEEVE-${gauge}-CM`) : 0
  if (sleeve && sleevePerCm == null) missing.push(`SLEEVE-${gauge}-CM`)
  const sleeveCents = cents((sleevePerCm || 0) * lengthCm * (pairMode ? 2 : 1))

  const insBoot = insulators ? requirePrice('INSULATOR-LUG-BOOT') : 0
  if (insulators && insBoot == null) missing.push('INSULATOR-LUG-BOOT')
  const insulatorCents = cents((insBoot || 0) * (pairMode ? 4 : 2))

  const subtotal = baseCableCents + endCents + sleeveCents + insulatorCents
  const gst = Math.round(subtotal * 0.10)
  const total = subtotal + gst

  function incompatible(variantId?: string){
    if(!variantId) return false
    const all: EndVariant[] = Object.values(END_OPTIONS).flatMap(o => o.variants)
    const v = all.find(x => x.id === variantId)
    if(!v) return false
    return !v.compat.includes(gauge)
  }

  function buildShopifyLineItems(){
    const items:any[] = []
    const sku = `CABLE-${family}-${gauge}-CM`
    const props:any = { _family:family, _gauge:gauge, _length_m:safeLengthM.toFixed(2), _pair_mode: pairMode?'yes':'no', _label_a:labelA, _label_b:labelB }
    if(pairMode){
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'red'} })
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'black'} })
    }else{
      items.push({ sku, quantity: lengthCm, properties: props })
    }
    if(endVarA) items.push({ sku: `END-${endA.variantId.toUpperCase()}`, quantity: endUnits, properties:{ position:'A' } })
    if(endVarB) items.push({ sku: `END-${endB.variantId.toUpperCase()}`, quantity: endUnits, properties:{ position:'B' } })
    if(sleeve) items.push({ sku: `SLEEVE-${gauge}-CM`, quantity: pairMode?lengthCm*2:lengthCm })
    if(insulators) items.push({ sku:`INSULATOR-LUG-BOOT`, quantity: pairMode?4:2 })
    return items
  }

  async function addToCart(){
    const items = buildShopifyLineItems()
    const r = await fetch('/api/add-to-cart', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items })
    })
    const { checkoutUrl, error } = await r.json()
    if (error) { alert(error); return }
    const target = (typeof window !== 'undefined' && window.top) ? window.top : window
    target.location.href = checkoutUrl
  }

  /* ---------- UI blocks (V2 style) ---------- */

  const familyTiles = useMemo(() => ([
    { key:'BatterySingle', label:'Battery — Single Core', svg:<CableSVG variant="single" /> },
    { key:'Welding',       label:'Welding Cable',          svg:<CableSVG variant="welding" /> },
    { key:'BatteryTwin',   label:'Battery — Twin',         svg:<CableSVG variant="twin" /> },
  ] as const), [])

  const StepType = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Cable type</div>
        <div className="card-sub">Choose the family that fits your job.</div>
      </header>
      <div className="tiles v2">
        {familyTiles.map(t => (
          <button
            key={t.key}
            type="button"
            className={`tile v2 ${family===t.key ? 'selected':''}`}
            onClick={() => { setFamily(t.key as Family); setPairMode(t.key==='BatteryTwin'); }}
            title={t.label}
          >
            <div className="tile-art">{t.svg}</div>
            <div className="tile-label">{t.label}</div>
          </button>
        ))}
      </div>
    </section>
  )

  const StepGauge = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Gauge</div>
        <div className="card-sub">Pick the conductor size.</div>
      </header>
      <select className="select v2" value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
        {GAUGES[family].map(g=><option key={g} value={g}>{g}</option>)}
      </select>
      <label className="switch v2" style={{marginTop:12}}>
        <input type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)} disabled={family!=='BatteryTwin'} />
        <span>Pair mode (red/black)</span>
      </label>
    </section>
  )

  const StepLength = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Length</div>
        <div className="card-sub">Set an exact length for precision fit.</div>
      </header>
      <div className="row v2">
        <div className="field v2">
          <div className="field-top">
            <label>Metres</label>
            <span className="hint">{lengthCm} cm</span>
          </div>
          <input className="input v2" type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))}/>
        </div>
      </div>
    </section>
  )

  const StepEnds = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Ends</div>
        <div className="card-sub">Choose terminations for each end.</div>
      </header>

      <div className="ends-grid">
        <div className="end-col">
          <div className="end-h">End A</div>
          <select className="select v2" value={endA.type} onChange={e=>setEndA({ type: e.target.value as EndType, variantId: '' })}>
            <option value="">— type —</option>
            {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
          </select>
          {endA.type && (
            <select className="select v2" style={{marginTop:8}} value={endA.variantId} onChange={e=>setEndA(p=>({ ...p, variantId:e.target.value }))}>
              <option value="">— variant —</option>
              {END_OPTIONS[endA.type as EndType].variants.map(v=>(
                <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge)}>
                  {v.label}{!v.compat.includes(gauge) ? ' (incompatible)' : ''}
                </option>
              ))}
            </select>
          )}
          {incompatible(endA.variantId) && <div className="warn">Incompatible with {gauge} B&S</div>}
        </div>

        <div className="end-col">
          <div className="end-h">End B</div>
          <select className="select v2" value={endB.type} onChange={e=>setEndB({ type: e.target.value as EndType, variantId: '' })}>
            <option value="">— type —</option>
            {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
          </select>
          {endB.type && (
            <select className="select v2" style={{marginTop:8}} value={endB.variantId} onChange={e=>setEndB(p=>({ ...p, variantId:e.target.value }))}>
              <option value="">— variant —</option>
              {END_OPTIONS[endB.type as EndType].variants.map(v=>(
                <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge)}>
                  {v.label}{!v.compat.includes(gauge) ? ' (incompatible)' : ''}
                </option>
              ))}
            </select>
          )}
          {incompatible(endB.variantId) && <div className="warn">Incompatible with {gauge} B&S</div>}
        </div>
      </div>
    </section>
  )

  const StepExtras = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Extras</div>
        <div className="card-sub">Add protection and labels.</div>
      </header>
      <label className="switch v2">
        <input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)}/>
        <span>Full-length braided sleeving</span>
      </label>
      <label className="switch v2">
        <input type="checkbox" checked={insulators} onChange={e=>setInsulators(e.target.checked)}/>
        <span>Lug insulators (pair)</span>
      </label>
      <div className="row v2" style={{marginTop:10}}>
        <div className="field v2">
          <div className="field-top"><label>Label A</label></div>
          <input className="input v2" placeholder="e.g. Start Battery" value={labelA} onChange={e=>setLabelA(e.target.value)} />
        </div>
        <div className="field v2">
          <div className="field-top"><label>Label B</label></div>
          <input className="input v2" placeholder="e.g. Inverter +" value={labelB} onChange={e=>setLabelB(e.target.value)} />
        </div>
      </div>
    </section>
  )

  const StepReview = (
    <section className="card v2">
      <header className="card-h">
        <div className="card-t">Review</div>
        <div className="card-sub">Confirm configuration and pricing.</div>
      </header>

      <div className="review-grid">
        <div className="card v2 subtle">
          <div className="kv"><span>Type</span><strong>{family}{pairMode?' (pair)':''}</strong></div>
          <div className="kv"><span>Gauge</span><strong>{gauge} B&S</strong></div>
          <div className="kv"><span>Length</span><strong>{safeLengthM.toFixed(2)} m</strong></div>
          <div className="kv"><span>Ends</span><strong>{endVarA?.label || '—'} / {endVarB?.label || '—'}</strong></div>
          <div className="kv"><span>Sleeving</span><strong>{sleeve ? 'Full' : 'None'}</strong></div>
          <div className="kv"><span>Insulators</span><strong>{insulators ? 'Yes' : 'No'}</strong></div>
        </div>

        <div className="card v2 subtle">
          {priceLoading && <div className="skeleton-row" />}
          {!priceLoading && missing.length > 0 && (
            <div className="warn" style={{marginBottom:8}}>
              Missing price for: {missing.join(', ')}
            </div>
          )}
          {!priceLoading && missing.length === 0 && (
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
  )

  const panels = [StepType, StepGauge, StepLength, StepEnds, StepExtras, StepReview]
  const disableCheckout = priceLoading || missing.length > 0

  return (
    <div className="v2-wrap">
      <header className="v2-hero">
        <div className="hero-title">Cable Builder</div>
        <div className="hero-sub">Design precision power cables — fast, clean, exact.</div>
      </header>

      <Stepper steps={steps} current={step} onGo={setStep} />

      <main className="v2-grid">
        <div className="v2-main">
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

        <aside className="v2-aside">
          <div className="card v2 sticky">
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
    </div>
  )
}
