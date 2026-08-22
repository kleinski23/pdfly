import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Home } from './pages/Home'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useDocument } from './hooks/useDocument'

// The workspace (PDF.js engine + tools) is code-split so the landing page stays fast.
const Workspace = lazy(() => import('./components/workspace/Workspace'))

export default function App() {
  const doc = useDocument()
  const [view, setView] = useState<'landing' | 'workspace'>('landing')
  const { tryRestoreSession } = doc
  const restoredRef = useRef(false)

  // Restore the previous session (PRD PLT-010). Depend on the stable callback, not
  // the whole `doc` object — that is a fresh literal every render, so `[doc]` would
  // re-restore (and re-key every file) on each commit, in an endless loop.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    void tryRestoreSession().then((restored) => {
      if (restored) setView('workspace')
    })
  }, [tryRestoreSession])

  const handleFiles = (files: File[]) => {
    void doc.loadFiles(files)
    setView('workspace')
  }

  return (
    <div className="app">
      <Header onHome={() => setView('landing')} />
      <ErrorBoundary>
        <main className={view === 'workspace' ? 'main main--wide' : 'main'}>
          {view === 'landing' ? (
            <Home onFiles={handleFiles} />
          ) : (
            <Suspense fallback={<div className="loading">Inking the workspace…</div>}>
              <Workspace doc={doc} onHome={() => setView('landing')} />
            </Suspense>
          )}
        </main>
      </ErrorBoundary>
      {view === 'landing' && (
        <footer className="footer">
          PDFly © 2026 · Free forever · Drawn by hand, run on your machine
        </footer>
      )}
    </div>
  )
}
