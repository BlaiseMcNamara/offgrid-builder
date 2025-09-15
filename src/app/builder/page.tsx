'use client'
import dynamic from 'next/dynamic'
const Builder = dynamic(()=>import('@/components/Builder'), { ssr:false })
export default function Page(){ return <Builder /> }
