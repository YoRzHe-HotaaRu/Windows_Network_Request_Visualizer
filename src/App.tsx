import { HeaderBar } from "./components/HeaderBar";
import { KpiStrip } from "./components/KpiStrip";
import { GlobeView } from "./components/GlobeView";
import { LiveFeed } from "./components/LiveFeed";
import { BottomCharts } from "./components/BottomCharts";
import { SettingsModal } from "./components/SettingsModal";
import { FirstRunWizard } from "./components/FirstRunWizard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useCaptureBootstrap } from "./hooks/useCapture";

export default function App() {
  useCaptureBootstrap();

  return (
    <div className="app-shell">
      <HeaderBar />
      <div className="main-grid">
        <KpiStrip />
        <ErrorBoundary fallbackTitle="Globe panel error">
          <GlobeView />
        </ErrorBoundary>
        <LiveFeed />
      </div>
      <BottomCharts />
      <SettingsModal />
      <FirstRunWizard />
    </div>
  );
}
