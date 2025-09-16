'use client'
type Props = { steps: string[]; current: number; onGo?: (i:number)=>void }
export default function Stepper({ steps, current, onGo }: Props){
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={s} className={`step ${i<current?'done': i===current?'active':''}`}>
          <button
            type="button"
            className="dot"
            aria-label={`Step ${i+1}: ${s}`}
            onClick={() => onGo?.(i)}
          >{i+1}</button>
          <div className="step-label" style={{opacity:i<=current?1:.5}}>{s}</div>
          {i<steps.length-1 && <div className={`bar ${i<current?'filled':''}`} />}
        </div>
      ))}
    </div>
  )
}
