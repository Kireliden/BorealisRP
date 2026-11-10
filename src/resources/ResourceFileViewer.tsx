import { useEffect, useState } from "react";
import { ArrowDownToLine, File as FileIcon, Info, Trash2, X } from "lucide-react";
import type { ResourceRecord } from "./resources.types";
import { getCachedResourceObjectUrl } from "./resourceMediaCache";

type Props = {
  resource: ResourceRecord;
  scope: string;
  getBlob: (resourceId: string) => Promise<Blob | null>;
  onClose: () => void;
  onDetails: () => void;
  onDelete: () => void;
};

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "json", "jsonl", "csv", "tsv", "xml", "html", "css",
  "js", "jsx", "ts", "tsx", "yaml", "yml", "ini", "cfg", "log", "py", "lua",
  "java", "rs", "toml", "sh", "bat", "ps1", "sql",
]);

function isTextFile(resource: ResourceRecord): boolean {
  const extension = resource.fileName.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(extension) ||
    resource.mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/javascript"].includes(resource.mimeType);
}

export default function ResourceFileViewer({ resource, scope, getBlob, onClose, onDetails, onDelete }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isText = resource.kind === "other" && isTextFile(resource);
  const isPdf = resource.mimeType === "application/pdf" || resource.fileName.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setTextContent(null);
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const objectUrl = await getCachedResourceObjectUrl(scope, resource.id, () => getBlob(resource.id));
        if (!objectUrl) throw new Error("The file is no longer available in this library.");
        if (!cancelled) setUrl(objectUrl);
        if (isText) {
          if (resource.size > 2 * 1024 * 1024) {
            throw new Error("Text files over 2 MB are too large for the built-in preview. You can still save a copy.");
          }
          const blob = await getBlob(resource.id);
          if (!blob) throw new Error("The text file could not be loaded.");
          const text = await blob.text();
          if (!cancelled) setTextContent(text);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [resource.id, scope, isText, resource.size]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div className="resource-viewer-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="resource-viewer" role="dialog" aria-modal="true" aria-label={`Preview ${resource.fileName}`}>
      <header className="resource-viewer-header">
        <div className="resource-viewer-title"><strong title={resource.fileName}>{resource.fileName}</strong><small>{(resource.size / 1024 / 1024).toFixed(2)} MB</small></div>
        <div className="resource-viewer-actions">
          {url && <a href={url} download={resource.fileName} title="Save a copy"><ArrowDownToLine size={17} /></a>}
          <button type="button" onClick={onDetails} title="Resource details" aria-label="Resource details"><Info size={17} /></button>
          <button type="button" onClick={onDelete} title="Delete resource" aria-label="Delete resource"><Trash2 size={17} /></button>
          <button type="button" className="resource-viewer-close" onClick={onClose} title="Close preview" aria-label="Close preview"><X size={19} /></button>
        </div>
      </header>
      <div className="resource-viewer-content">
        {loading ? <p className="resource-viewer-message">Loading preview…</p> :
          error ? <div className="resource-viewer-message"><p>{error}</p>{url && <a href={url} download={resource.fileName}>Save a copy</a>}</div> :
          !url ? <p className="resource-viewer-message">Preview unavailable.</p> :
          resource.kind === "image" ? <img className="resource-viewer-image" src={url} alt={resource.fileName} /> :
          resource.kind === "audio" ? <audio className="resource-viewer-audio" controls src={url} /> :
          resource.kind === "video" ? <video className="resource-viewer-video" controls src={url} /> :
          isPdf ? <iframe className="resource-viewer-document" title={resource.fileName} src={url} /> :
          isText ? <pre className="resource-viewer-text">{textContent}</pre> :
          <div className="resource-viewer-message"><FileIcon size={40} /><p>There is no built-in preview for this file type.</p><a href={url} download={resource.fileName}>Save a copy</a></div>}
      </div>
    </section>
  </div>;
}
