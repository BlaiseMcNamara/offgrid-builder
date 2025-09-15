export const metadata = { title: 'Offgrid Builder', description: 'Custom cable builder' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>{children}</body>
    </html>
  )
}
