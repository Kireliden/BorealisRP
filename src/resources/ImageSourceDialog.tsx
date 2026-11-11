import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, Images, X } from "lucide-react";
import ResourceImagePicker from "./ResourceImagePicker";
import { getResourceBlob } from "./resources.storage";
import { getWorkspaceResourceBlob } from "./workspaceResources.storage";
import { chooseSystemImageFile, fileFromResource } from "./imageSelection";
import type { ResourceRecord } from "./resources.types";
import "./imageSourceDialog.css";

type Props = {
  workspacePath?: string | null;
  title: string;
  onCancel: () => void;
  onSystem: (file: File) => void | Promise<void>;
  onResource: (file: File) => void | Promise<void>;
};

/** Source choice is shared by the user profile and composer; the vault remains optional. */
export default function ImageSourceDialog({ workspacePath, title, onCancel, onSystem, onResource }: Props) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resourcesOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resourcesOpen, busy, onCancel]);

  async function chooseSystem() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const file = await chooseSystemImageFile();
      if (file) { await onSystem(file); onCancel(); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  }

  async function chooseResource([resource]: ResourceRecord[]) {
    if (!resource) return;
    const blob = workspacePath
      ? await getWorkspaceResourceBlob(workspacePath, resource.id)
      : await getResourceBlob(resource.id);
    if (!blob) throw new Error("The selected resource is no longer available.");
    await onResource(await fileFromResource(resource.fileName, resource.mimeType, blob));
    onCancel();
  }

  return createPortal(
    resourcesOpen
      ? <ResourceImagePicker workspacePath={workspacePath} title="Choose an image from Resources"
          onCancel={() => setResourcesOpen(false)} onChoose={chooseResource} />
      : <div className="image-source-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onCancel();
        }}>
          <section className="image-source-dialog" role="dialog" aria-modal="true" aria-label={title}>
            <div className="image-source-heading">
              <div><small>BOREALIS · IMAGE</small><h2>{title}</h2></div>
              <button type="button" aria-label="Close" onClick={onCancel} disabled={busy}><X size={18} /></button>
            </div>
            <p>Where would you like to get your image?</p>
            <div className="image-source-options">
              <button type="button" onClick={() => void chooseSystem()} disabled={busy}>
                <FolderOpen size={22} /><strong>From system</strong><span>Choose a file on your computer</span>
              </button>
              <button type="button" onClick={() => setResourcesOpen(true)} disabled={busy}>
                <Images size={22} /><strong>From Resources</strong><span>Browse your saved image library</span>
              </button>
            </div>
            {error && <p className="image-source-error" role="alert">{error}</p>}
            <div className="image-source-foot"><span>PNG, JPG, WebP or GIF · up to 25 MiB</span><button type="button" onClick={onCancel} disabled={busy}>Cancel</button></div>
          </section>
        </div>, document.body,
  );
}
