import "./styles/global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<div style="padding:24px;font-family:sans-serif;color:#e2e8f0;background:#05080f;height:100vh">Missing #root element</div>';
} else {
  // Clear any HTML bootstrap loader
  rootEl.innerHTML = "";
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary fallbackTitle="App failed to start">
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    rootEl.innerHTML = `<div style="padding:24px;font-family:Segoe UI,sans-serif;color:#e2e8f0;background:#05080f;height:100%">
      <h2 style="color:#f87171">Fatal startup error</h2>
      <pre style="white-space:pre-wrap;color:#94a3b8">${String(err)}</pre>
    </div>`;
    console.error(err);
  }
}
