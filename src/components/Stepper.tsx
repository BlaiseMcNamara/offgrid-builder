'use client'

import React from 'react'

export default function Stepper({
  steps,
  current,
  onGo
}: {
  steps: string[]
  current: number
  onGo: (n:number)=>void
}) {
  const pct = (current/(steps.length-1))*100
  return (
    <div className="stepper v2" role="navigation" aria-label="Steps">
      <div className="bar">
        <div className="bar-fill" style={{width:`${pct}%`}} />
      </div>
      <div className="dots">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`dot ${i===current?'active':''} ${i<current?'done':''}`}
            onClick={()=>onGo(i)}
            aria-current={i===current}
            aria-label={`Step ${i+1}: ${s}`}
            title={s}
          />
        ))}
      </div>
    </div>
  )
}
