'use client'
import React, { useMemo, useState } from 'react'

/* ------- data (same pricing as before, tweak anytime) ------- */
const BASE_PRICE_PER_M: Record<string, Record<string, number>> = {
  BatterySingle: { '0000': 48, '000': 44, '00': 40, '0': 34, '1': 31, '2': 28, '3': 24, '4': 20, '6': 16, '8': 12, '6mm': 4.2 },
  BatteryTwin:   { '0000': 92, '000': 86, '00': 79, '0': 68, '1': 62, '2': 56, '3': 48, '4': 40, '6': 32, '8': 24, '6mm': 8 },
  Welding:       { '0000': 50, '000': 46, '00': 42, '0': 36, '1': 33, '2': 30, '3': 26, '4': 22, '6': 18, '8': 13 }
}

const END_OPTIONS = {
  Lug: { label: 'Tinned Lug', variants: [
    { id: 'lug-6mm-6hole',  label: '6mm² • 6mm hole', compat: ['8','6mm','6'], cost: 2.5, assembly: 4 },
    { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'], cost: 3,   assembly: 4 },
    { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'], cost: 3.5, assembly: 5 },
    { id: 'lug-35mm-10hole',label: '35mm² • 10mm hole', compat: ['1','0'],   cost: 4.2, assembly: 5 },
    { id: 'lug-50mm-10hole',label: '50mm² • 10mm hole', compat: ['0','00'],  cost: 5.1, assembly: 5.5 },
    { id: 'lug-70mm-10hole',label: '70mm² • 10mm hole', compat: ['00','000'],cost: 6.2, assembly: 6 },
    { id: 'lug-95mm-12hole',label: '95mm² • 12mm hole', compat: ['000','0000'], cost: 7.4, assembly: 6.5 }
  ]},
  Anderson: { label: 'Anderson SB', variants: [
    { id: 'sb50',  label: 'SB50',  compat: ['8','6','4','3'], cost: 9.9, assembly: 6 },
    { id: 'sb120', label: 'SB120', compat: ['2','1','0'],     cost: 15.5, assembly: 6.5 },
    { id: 'sb175', label: 'SB175', compat: ['0','00','000'],  cost: 19.9, assembly: 7 },
    { id: 'sb350', label: 'SB350', compat: ['000','0000'],    cost: 29.9, assembly: 8 }
  ]},
  BatteryClamp: { label: 'Battery Clamp', variants: [
    { id: 'post-pos', label: 'Top Post (+)', compat: ['4','3','2','1','0'], cost: 7.2, assembly: 5 },
    { id: 'post-neg', label: 'Top Post (−)', compat: ['4','3','2','1','0'], cost: 7.2, assembly: 5 }
  ]},
  Bare: { label: 'Bare End', variants: [
    { id: 'bare', label: 'Bare (with heat-shrink)', compat: ['6mm','8','6','4','3','2','1','0','00','000','0000'], cost: 0, assembly: 1.5 }
  ] }
} as const

type Family = keyof typeof BASE_PRICE_PER_M
type Gauge  = keyof typeof BASE_PRICE_PER_M['BatterySingle']
type EndChoice = { type: keyof typeof END_OPTIONS | ''; variantId: string | '' }

const cents   = (n:number)=>Math.round(n*100)
const dollars = (c:number)=> (c/100).toFixed(2)

/* ------- small SVG “cable” illustrations ------- */
const CableSVG = ({variant}:{variant:'single'|'welding'|'twin'}) => {
  if (variant === 'twin') {
    return (
      <svg viewBox="0 0 220 80" width="100%" height="80">
        <defs>
          <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor="#d64545"/><stop offset="1" stopColor="#b92f2f"/></linearGradient>
          <linearGradient id="g2" x1="0" x2="1"><stop offset="0" stopColor="#3c3f43"/><stop offset="1" stopColor="#2a2d30"/></linearGradient>
        </defs>
        <rect x="8" y="18" rx="12" ry="12" width="200" height="20" fill="url(#g1)"/>
        <rect x="8" y="42" rx="12" ry="12" width="200" height="20" fill="url(#g2)"/>
        <circle cx="14" cy="28" r="7" fill="#cc7a38"/><circle cx="14" cy="52" r="7" fill="#cc7a38"/>
      </svg>
    )
  }
  const grad = variant==='single' ? ['#3c3f43','#2a2d30'] : ['#d64545','#b92f2f']
  return (
    <svg viewBox="0 0 220 60" width="100%" height="60">
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor={grad[0]}/><stop offset="1" stopColor={grad[1]}/></linearGradient></defs>
      <rect x="8" y="18" rx="14" ry="14" width="200" height="24" fill="url(#g)"/>
      <circle cx="14" cy="30" r="8" fill="#cc7a38"/>
    </svg>
  )
}

/* -------------------- UI -------------------- */
export default function Builder(){
  const [family, setFamily] = useState<Family>('BatterySingle')
  const [gauge, setGauge]   = useState<Gauge>('4')
  const [lengthM, setLengthM] = useState<number>(1.5)
  const [pairMode, setPairMode] = useState<boolean>(false)
  const [endA, setEndA] = useState<EndChoice>({ type:'', variantId:'' })
  const [endB, setEndB] = useState<EndChoice>({ type:'', variantId:'' })
  const [sleeve, setSleeve] = useState<boolean>(false)
  const [insulators, setInsulators] = useState<boolean>(false)
  const [labelA, setLabelA] = useState(''); const [labelB, setLabelB] = useState('')

  const lengthCm = Math.round(lengthM*100)
  const basePerM = BASE_PRICE_PER_M[family][gauge]
  const endVarA  = endA.type ? END_OPTIONS[endA.type].variants.find(v=>v.id===endA.variantId) : undefined
  const endVarB  = endB.type ? END_OPTIONS[endB.type].variants.find(v=>v.id===endB.variantId) : undefined
  const baseCableCents = cents(basePerM * (pairMode?2:1) * lengthM)
  const endCostCents   = cents((endVarA?endVarA.cost+endVarA.assembly:0) + (endVarB?endVarB.cost+endVarB.assembly:0))
  const sleeveCents    = cents(sleeve ? (pairMode?2:1) * (0.9*lengthM) : 0)
  const insulatorCents = cents(insulators?3.0:0)
  const subtotal = baseCableCents + endCostCents + sleeveCents + insulatorCents
  const gst = Math.round(subtotal * 0.10)
  const total = subtotal + gst

  const familyTiles = useMemo(() => ([
    { key:'BatterySingle', label:'Battery — Single Core', svg:<CableSVG variant="single" /> },
    { key:'Welding',       label:'Welding Cable',          svg:<CableSVG variant="welding" /> },
    { key:'BatteryTwin',   label:'Battery — Twin',        svg:<CableSVG variant="twin" /> },
  ] as const), [])

  function incompatible(variantId?: string){
    if(!variantId) return false
    const all = Object.values(END_OPTIONS).flatMap(o=>o.variants)
    const v = all.find(x=>x.id===variantId); if(!v) return false
    return !v.compat.includes(gauge as any)
  }

  function buildShopifyLineItems(){
    const items:any[] = []
    const sku = `CABLE-${family}-${gauge}-CM`
    const props:any = { _family:family, _gauge:gauge, _length_m:lengthM.toFixed(2), _pair_mode: pairMode?'yes':'no', _label_a:labelA, _label_b:labelB }
    if(pairMode){
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'red'} })
      items.push({ sku, quantity: lengthCm, properties:{...props, _core:'black'} })
    }else{
      items.push({ sku, quantity: lengthCm, properties: props })
    }
    if(endVarA) items.push({ sku: `END-${endA.variantId.toUpperCase()}`, quantity: pairMode?2:1, properties:{ position:'A' } })
    if(endVarB) items.push({ sku: `END-${endB.variantId.toUpperCase()}`, quantity: pairMode?2:1, properties:{ position:'B' } })
    if(sleeve) items.push({ sku: `SLEEVE-${gauge}-CM`, quantity: pairMode?lengthCm*2:lengthCm })
    if(insulators) items.push({ sku:`INSULATOR-LUG-BOOT`, quantity: pairMode?4:2 })
    return items
  }

  async function addToCart(){
    const items = buildShopifyLineItems()
    const r = await fetch('/api/add-to-cart', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items })
    })
    const { checkoutUrl, error } = await r.json()
    if (error) { alert(error); return }
    window.location.href = checkoutUrl
  }

  return (
    <div className="container">
      <div className="h1">Cable Designer</div>
      <div className="grid">
        {/* LEFT: form */}
        <div>
          {/* Family tiles */}
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
            <div className="hr"/>
            <div className="check">
              <input id="pair" type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)} disabled={family!=='BatteryTwin'} />
              <label htmlFor="pair">Pair mode (red/black)</label>
            </div>
            <div className="badge">Prices shown ex-GST</div>
          </div>

          {/* Gauge */}
          <div className="card">
            <div className="section-title">Gauge</div>
            <select value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
              {Object.keys(BASE_PRICE_PER_M[family]).map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <div className="subtle" style={{marginTop:6}}>Base: ${basePerM.toFixed(2)}/m (ex GST)</div>
          </div>

          {/* Length */}
          <div className="card">
            <div className="section-title">Length</div>
            <div className="row">
              <input className="input" type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))} />
              <div className="input" style={{display:'flex',alignItems:'center',justifyContent:'center',background:'var(--muted)'}}>
                ≈ {lengthCm} cm
              </div>
            </div>
          </div>

          {/* Ends */}
          <div className="card">
            <div className="section-title">Ends</div>
            <div className="row">
              <div>
                <div className="subtle" style={{marginBottom:4}}>End A</div>
                <select value={endA.type} onChange={e=>setEndA({ type: e.target.value as any, variantId: '' })}>
                  <option value="">— type —</option>
                  {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
                </select>
                {endA.type && (
                  <select style={{marginTop:8}} value={endA.variantId} onChange={e=>setEndA(p=>({ ...p, variantId:e.target.value }))}>
                    <option value="">— variant —</option>
                    {END_OPTIONS[endA.type as keyof typeof END_OPTIONS].variants.map(v=>(
                      <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>
                        {v.label}{!v.compat.includes(gauge as any) ? ' (incompatible)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {incompatible(endA.variantId) && <div className="subtle" style={{color:'#c33',marginTop:6}}>Incompatible with {gauge} B&S</div>}
              </div>
              <div>
                <div className="subtle" style={{marginBottom:4}}>End B</div>
                <select value={endB.type} onChange={e=>setEndB({ type: e.target.value as any, variantId: '' })}>
                  <option value="">— type —</option>
                  {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
                </select>
                {endB.type && (
                  <select style={{marginTop:8}} value={endB.variantId} onChange={e=>setEndB(p=>({ ...p, variantId:e.target.value }))}>
                    <option value="">— variant —</option>
                    {END_OPTIONS[endB.type as keyof typeof END_OPTIONS].variants.map(v=>(
                      <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>
                        {v.label}{!v.compat.includes(gauge as any) ? ' (incompatible)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {incompatible(endB.variantId) && <div className="subtle" style={{color:'#c33',marginTop:6}}>Incompatible with {gauge} B&S</div>}
              </div>
            </div>
          </div>

          {/* Protection & labels */}
          <div className="card">
            <div className="section-title">Extras</div>
            <label className="check">
              <input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)} />
              Add braided sleeving (full length)
            </label>
            <label className="check">
              <input type="checkbox" checked={insulators} onChange={e=>setInsulators(e.target.checked)} />
              Add lug insulators (pair)
            </label>
            <div className="row" style={{marginTop:8}}>
              <input className="input" placeholder="Label A" value={labelA} onChange={e=>setLabelA(e.target.value)} />
              <input className="input" placeholder="Label B" value={labelB} onChange={e=>setLabelB(e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={addToCart}>Add to cart</button>
        </div>

        {/* RIGHT: sticky summary */}
        <aside className="card sticky">
          <div className="section-title">Totals</div>
          <div className="price-row"><span>Base cable</span><span>${dollars(baseCableCents)}</span></div>
          <div className="price-row"><span>Ends & assembly</span><span>${dollars(endCostCents)}</span></div>
          <div className="price-row"><span>Sleeving</span><span>${dollars(sleeveCents)}</span></div>
          <div className="price-row"><span>Insulators</span><span>${dollars(insulatorCents)}</span></div>
          <div className="hr"></div>
          <div className="price-row"><span>Subtotal (ex GST)</span><strong>${dollars(subtotal)}</strong></div>
          <div className="price-row"><span>GST (10%)</span><span>${dollars(gst)}</span></div>
          <div className="price-row" style={{fontSize:20}}><span>Total (inc GST)</span><strong>${dollars(total)}</strong></div>

          <div className="hr"></div>
          <div className="subtle">
            <div>Type: <strong>{family}</strong>{pairMode?' (pair)':''}</div>
            <div>Gauge: <strong>{gauge} B&S</strong></div>
            <div>Length: <strong>{lengthM.toFixed(2)} m</strong> ({lengthCm} cm)</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
