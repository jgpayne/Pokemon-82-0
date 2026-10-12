import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset: () => void
}

/** Shows render errors on the page instead of a frozen or blank screen. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Poké 82-0 crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-loss">Something went wrong</h1>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-surface p-4 text-left text-sm whitespace-pre-wrap text-muted ring-1 ring-line">{error.message}</pre>
        <button
          onClick={() => {
            this.setState({ error: null })
            this.props.onReset()
          }}
          className="mt-6 min-h-12 cursor-pointer rounded-xl bg-primary px-6 font-display text-white uppercase"
        >
          Back to home
        </button>
      </div>
    )
  }
}
