'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Stepper from './Stepper'

/* --------------------------------------------------------
   We don't store any prices here. All prices come from
   Shopify via /api/prices using the SKUs we generate.
   The only static data below is:
   - gauge lists (for the dropdown)
   - end option catalog (labels + gauge compatibility)
------------------------------------------------------- */

// Gauges you want to offer for each family
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
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3']  },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1']  },
      { id: 'lug-35mm-10hole',label: '35mm² • 10mm hole',compat: ['1','0']      },
      { id: 'lug-50mm-10hole',label: '50mm² • 10mm hole',compat: ['0','00']     },
      { id: 'lug-70mm-10hole',label: '70mm² • 10mm hole',compat: ['00','000']   },
      { id: 'lug-95mm-12hole',label: '95mm² • 12mm hole',compat: ['000','0000'] }
    ]
  },
  Anderson: {
    label: 'Anderson SB',
    variants: [
      { id: 'sb50',  label: 'SB50',  compat: ['8','6','4','3'] },
      { id: 'sb120', label: 'SB120', compat: ['2','1','0']     },
      { id: 'sb175', label: 'SB175', compat: ['0','00','000']  },
      { id: 'sb350', label: 'SB350', compat: ['000','0000']    }
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

type Gauge = string
type EndChoice = { type: EndType | ''; variantId: string | '' }
type PriceEntry = { price: number | null } // from /api/prices

const cents = (n:number)=>Math.round(n*100)
const dollars = (c:number)=> (c/100).toFixed(2)

/* Tiny SVG tiles */
const CableSVG = ({variant}:{variant:'single'|'welding'|'twin'}) => {
  if (variant === 'twin') return (
    <svg viewBox="0 0 220 80" width="100%" height="80" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor="#d64545"/><stop offset="1" stopColor="#b92f2f"/></linearGradient>
        <linearGradient id="g2" x1="0" x2="1"><stop offset="0" stopColor="#3c3f43"/><stop offset="1" stopColor="#2a2d30"/></linearGradient>
      </defs>
      <rect x="8" y="18" rx="12" ry="12" width="200" height="20" fill="url(#g1)"/>
      <rect x="8" y="42" rx="12" ry="12" width="200" height="20" fill="url(#g2)"/>
      <circle cx="14" cy="28" r="7" fill="#cc7a38"/><circle cx="14" cy="52" r="7" fill="#cc7a38"/>
    </svg>
  )
  const grad = variant==='single' ? ['#3c3f43','#2a2d30'] : ['#d64545','#b92f2f']
  return (
    <svg viewBox="0 0 220 60" width="100%" height="60" aria-hidden>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor={grad[0]}/><stop offset="1" stopColor={grad[1]}/></linearGradient></defs>
      <rect x="8" y="18" rx="14" ry="14" width="200" height="24" fill="url(#g)"/>
      <circle cx="14" cy="30" r="8" fill="#cc7a38"/>
    </svg>
  )
}

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

  // safe length
  const safeLengthM = Number.isFinite(lengthM) && lengthM > 0 ? lengthM : 1.5
  const lengthCm = Math.round(safeLengthM*100)

  /* --------- Load current prices from Shopify (no fallbacks) --------- */
  const [prices, setPrices] = useState<Record<string, PriceEntry>>({})
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  // Build the set of SKUs we need for the current config
  function neededSkus(): string[] {
    const set = new Set<string>()
    set.add(`CABLE-${family}-${gauge}-CM`)
    if (sleeve) set.add(`SLEEVE-${gauge}-CM`)
    if (insulators) set.add('INSULATOR-LUG-BOOT')
    if (endA.variantId) set.add(`END-${endA.variantId.toUpperCase()}`)
    if (endB.variantId) set.add(`END-${endB.variantId.toUpperCase()}`)
    // Preload all end SKUs so switching is instant (optional)
    Object.values(END_OPTIONS).forEach(g => g.variants.forEach(v => set.add(`END-${v.id.toUpperCase()}`)))
    // Always preload sleeve + insulator SKUs for the selected gauge
    set.add(`SLEEVE-${gauge}-CM`)
    set.add('INSULATOR-LUG-BOOT')
    return Array.from(set)
  }

  useEffect(() => {
    setPriceLoading(true)
    setPriceError(null)
    fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: neededSkus() })
    })
    .then(r => r.json())
    .then((d) => {
      if (d?.error) { setPriceError('Price service error'); setPrices({}); return }
      setPrices(d?.prices || {})
    })
    .catch(() => setPriceError('Could not load prices'))
    .finally(() => setPriceLoading(false))
  }, [family, gauge, sleeve, insulators, endA.variantId, endB.variantId])

  // Helper: require a valid price; if missing, we’ll mark the config invalid
  function requirePrice(sku: string): number | null {
    const p = prices[sku]?.price
    return (p == null || !Number.isFinite(p) || p <= 0) ? null : p
  }

  /* ---------- Current selection ---------- */
  const endVarA  = endA.type ? END_OPTIONS[endA.type].variants.find(v=>v.id===endA.variantId) : undefined
  const endVarB  = endB.type ? END_OPTIONS[endB.type].variants.find(v=>v.id===endB.variantId) : undefined
  const endUnits = (pairMode ? 2 : 1)

  /* ---------- Compute price strictly from Shopify ---------- */
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

  /* ---------- UI helpers ---------- */
  const familyTiles = useMemo(() => ([
    { key:'BatterySingle', label:'Battery — Single Core', svg:<CableSVG variant="single" /> },
    { key:'Welding',       label:'Welding Cable',          svg:<CableSVG variant="welding" /> },
    { key:'BatteryTwin',   label:'Battery — Twin',         svg:<CableSVG variant="twin" /> },
  ] as const), [])

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
    // Break out of Shopify iframe
    const target = (typeof window !== 'undefined' && window.top) ? window.top : window
    target.location.href = checkoutUrl
  }

  /* -------------------- Step Panels -------------------- */
  const StepType = (
    <div className="card">
      <div className="section-title">Choose cable type</div>
      <div className="tiles" style={{marginTop:8}}>
        {familyTiles.map(t => (
          <button
            key={t.key}
            type="button"
            className={`tile ${family===t.key ? 'selected':''}`}
            onClick={() => { setFamily(t.key as Family); setPairMode(t.key==='BatteryTwin'); }}
            title={t.label}
          >
            {t.svg}
            <div className="tile-label">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  )

  const StepGauge = (
    <div className="card">
      <div className="section-title">Gauge</div>
      <select value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
        {GAUGES[family].map(g=><option key={g} value={g}>{g}</option>)}
      </select>
      <div className="lede" style={{fontSize:14,marginTop:6}}>
        Prices are fetched live from Shopify for the selected gauge.
      </div>
    </div>
  )

  const StepLength = (
    <div className="card">
      <div className="section-title">Length</div>
      <div className="row">
        <input type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--line)',borderRadius:12,background:'var(--muted)'}}>≈ {lengthCm} cm</div>
      </div>
      <label className="check" style={{marginTop:10}}>
        <input type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)} disabled={family!=='BatteryTwin'} />
        Pair mode (red/black)
      </label>
    </div>
  )

  const StepEnds = (
    <div className="card">
      <div className="section-title">Ends</div>
      <div className="row">
        <div>
          <div className="lede" style={{fontSize:13,marginBottom:4}}>End A</div>
          <select value={endA.type} onChange={e=>setEndA({ type: e.target.value as EndType, variantId: '' })}>
            <option value="">— type —</option>
            {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
          </select>
          {endA.type && (
            <select style={{marginTop:8}} value={endA.variantId} onChange={e=>setEndA(p=>({ ...p, variantId:e.target.value }))}>
              <option value="">— variant —</option>
              {END_OPTIONS[endA.type as EndType].variants.map(v=>(
                <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge)}>
                  {v.label}{!v.compat.includes(gauge) ? ' (incompatible)' : ''}
                </option>
              ))}
            </select>
          )}
          {incompatible(endA.variantId) && <div style={{color:'#c33',marginTop:6}}>Incompatible with {gauge} B&S</div>}
        </div>

        <div>
          <div className="lede" style={{fontSize:13,marginBottom:4}}>End B</div>
          <select value={endB.type} onChange={e=>setEndB({ type: e.target.value as EndType, variantId: '' })}>
            <option value="">— type —</option>
            {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
          </select>
          {endB.type && (
            <select style={{marginTop:8}} value={endB.variantId} onChange={e=>setEndB(p=>({ ...p, variantId:e.target.value }))}>
              <option value="">— variant —</option>
              {END_OPTIONS[endB.type as EndType].variants.map(v=>(
                <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge)}>
                  {v.label}{!v.compat.includes(gauge) ? ' (incompatible)' : ''}
                </option>
              ))}
            </select>
          )}
          {incompatible(endB.variantId) && <div style={{color:'#c33',marginTop:6}}>Incompatible with {gauge} B&S</div>}
        </div>
      </div>
    </div>
  )

  const StepExtras = (
    <div className="card">
      <div className="section-title">Extras</div>
      <label className="check">
        <input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)}/>
        Add braided sleeving (full length)
      </label>
      <label className="check">
        <input type="checkbox" checked={insulators} onChange={e=>setInsulators(e.target.checked)}/>
        Add lug insulators (pair)
      </label>
      <div className="row" style={{marginTop:8}}>
        <input placeholder="Label A" value={labelA} onChange={e=>setLabelA(e.target.value)} />
        <input placeholder="Label B" value={labelB} onChange={e=>setLabelB(e.target.value)} />
      </div>
    </div>
  )

  const StepReview = (
    <div className="card">
      <div className="section-title">Review</div>
      <div className="row">
        <div className="card" style={{border:'1px dashed var(--line)'}}>
          <div className="section-title">Configuration</div>
          <div className="lede" style={{fontSize:14}}>
            <div>Type: <strong>{family}</strong>{pairMode?' (pair)':''}</div>
            <div>Gauge: <strong>{gauge} B&S</strong></div>
            <div>Length: <strong>{safeLengthM.toFixed(2)} m</strong> ({lengthCm} cm)</div>
            <div>Ends: <strong>{endVarA?.label || '—'}</strong> / <strong>{endVarB?.label || '—'}</strong></div>
            <div>Sleeving: <strong>{sleeve ? 'Full' : 'None'}</strong></div>
            <div>Insulators: <strong>{insulators ? 'Yes' : 'No'}</strong></div>
          </div>
        </div>
        <div className="card" style={{border:'1px dashed var(--line)'}}>
          <div className="section-title">Price</div>
          {priceLoading && <div className="lede">Loading live prices…</div>}
          {!priceLoading && missing.length > 0 && (
            <div className="lede" style={{color:'#b42318'}}>
              Missing price for: {missing.join(', ')}<br/>
              Check SKUs and variant prices in Shopify.
            </div>
          )}
          {!priceLoading && missing.length === 0 && (
            <>
              <div className="price-row"><span>Base cable</span><span>${dollars(baseCableCents)}</span></div>
              <div className="price-row"><span>Ends</span><span>${dollars(endCents)}</span></div>
              <div className="price-row"><span>Sleeving</span><span>${dollars(sleeveCents)}</span></div>
              <div className="price-row"><span>Insulators</span><span>${dollars(insulatorCents)}</span></div>
              <div className="hr" />
              <div className="price-row"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
              <div className="price-row"><span>GST (10%)</span><span>${dollars(gst)}</span></div>
              <div className="price-row" style={{fontSize:20}}><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const panels = [StepType, StepGauge, StepLength, StepEnds, StepExtras, StepReview]

  const disableCheckout = priceLoading || missing.length > 0

  return (
    <div className="container">
      <h1 className="h1">Cable Designer</h1>
      <p className="lede">Build the exact cable you need. Clean, fast and precise.</p>

      <Stepper steps={steps} current={step} onGo={setStep} />

      <div className="grid">
        <div>
          {panels[step]}
          <div style={{display:'flex', gap:10, marginTop:16}}>
            <button className="btn" onClick={()=>setStep(s=>Math.max(0, s-1))} disabled={step===0}>Back</button>
            {step<steps.length-1
              ? <button className="btn btn-primary" onClick={()=>setStep(s=>Math.min(steps.length-1, s+1))}>Continue</button>
              : <button className="btn btn-primary" onClick={addToCart} disabled={disableCheckout}>
                  {disableCheckout ? 'Prices not ready' : 'Add to cart'}
                </button>}
          </div>
        </div>

        <aside className="card sticky">
          <div className="section-title">Totals</div>
          {priceLoading && <div className="lede">Loading live prices…</div>}
          {!priceLoading && missing.length > 0 && <div className="lede" style={{color:'#b42318'}}>Missing price for: {missing.join(', ')}</div>}
          {!priceLoading && missing.length === 0 && (
            <>
              <div className="price-row"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
              <div className="price-row"><span>GST (10%)</span><span>${dollars(gst)}</span></div>
              <div className="price-row" style={{fontSize:20}}><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>
            </>
          )}
          <div className="hr" />
          <div className="lede" style={{fontSize:14}}>
            {family}{pairMode?' (pair)':''} • {gauge} B&S • {safeLengthM.toFixed(2)} m
          </div>
        </aside>
      </div>
    </div>
  )
}
