import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Bug, RefreshCw } from "lucide-react";

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null; componentStack: string };

/** Catches render and lifecycle errors below the application router. */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, componentStack: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Uncaught application error:", error, info.componentStack);
    }
    this.setState({ componentStack: info.componentStack ?? "" });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const isDevelopment = import.meta.env.DEV;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-100">
        <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            {isDevelopment ? <Bug size={28} /> : <AlertTriangle size={28} />}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-300">
            {isDevelopment ? "Development error" : "Unexpected error"}
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            {isDevelopment ? "A component crashed" : "We hit a snag"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            {isDevelopment
              ? "The screen could not render. Use the details below to find the failing component."
              : "This page ran into a problem. Try loading it again, or return to the home page."}
          </p>

          {isDevelopment && (
            <div className="mt-7 space-y-4">
              <div className="rounded-xl border border-rose-400/20 bg-black/30 p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                  {error.name}
                </h2>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-sm text-rose-100">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <details className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    JavaScript stack trace
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">
                    {error.stack}
                  </pre>
                </details>
              )}
              {componentStack && (
                <details className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    React component stack
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <RefreshCw size={16} /> Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <ArrowLeft size={16} /> Go to home
            </a>
          </div>
        </section>
      </main>
    );
  }
}
