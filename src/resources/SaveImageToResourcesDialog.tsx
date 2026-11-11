import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookmarkPlus } from "lucide-react";
import "./imageSourceDialog.css";

type Props = {
  fileName: string;
  onSave: () => Promise<void>;
  onSkip: () => void;
};

/** Never automatically import system-picked images into Resources. */
export default function SaveImageToResourcesDialog({ fileName, onSave, onSkip }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onSkip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onSkip]);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await onSave(); } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  }

  return createPortal(
    <div className="image-source-backdrop" role="presentation">
      <section className="image-source-dialog image-resource-confirm" role="dialog" aria-modal="true" aria-labelledby="save-resource-title">
        <BookmarkPlus size={25} className="image-resource-confirm-icon" aria-hidden="true" />
        <small>OPTIONAL · RESOURCES</small>
        <h2 id="save-resource-title">Save this image to Resources?</h2>
        <p>You can use <strong>{fileName}</strong> without adding it to your library. Save a copy if you want it available again later.</p>
        {error && <p className="image-source-error" role="alert">{error}</p>}
        <div className="image-source-foot">
          <button type="button" onClick={onSkip} disabled={busy}>Not now</button>
          <button type="button" className="image-source-primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save to Resources"}</button>
        </div>
      </section>
    </div>, document.body,
  );
}
