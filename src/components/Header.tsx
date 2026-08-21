import { useTheme } from '../hooks/useTheme'

export function Header() {
  const { theme, toggle } = useTheme()

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          PDFly
        </a>
        <div className="header-right">
          <span className="chip">Free · No upload · No account</span>
          <button
            className="btn"
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  )
}
