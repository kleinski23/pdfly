import { useTheme } from '../hooks/useTheme'
import { Icon } from './Icon'

export function Header({ onHome }: { onHome?: () => void }) {
  const { theme, toggle } = useTheme()

  return (
    <header className="header">
      <div className="header-inner">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            // Navigate in-app: a real reload would just restore the saved session
            // and drop you straight back into the workspace. Let modified clicks
            // (new tab/window) fall through to the browser.
            if (!onHome || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
            e.preventDefault()
            onHome()
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <Icon name="pen" size={21} strokeWidth={2.1} />
          </span>
          PDFly
        </a>
        <div className="header-right">
          <span className="chip">
            <Icon name="cloudOff" size={14} strokeWidth={2.2} />
            Free · No upload · No account
          </span>
          <button
            className="btn"
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}
