'use client'
import React, { useState } from 'react'

const BASE_PRICE_PER_M: Record<string, Record<string, number>> = {
  BatterySingle: { '0000': 48, '000': 44, '00': 40, '0': 34, '1': 31, '2': 28, '3': 24, '4': 20, '6': 16, '8': 12, '6mm': 4.2 },
  BatteryTwin: { '0000': 92, '000': 86, '00': 79, '0': 68, '1': 62, '2': 56, '3': 48, '4': 40, '6': 32, '8': 24, '6mm': 8 },
  Welding: { '0000': 50, '000': 46, '00': 42, '0': 36, '1': 33, '2': 30, '3': 26, '4': 22, '6': 18, '8': 13 }
}

const END_OPTIONS = {
  Lug: {
    label: 'Tinned Lug',
    variants: [
      { id: 'lug-6mm-6hole', label: '6mm² • 6mm hole', compat: ['8','6mm','6'], cost: 2.5, assembly: 4 },
      { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'], cost: 3, assembly: 4 },
      { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'], cost: 3.5, assembly: 5 },
      { id: 'lug-35mm-10hole', label: '35mm² • 10mm hole', compat: ['1','0'], cost: 4.2, assembly: 5 },
      { id: 'lug-50mm-10hole', label: '50mm² • 10mm hole', compat: ['0','00'], cost: 5.1, assembly: 5.5 },
      { id: 'lug-70mm-10hole', label: '70mm² • 10mm hole', compat: ['00','000'], cost: 6.2, assembly: 6 },
      { id: 'lug-95mm-12hole', label: '95mm² • 12mm hole', compat: ['000','0000'], cost: 7.4, assembly: 6.5 }
    ]
  },
  Anderson: {
    label: 'Anderson SB',
    variants: [
      { id: 'sb50', label: 'SB50', compat: ['8','6','4','3'], cost: 9.9, assembly: 6 },
      { id: 'sb120', label: 'SB120', compat: ['2','1','0'], cost: 15.5, assembly: 6.5 },
      { id: 'sb175', label: 'SB175', compat: ['0','00','000'], cost: 19.9, assembly: 7 },
      { id: 'sb350', label: 'SB350', compat: ['000','0000'], cost: 29.9, assembly: 8 }
    ]
  },
  BatteryClamp: {
    label: 'Battery Clamp',
    variants: [
      { id: 'post-pos', label: 'Top Post (+)', compat: ['4','3','2','1','0'], cost: 7.2, assembly: 5 },
      { id: 'post-neg', label: 'Top Post (−)', compat: ['4','3','2','1','0'], cost: 7.2, assembly: 5 }
    ]
  },
  Bare: { label: 'Bare End', variants: [ { id: 'bare', label: 'Bare (with heat‑shrink)', compat: ['6mm','8','6','4','3','2','1','0','00','000','0000'], cost: 0, assembly: 1.5 } ] }
} as const

type Family = keyof typeof BASE_PRICE_PER_M
type Gauge = keyof typeof BASE_PRICE_PER_M['BatterySingle']

function cents(n:number){ return Math.round(n*100) }
function dollars(c:number){ return (c/100).toFixed(2) }

export default function Builder(){
  const [family, setFamily] = useState<Family>('BatterySingle')
  const [gauge, setGauge] = useState<Gauge>('4')
  const [lengthM, setLengthM] = useState<number>(1.5)
  const [pairMode, setPairMode] = useState<boolean>(false)
  const [endAType, setEndAType] = useState(''); const [endAVar, setEndAVar] = useState('')
  const [endBType, setEndBType] = useState(''); const [endBVar, setEndBVar] = useState('')
  const [sleeve, setSleeve] = useState(false); const [insulators, setInsulators] = useState(false)
  const [labelA, setLabelA] = useState(''); const [labelB, setLabelB] = useState('')

  const lengthCm = Math.round(lengthM*100)
  const basePricePerM = BASE_PRICE_PER_M[family][gauge]
  const baseCableCents = cents(basePricePerM*(pairMode?2:1)*lengthM)
  const allEndVariants:any[] = Object.values(END_OPTIONS).flatMap((o:any)=>o.variants)
  const endVarA:any = allEndVariants.find(v=>v.id===endAVar)
  const endVarB:any = allEndVariants.find(v=>v.id===endBVar)
  const endCostCents = cents((endVarA?endVarA.cost+endVarA.assembly:0) + (endVarB?endVarB.cost+endVarB.assembly:0))
  const sleeveCents = cents(sleeve ? (pairMode?2:1) * (0.9*lengthM) : 0)
  const insulatorCents = cents(insulators?3.0:0)
  const subtotal = baseCableCents + endCostCents + sleeveCents + insulatorCents
  const gst = Math.round(subtotal*0.10)
  const total = subtotal + gst

  function isCompat(variantId:string){
    const v:any = allEndVariants.find(x=>x.id===variantId); if(!v) return true
    return v.compat.includes(gauge as any)
  }

  function buildShopifyLineItems(){
    const items:any[] = []
    const baseSku = `CABLE-${family}-${gauge}-CM`
    const props:any = { _family:family, _gauge:gauge, _length_m:lengthM.toFixed(2), _pair_mode: pairMode?'yes':'no', _label_a:labelA, _label_b:labelB }
    if(pairMode){ items.push({ sku: baseSku, quantity: lengthCm, properties:{...props,_core:'red'} }); items.push({ sku: baseSku, quantity: lengthCm, properties:{...props,_core:'black'} }) }
    else{ items.push({ sku: baseSku, quantity: lengthCm, properties: props }) }
    if(endVarA) items.push({ sku: `END-${endAVar.toUpperCase()}`, quantity: pairMode?2:1, properties:{ position:'A' } })
    if(endVarB) items.push({ sku: `END-${endBVar.toUpperCase()}`, quantity: pairMode?2:1, properties:{ position:'B' } })
    if(sleeve) items.push({ sku: `SLEEVE-${gauge}-CM`, quantity: pairMode?lengthCm*2:lengthCm })
    if(insulators) items.push({ sku:'INSULATOR-LUG-BOOT', quantity: pairMode?4:2 })
    return items
  }

  async function addToCart(){
    const items = buildShopifyLineItems()
    const r = await fetch('/api/add-to-cart', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items }) })
    const { checkoutUrl, error } = await r.json()
    if(error){ alert(error); return }
    window.location.href = checkoutUrl
  }

  return (
    <main style={{maxWidth:1100, margin:'0 auto', padding:24}}>
      <h1 style={{fontWeight:700, fontSize:24, marginBottom:12}}>Design your cable — The Offgrid Doctor</h1>
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16}}>
        <div>
          <div style={{border:'1px solid #ddd', padding:16, borderRadius:8, marginBottom:12}}>
            <label>Family&nbsp;
              <select value={family} onChange={e=>setFamily(e.target.value as Family)}>
                <option value="BatterySingle">Battery — Single Core</option>
                <option value="BatteryTwin">Battery — Twin</option>
                <option value="Welding">Welding</option>
              </select>
            </label>
            <label style={{marginLeft:16}}>
              <input type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)} disabled={family!=='BatteryTwin'} />
              &nbsp;Pair mode (red/black)
            </label>
          </div>
          <div style={{border:'1px solid #ddd', padding:16, borderRadius:8, marginBottom:12}}>
            <label>Gauge&nbsp;
              <select value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
                {Object.keys(BASE_PRICE_PER_M[family]).map(g=>(<option key={g} value={g}>{g}</option>))}
              </select>
            </label>
            <div style={{fontSize:12,opacity:.8, marginTop:4}}>Base: ${BASE_PRICE_PER_M[family][gauge].toFixed(2)}/m (ex GST)</div>
          </div>
          <div style={{border:'1px solid #ddd', padding:16, borderRadius:8, marginBottom:12}}>
            <label>Length (m)&nbsp;
              <input type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))} />
              <span style={{marginLeft:8, fontSize:12, opacity:.8}}>≈ {lengthCm} cm</span>
            </label>
          </div>
          <div style={{border:'1px solid #ddd', padding:16, borderRadius:8, marginBottom:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <div><strong>End A</strong></div>
              <select value={endAType} onChange={e=>{setEndAType(e.target.value); setEndAVar('')}}>
                <option value="">— type —</option>
                {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{(v as any).label}</option>))}
              </select>
              {endAType && (
                <select value={endAVar} onChange={e=>setEndAVar(e.target.value)} style={{display:'block', marginTop:6}}>
                  <option value="">— variant —</option>
                  {(END_OPTIONS as any)[endAType].variants.map((v:any)=>(
                    <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>
                      {v.label}{!v.compat.includes(gauge as any) ? ' (incompatible)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {endAVar && !isCompat(endAVar) && <div style={{color:'#c00', fontSize:12}}>Incompatible with {gauge} B&S</div>}
            </div>
            <div>
              <div><strong>End B</strong></div>
              <select value={endBType} onChange={e=>{setEndBType(e.target.value); setEndBVar('')}}>
                <option value="">— type —</option>
                {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{(v as any).label}</option>))}
              </select>
              {endBType && (
                <select value={endBVar} onChange={e=>setEndBVar(e.target.value)} style={{display:'block', marginTop:6}}>
                  <option value="">— variant —</option>
                  {(END_OPTIONS as any)[endBType].variants.map((v:any)=>(
                    <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>
                      {v.label}{!v.compat.includes(gauge as any) ? ' (incompatible)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {endBVar && !isCompat(endBVar) && <div style={{color:'#c00', fontSize:12}}>Incompatible with {gauge} B&S</div>}
            </div>
          </div>
          <div style={{border:'1px solid #ddd', padding:16, borderRadius:8, marginBottom:12}}>
            <label><input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)} /> Add braided sleeving (full length)</label><br/>
            <label><input type="checkbox" checked={insulators} onChange={e=>setInsulators(e.target.checked)} /> Add lug insulators (pair)</label><br/>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
              <label>Label A <input value={labelA} onChange={e=>setLabelA(e.target.value)} /></label>
              <label>Label B <input value={labelB} onChange={e=>setLabelB(e.target.value)} /></label>
            </div>
          </div>
          <button onClick={addToCart} style={{padding:'10px 16px', border:'1px solid #111', borderRadius:6}}>Add to cart</button>
        </div>
        <aside style={{border:'1px solid #ddd', padding:16, borderRadius:8}}>
          <h3>Summary</h3>
          <div style={{fontSize:14, lineHeight:1.7}}>
            <div>Family: <strong>{family}</strong></div>
            <div>Gauge: <strong>{gauge} B&S</strong></div>
            <div>Length: <strong>{lengthM.toFixed(2)} m</strong> ({lengthCm} cm)</div>
            <div>Sleeving: <strong>{sleeve?'Full':'None'}</strong></div>
            <div>Insulators: <strong>{insulators?'Yes':'No'}</strong></div>
          </div>
          <hr style={{margin:'12px 0'}}/>
          <h3>Totals</h3>
          <div style={{fontSize:14, lineHeight:1.7}}>
            <div>Subtotal (ex GST): <strong>${dollars(baseCableCents+endCostCents+sleeveCents+insulatorCents)}</strong></div>
            <div>GST (10%): ${dollars(gst)}</div>
            <div>Total (inc GST): <strong>${dollars(total)}</strong></div>
          </div>
        </aside>
      </div>
    </main>
  )
}
