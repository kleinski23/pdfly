import { Component, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches render crashes so the app shows a recovery state instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="workspace-empty">
          <h2>Well, that went sideways</h2>
          <p className="tool-hint">{this.state.error.message}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            <Icon name="rotate" size={16} strokeWidth={2.1} /> Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
