import { Component, type ReactNode } from 'react'
import type { TFunction } from '../../i18n'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  t?: TFunction
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      const t = this.props.t
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
          <p className="text-lg font-semibold text-neutral-900">
            {t ? t('errorBoundary.title') : 'Something went wrong'}
          </p>
          <p className="max-w-md text-sm text-neutral-600">
            {this.state.error?.message || (t ? t('errorBoundary.message') : 'An unexpected error occurred.')}
          </p>
          <button
            onClick={this.handleReset}
            aria-label={t ? t('errorBoundary.retry') : 'Retry'}
            className="mt-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            {t ? t('errorBoundary.retry') : 'Retry'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
