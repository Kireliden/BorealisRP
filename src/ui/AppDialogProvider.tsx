import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type FormEvent, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, PencilLine, X } from "lucide-react";
import "./AppDialogProvider.css";

type DialogKind = "confirm" | "prompt" | "alert";
type DialogOptions = { title?: string; confirmLabel?: string; destructive?: boolean };
type DialogResult = boolean | string | null | undefined;
type DialogTask = {
  id: number;
  kind: DialogKind;
  message: string;
  options: DialogOptions;
  initialValue?: string;
  resolve: (value: DialogResult) => void;
};
type DialogAPI = {
  confirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  prompt: (message: string, initialValue?: string, options?: DialogOptions) => Promise<string | null>;
  alert: (message: string, options?: DialogOptions) => Promise<void>;
};

const DialogContext = createContext<DialogAPI | null>(null);

export function useAppDialog(): DialogAPI {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useAppDialog requires AppDialogProvider");
  return api;
}

/** Queued, themed replacements for window.confirm / prompt / alert. */
export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DialogTask[]>([]);
  const counter = useRef(0);
  const task = requests[0] ?? null;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const confirm = useCallback<DialogAPI["confirm"]>((message, options = {}) =>
    new Promise<boolean>((resolve) => {
      const id = ++counter.current;
      setRequests((items) => [...items, {
        id, kind: "confirm", message, options, resolve: (result) => resolve(result === true),
      }]);
    }), []);

  const prompt = useCallback<DialogAPI["prompt"]>((message, initialValue = "", options = {}) =>
    new Promise<string | null>((resolve) => {
      const id = ++counter.current;
      setRequests((items) => [...items, {
        id, kind: "prompt", message, initialValue, options,
        resolve: (result) => resolve(typeof result === "string" ? result : null),
      }]);
    }), []);

  const alert = useCallback<DialogAPI["alert"]>((message, options = {}) =>
    new Promise<void>((resolve) => {
      const id = ++counter.current;
      setRequests((items) => [...items, {
        id, kind: "alert", message, options, resolve: () => resolve(),
      }]);
    }), []);

  const finish = (result: DialogResult) => {
    task?.resolve(result);
    setRequests((items) => items.slice(1));
  };

  useEffect(() => {
    if (!task) return;
    setDraft(task.initialValue ?? "");
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      if (task.kind === "prompt") { inputRef.current?.focus(); inputRef.current?.select(); }
      else (cancelRef.current ?? dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocus?.focus();
    };
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(task.kind === "confirm" ? false : null);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const controls = [...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
        )];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener("keydown", keyDown, true);
    return () => window.removeEventListener("keydown", keyDown, true);
  }, [task?.id]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!task) return;
    finish(task.kind === "prompt" ? draft : true);
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {task && createPortal(
        <div className="app-dialog-backdrop" role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) finish(task.kind === "confirm" ? false : null);
          }}>
          <section ref={dialogRef} tabIndex={-1} className="app-dialog-panel"
            role={task.kind === "alert" ? "alertdialog" : "dialog"} aria-modal="true"
            aria-labelledby={"app-dialog-title-" + uid} aria-describedby={"app-dialog-description-" + uid}>
            <div className="app-dialog-heading">
              <span className={"app-dialog-symbol" + (task.options.destructive ? " is-danger" : "")}>
                {task.options.destructive ? <AlertTriangle size={19} /> :
                  task.kind === "prompt" ? <PencilLine size={19} /> : <Info size={19} />}
              </span>
              <div>
                <span className="app-dialog-eyebrow">BOREALIS ROLEPLAY STUDIO</span>
                <h2 id={"app-dialog-title-" + uid}>{task.options.title ?? (
                  task.kind === "prompt" ? "Rename" : task.kind === "alert" ? "Notice" : "Confirm action"
                )}</h2>
              </div>
              <button type="button" className="app-dialog-close" onClick={() => finish(task.kind === "confirm" ? false : null)}
                aria-label="Close dialog"><X size={18} /></button>
            </div>
            <form onSubmit={submit}>
              <p className="app-dialog-message" id={"app-dialog-description-" + uid}>{task.message}</p>
              {task.kind === "prompt" && (
                <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)}
                  className="app-dialog-input" aria-label={task.options.title ?? task.message}
                  spellCheck={false} />
              )}
              <div className="app-dialog-actions">
                {task.kind !== "alert" && <button type="button" ref={cancelRef}
                  className="app-dialog-cancel" onClick={() => finish(task.kind === "confirm" ? false : null)}>
                  Cancel
                </button>}
                <button type="submit" className={"app-dialog-accept" + (task.options.destructive ? " is-danger" : "")}>
                  {task.options.confirmLabel ?? (task.kind === "alert" ? "OK" : task.kind === "prompt" ? "Save" : "Confirm")}
                </button>
              </div>
            </form>
          </section>
        </div>, document.body,
      )}
    </DialogContext.Provider>
  );
}
