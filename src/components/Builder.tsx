'use client'
import React, { useState } from 'react'

// --- price book (you can change later) ---
const BASE_PRICE_PER_M: Record<string, Record<string, number>> = {
  BatterySingle: { '0000': 48, '000': 44, '00': 40, '0': 34, '1': 31, '2': 28, '3': 24, '4': 20, '6': 16, '8': 12, '6mm': 4.2 },
  BatteryTwin:   { '0000': 92, '000': 86, '00': 79, '0': 68, '1': 62, '2': 56, '3': 48, '4': 40, '6': 32, '8': 24, '6mm': 8 },
  Welding:       { '0000': 50, '000': 46, '00': 42, '0': 36, '1': 33, '2': 30, '3': 26, '4': 22, '6': 18, '8': 13 }
}
const END_OPTIONS = {
  Lug: { label: 'Tinned Lug', variants: [
    { id: 'lug-6mm-6hole',  label: '6mm² • 6mm hole', compat: ['8','6mm','6'], cost: 2.5, assembly: 4 },
    { id: 'lug-10mm-8hole', label: '10mm² • 8mm hole', compat: ['6','4','3'],   cost: 3,   assembly: 4 },
    { id: 'lug-25mm-8hole', label: '25mm² • 8mm hole', compat: ['3','2','1'],   cost: 3.5, assembly: 5 },
    { id: 'lug-35mm-10hole',label: '35mm² • 10mm hole',compat: ['1','0'],       cost: 4.2, assembly: 5 },
    { id: 'lug-50mm-10hole',label: '50mm² • 10mm hole',compat: ['0','00'],      cost: 5.1, assembly: 5.5 },
    { id: 'lug-70mm-10hole',label: '70mm² • 10mm hole',compat: ['00','000'],    cost: 6.2, assembly: 6 },
    { id: 'lug-95mm-12hole',label: '95mm² • 12mm hole',compat: ['000','0000'],  cost: 7.4, assembly: 6.5 }
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
  Bare: { label: 'Bare End', variants: [ { id: 'bare', label: 'Bare (with heat-shrink)', compat: ['6mm','8','6','4','3','2','1','0','00','000','0000'], cost: 0, assembly: 1.5 } ] }
} as const

type Family = keyof typeof BASE_PRICE_PER_M
type Gauge  = keyof typeof BASE_PRICE_PER_M['BatterySingle']
const cents = (n:number)=>Math.round(n*100)
const dollars = (c:number)=> (c/100).toFixed(2)

export default function Builder(){
  const [family,setFamily]=useState<Family>('BatterySingle')
  const [gauge,setGauge]=useState<Gauge>('4')
  const [lengthM,setLengthM]=useState(1.5)
  const [pair,setPair]=useState(false)
  const [endAType,setEndAType]=useState(''); const [endAVar,setEndAVar]=useState('')
  const [endBType,setEndBType]=useState(''); const [endBVar,setEndBVar]=useState('')
  const [sleeve,setSleeve]=useState(false); const [boots,setBoots]=useState(false)
  const [labelA,setLabelA]=useState('');   const [labelB,setLabelB]=useState('')

  const lengthCm=Math.round(lengthM*100)
  const basePerM = BASE_PRICE_PER_M[family][gauge]
  const baseCents = cents(basePerM*(pair?2:1)*lengthM)
  const allEnds:any[] = Object.values(END_OPTIONS).flatMap((g:any)=>g.variants)
  const vA:any = allEnds.find(v=>v.id===endAVar)
  const vB:any = allEnds.find(v=>v.id===endBVar)
  const endsCents = cents((vA? vA.cost+vA.assembly:0)+(vB? vB.cost+vB.assembly:0))
  const sleeveCents = cents(sleeve ? (pair?2:1)*(0.9*lengthM) : 0)
  const bootsCents = cents(boots?3:0)
  const subtotal = baseCents+endsCents+sleeveCents+bootsCents
  const gst = Math.round(subtotal*0.10)
  const total = subtotal+gst

  function compat(id:string){ const v=allEnds.find(x=>x.id===id); return v? v.compat.includes(gauge as any):true }

  function buildLines(){
    const items:any[]=[]
    const sku=`CABLE-${family}-${gauge}-CM`
    const props:any={_family:family,_gauge:gauge,_length_m:lengthM.toFixed(2),_pair_mode:pair?'yes':'no',_label_a:labelA,_label_b:labelB}
    if(pair){ items.push({sku,quantity:lengthCm,properties:{...props,_core:'red'}}); items.push({sku,quantity:lengthCm,properties:{...props,_core:'black'}})}
    else{ items.push({sku,quantity:lengthCm,properties:props}) }
    if(vA) items.push({sku:`END-${endAVar.toUpperCase()}`,quantity:pair?2:1,properties:{position:'A'}})
    if(vB) items.push({sku:`END-${endBVar.toUpperCase()}`,quantity:pair?2:1,properties:{position:'B'}})
    if(sleeve) items.push({sku:`SLEEVE-${gauge}-CM`,quantity:pair?lengthCm*2:lengthCm})
    if(boots) items.push({sku:`INSULATOR-LUG-BOOT`,quantity:pair?4:2})
    return items
  }

  async function addToCart(){
    const items=buildLines()
    const r=await fetch('/api/add-to-cart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})})
    const {checkoutUrl,error}=await r.json()
    if(error){ alert(error); return }
    window.location.href=checkoutUrl
  }

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:24}}>
      <h1 style={{fontWeight:700,fontSize:24,marginBottom:12}}>Design your cable — The Offgrid Doctor</h1>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <div>
          <div style={{border:'1px solid #ddd',padding:16,borderRadius:8,marginBottom:12}}>
            <label>Family&nbsp;
              <select value={family} onChange={e=>setFamily(e.target.value as Family)}>
                <option value="BatterySingle">Battery — Single Core</option>
                <option value="BatteryTwin">Battery — Twin</option>
                <option value="Welding">Welding</option>
              </select>
            </label>
            <label style={{marginLeft:16}}>
              <input type="checkbox" checked={pair} onChange={e=>setPair(e.target.checked)} disabled={family!=='BatteryTwin'}/> Pair mode
            </label>
          </div>

          <div style={{border:'1px solid #ddd',padding:16,borderRadius:8,marginBottom:12}}>
            <label>Gauge&nbsp;
              <select value={gauge} onChange={e=>setGauge(e.target.value as Gauge)}>
                {Object.keys(BASE_PRICE_PER_M[family]).map(g=>(<option key={g} value={g}>{g}</option>))}
              </select>
            </label>
            <div style={{fontSize:12,opacity:.8,marginTop:4}}>Base: ${basePerM.toFixed(2)}/m (ex GST)</div>
          </div>

          <div style={{border:'1px solid #ddd',padding:16,borderRadius:8,marginBottom:12}}>
            <label>Length (m)&nbsp;
              <input type="number" step="0.01" min={0.05} value={lengthM} onChange={e=>setLengthM(parseFloat(e.target.value||'0'))}/>
            </label>
            <span style={{marginLeft:8,fontSize:12,opacity:.8}}>≈ {lengthCm} cm</span>
          </div>

          <div style={{border:'1px solid #ddd',padding:16,borderRadius:8,marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div><strong>End A</strong></div>
              <select value={endAType} onChange={e=>{setEndAType(e.target.value); setEndAVar('')}}>
                <option value="">— type —</option>
                {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{(v as any).label}</option>))}
              </select>
              {endAType && (
                <select value={endAVar} onChange={e=>setEndAVar(e.target.value)} style={{display:'block',marginTop:6}}>
                  <option value="">— variant —</option>
                  {(END_OPTIONS as any)[endAType].variants.map((v:any)=>(
                    <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>{v.label}{!v.compat.includes(gauge as any)?' (incompatible)':''}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <div><strong>End B</strong></div>
              <select value={endBType} onChange={e=>{setEndBType(e.target.value); setEndBVar('')}}>
                <option value="">— type —</option>
                {Object.entries(END_OPTIONS).map(([k,v])=>(<option key={k} value={k}>{(v as any).label}</option>))}
              </select>
              {endBType && (
                <select value={endBVar} onChange={e=>setEndBVar(e.target.value)} style={{display:'block',marginTop:6}}>
                  <option value="">— variant —</option>
                  {(END_OPTIONS as any)[endBType].variants.map((v:any)=>(
                    <option key={v.id} value={v.id} disabled={!v.compat.includes(gauge as any)}>{v.label}{!v.compat.includes(gauge as any)?' (incompatible)':''}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{border:'1px solid #ddd',padding:16,borderRadius:8,marginBottom:12}}>
            <label><input type="checkbox" checked={sleeve} onChange={e=>setSleeve(e.target.checked)}/> Add braided sleeving</label><br/>
            <label><input type="checkbox" checked={boots} onChange={e=>setBoots(e.target.checked)}/> Add lug insulators (pair)</label><br/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
              <label>Label A <input value={labelA} onChange={e=>setLabelA(e.target.value)} /></label>
              <label>Label B <input value={labelB} onChange={e=>setLabelB(e.target.value)} /></label>
            </div>
          </div>

          <button onClick={addToCart} style={{padding:'10px 16px',border:'1px solid #111',borderRadius:6}}>Add to cart</button>
        </div>

        <aside style={{border:'1px solid #ddd',padding:16,borderRadius:8}}>
          <h3>Totals</h3>
          <div>Subtotal (ex GST): <strong>${dollars(subtotal)}</strong></div>
          <div>GST (10%): ${dollars(gst)}</div>
          <div>Total (inc GST): <strong>${dollars(total)}</strong></div>
        </aside>
      </div>
    </main>
  )
}
