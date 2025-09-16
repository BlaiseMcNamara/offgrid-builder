'use client'
import dynamic from 'next/dynamic'

// Use a RELATIVE path to avoid alias issues
const Builder = dynamic(() => import('../../components/Builder'), { ssr: false })

export default function Page() {
  return <Builder />
}
