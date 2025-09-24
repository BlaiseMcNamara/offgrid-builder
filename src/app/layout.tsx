// src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cable Builder — The Offgrid Doctor',
  description: 'Design precision power cables — clean, fast and exact.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* GLOBAL LIGHT THEME LOCK */}
        <style jsx global>{`
          :root {
            --bg: #ffffff;
            --text: #0a0a0a;
            --muted: #f7f8fa;
            --line: #e6e8eb;
            --primary: #111111;
            --card: #ffffff;
          }
          html, body {
            background: var(--bg) !important;
            color: var(--text);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          * { color-scheme: light; } /* prevents Safari/Chrome dark auto */
        `}</style>
      </body>
    </html>
  )
}
