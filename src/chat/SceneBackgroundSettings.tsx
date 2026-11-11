import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, RotateCcw, Trash2, X } from "lucide-react";
import ImageSourceDialog from "../resources/ImageSourceDialog";
import SaveImageToResourcesDialog from "../resources/SaveImageToResourcesDialog";
import { importWorkspaceResource } from "../resources/workspaceResources.storage";
import {
  DEFAULT_SCENE_BACKGROUND,
  type SceneBackground,
  type SceneBackgroundAdjustments,
} from "./sceneBackground";
import "./sceneBackground.css";

type Props = {
  workspacePath: string;
  sceneName: string;
  current: SceneBackground | null;
  currentPreviewUrl: string | null;
  onSave: (settings: SceneBackgroundAdjustments | null, image: File | null) => Promise<void>;
  onClose: () => void;
};

type Adjustable = keyof SceneBackgroundAdjustments;
const controls: { key: Adjustable; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "dim", label: "Dark overlay", min: 0, max: 90, step: 2, unit: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 1, unit: "px" },
  { key: "zoom", label: "Zoom", min: 100, max: 200, step: 5, unit: "%" },
  { key: "positionX", label: "Horizontal", min: 0, max: 100, step: 5, unit: "%" },
  { key: "positionY", label: "Vertical", min: 0, max: 100, step: 5, unit: "%" },
];

export default function SceneBackgroundSettings({
  workspacePath, sceneName, current, currentPreviewUrl, onSave, onClose,
}: Props) {
  const [settings, setSettings] = useState<SceneBackgroundAdjustments>(
    current ? {
      dim: current.dim, blur: current.blur, zoom: current.zoom,
      positionX: current.positionX, positionY: current.positionY,
    } : { ...DEFAULT_SCENE_BACKGROUND },
  );
  const [image, setImage] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [systemImageToSave, setSystemImageToSave] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!image) { setPendingUrl(null); return; }
    const url = URL.createObjectURL(image);
    setPendingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (sourcePickerOpen || systemImageToSave || busy) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, sourcePickerOpen, systemImageToSave]);

  const previewUrl = remove ? null : pendingUrl ?? currentPreviewUrl;
  const hasImage = !remove && Boolean(image || current);
  const imageName = remove ? null : image?.name ?? current?.fileName;

  function selectImage(file: File, fromSystem: boolean) {
    setImage(file);
    setRemove(false);
    setError("");
    if (fromSystem) setSystemImageToSave(file);
  }

  async function apply() {
    if (busy) return;
    if (!remove && !image && !current) { setError("Choose an image first."); return; }
    setBusy(true);
    setError("");
    try {
      await onSave(remove ? null : settings, remove ? null : image);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="scene-background-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy && !sourcePickerOpen && !systemImageToSave) onClose();
    }}>
      <section className="scene-background-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-background-title">
        <header className="scene-background-header">
          <div><small>BOREALIS · SCENE CUSTOMISATION</small><h2 id="scene-background-title">Chat background</h2><p title={sceneName}>{sceneName}</p></div>
          <button type="button" aria-label="Close background settings" onClick={onClose} disabled={busy}><X size={18} /></button>
        </header>
        <div className="scene-background-content">
          <div className="scene-background-preview" aria-label="Background preview">
            {previewUrl && <div className="scene-background-preview-image" style={{
              backgroundImage: `url("${previewUrl}")`,
              backgroundPosition: `${settings.positionX}% ${settings.positionY}%`,
              filter: `blur(${settings.blur}px)`,
              transform: `scale(${settings.zoom / 100})`,
            }} />}
            <div className="scene-background-preview-dim" style={{ backgroundColor: `rgba(14,17,29,${settings.dim / 100})` }} />
            <div className="scene-background-preview-chat" aria-hidden="true">
              <span>SCENE PREVIEW</span><strong>{sceneName}</strong>
              <p>Somewhere, another story begins beneath the stars.</p>
              <p>The background stays behind your messages.</p>
            </div>
            {!previewUrl && <div className="scene-background-preview-empty"><ImageIcon size={24}/><span>{hasImage ? "Loading background preview…" : "No background selected"}</span></div>}
          </div>
          <div className="scene-background-file-actions">
            <span title={imageName ?? undefined}>{imageName ?? "Standard chat background"}</span>
            <button type="button" onClick={() => setSourcePickerOpen(true)} disabled={busy}><ImageIcon size={15}/>{hasImage ? "Change image" : "Choose image"}</button>
            {hasImage && <button type="button" className="scene-background-remove" onClick={() => { setImage(null); setRemove(true); setError(""); }} disabled={busy} title="Remove this scene background"><Trash2 size={15}/><span>Remove</span></button>}
          </div>
          <div className="scene-background-controls-header"><strong>Appearance</strong><button type="button" onClick={() => setSettings({ ...DEFAULT_SCENE_BACKGROUND })} disabled={busy}><RotateCcw size={13}/> Reset sliders</button></div>
          <div className="scene-background-controls">
            {controls.map(({ key, label, min, max, step, unit }) =>
              <label className="scene-background-control" key={key}>
                <span>{label}<output>{settings[key]}{unit}</output></span>
                <input type="range" min={min} max={max} step={step} value={settings[key]} disabled={busy}
                  onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, [key]: Number(event.target.value) }))}/>
              </label>)}
          </div>
          <p className="scene-background-note">Saved separately for this scene. Images stay inside your workspace, even if you remove them from Resources.</p>
          {error && <p className="scene-background-error" role="alert">{error}</p>}
        </div>
        <footer className="scene-background-footer">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="scene-background-apply" onClick={() => void apply()} disabled={busy || (!hasImage && !remove)}>
            {busy ? "Saving…" : remove ? "Remove background" : "Apply background"}
          </button>
        </footer>
        {sourcePickerOpen && <ImageSourceDialog
          workspacePath={workspacePath} title="Choose a chat background"
          onCancel={() => setSourcePickerOpen(false)}
          onSystem={(file) => selectImage(file, true)}
          onResource={(file) => selectImage(file, false)}
        />}
        {systemImageToSave && <SaveImageToResourcesDialog
          fileName={systemImageToSave.name}
          onSkip={() => setSystemImageToSave(null)}
          onSave={async () => {
            await importWorkspaceResource(workspacePath, systemImageToSave);
            setSystemImageToSave(null);
          }}
        />}
      </section>
    </div>, document.body,
  );
}
