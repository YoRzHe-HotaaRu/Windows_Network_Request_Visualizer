import { useFlowStore } from "../stores/flows";
import { completeFirstRun, startCapture, getStatus } from "../hooks/useCapture";

export function FirstRunWizard() {
  const open = useFlowStore((s) => s.wizardOpen);
  const setOpen = useFlowStore((s) => s.setWizardOpen);
  const status = useFlowStore((s) => s.status);
  const setStatus = useFlowStore((s) => s.setStatus);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-hd">
          <h2>Network Visualizer</h2>
          <p>
            Map where this machine talks on Earth. Full capture wants Admin +
            Npcap; otherwise connection-table or demo mode still works.
          </p>
        </div>
        <div className="modal-bd">
          <ol className="steps">
            <li>
              Install <strong>Npcap</strong> (WinPcap API-compatible mode).
            </li>
            <li>
              Run this app <strong>as Administrator</strong> for best results.
            </li>
            <li>
              Optional: MaxMind <strong>GeoLite2-City</strong> path in Settings.
            </li>
            <li>Start, open a browser, watch destinations light up.</li>
          </ol>

          <div className="detect-box">
            <div className="lbl">Detected</div>
            elevated: {status?.elevated ? "yes" : "no"} · npcap:{" "}
            {status?.npcapAvailable ? "yes" : "no"} · geo:{" "}
            {status?.geoReady ? "ready" : "http fallback"}
          </div>
        </div>
        <div className="modal-ft">
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              await completeFirstRun();
              const st = await getStatus();
              if (st) setStatus(st);
              setOpen(false);
            }}
          >
            Skip
          </button>
          <button
            type="button"
            className="primary"
            onClick={async () => {
              await completeFirstRun();
              const st = await startCapture();
              if (st) setStatus(st);
              else {
                const s = await getStatus();
                if (s) setStatus(s);
              }
              setOpen(false);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
