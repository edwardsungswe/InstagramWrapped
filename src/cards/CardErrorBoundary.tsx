import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  cardId: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: string | null;
};

/**
 * React error boundary that wraps each card in the deck. If a card's render
 * function throws (bad data shape, missing field, etc.), this catches the
 * error and renders a fallback instead of crashing the entire deck. The user
 * can swipe past the broken card and continue viewing the rest.
 *
 * Uses a class component because React 19 still requires class components
 * for error boundaries (no hooks equivalent).
 */
export class CardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(
      `CardErrorBoundary caught error in card "${this.props.cardId}":`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex aspect-[9/16] w-[min(90vw,28rem)] flex-col items-center justify-center rounded-3xl bg-zinc-900 p-8 text-center text-white">
          <p className="text-lg font-semibold">This card couldn&apos;t render</p>
          <p className="mt-2 text-sm text-zinc-500">
            Something went wrong with the data. Swipe to continue.
          </p>
          {this.state.error && (
            <p className="mt-4 max-w-xs text-xs font-mono text-zinc-600 break-all">
              {this.state.error}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
