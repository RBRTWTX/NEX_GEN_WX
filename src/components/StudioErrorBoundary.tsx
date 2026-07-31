import { Component, type ErrorInfo, type ReactNode } from 'react';

interface StudioErrorBoundaryProps {
  children: ReactNode;
}

interface StudioErrorBoundaryState {
  error: Error | null;
  componentStack: string;
}

export class StudioErrorBoundary extends Component<StudioErrorBoundaryProps, StudioErrorBoundaryState> {
  state: StudioErrorBoundaryState = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): StudioErrorBoundaryState {
    return { error, componentStack: '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, componentStack: info.componentStack ?? '' });
    console.error('NEX GEN WX operator interface failed to render.', error, info);
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="studio-runtime-error" role="alert">
        <section className="studio-runtime-error__panel">
          <p className="studio-runtime-error__eyebrow">OPERATOR DIAGNOSTIC</p>
          <h1>NEX GEN WX could not finish loading</h1>
          <p>
            The desktop shell is running, but the operator interface encountered a runtime error.
            This diagnostic is operator-only and will not be used in clean output or PNG exports.
          </p>
          <div className="studio-runtime-error__message">{error.message}</div>
          <div className="studio-runtime-error__actions">
            <button type="button" className="primary" onClick={this.reload}>Reload application</button>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(`${error.stack ?? error.message}\n${componentStack}`)}
            >
              Copy diagnostic
            </button>
          </div>
          <details>
            <summary>Technical details</summary>
            <pre>{error.stack ?? error.message}{componentStack}</pre>
          </details>
        </section>
      </main>
    );
  }
}
