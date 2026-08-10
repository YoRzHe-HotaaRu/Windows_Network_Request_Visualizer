import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

const fontSans = "IBM Plex Sans, system-ui, sans-serif";
const fontMono = "IBM Plex Mono, Consolas, monospace";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            color: "#e8e6e3",
            background: "#16181c",
            border: "1px solid #d94f3d",
            height: "100%",
            overflow: "auto",
            fontFamily: fontSans,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#d94f3d",
              fontFamily: fontMono,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {this.props.fallbackTitle ?? "Render failure"}
          </h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "#8b919a",
              background: "#0e1012",
              border: "1px solid #2a2e34",
              padding: 12,
              fontFamily: fontMono,
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              border: "1px solid #f0a202",
              background: "#f0a202",
              color: "#0c0d0f",
              cursor: "pointer",
              fontFamily: fontMono,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
