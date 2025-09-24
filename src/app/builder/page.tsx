'use client'
import Builder from '@/components/Builder' // keep your existing Builder component

export default function Page() {
  return (
    <main className="og-root">
      <div className="og-card">
        <Builder />
      </div>

      <style jsx>{`
        .og-root {
          min-height: 100vh;
          background: #fff; /* make the whole iframe page white */
          padding: 24px;
          display: flex;
          justify-content: center;
        }
        .og-card {
          width: 100%;
          max-width: 980px;
          background: #fff;
          border: 1px solid #e6e8eb;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 1px 0 rgba(16,24,40,.02);
        }
      `}</style>

      {/* HARD OVERRIDE in case any old dark styles linger */}
      <style jsx global>{`
        html, body, main, .og-root, .og-card {
          background: #fff !important;
          color: #0a0a0a !important;
        }
        /* If your Builder used variables like --bg previously, reset them */
        :root {
          --bg: #ffffff !important;
          --card: #ffffff !important;
          --muted: #f7f8fa !important;
          --line: #e6e8eb !important;
          --text: #0a0a0a !important;
        }
      `}</style>
    </main>
  )
}
