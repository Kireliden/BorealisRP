import {
  Children, isValidElement, useEffect, useId, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import "./AppSelect.css";

type OptionProps = { value?: string; disabled?: boolean; children?: ReactNode };
type ChangeValue = { target: { value: string } };

type Props = {
  children: ReactNode;
  value: string;
  onChange: (event: ChangeValue) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  title?: string;
  "aria-label"?: string;
};

type Placement = { top: number; left: number; width: number; maxHeight: number };
const SELECT_OPEN_EVENT = "borealis:select-open";

/**
 * Shared app-rendered replacement for browser <select> popups.
 * Existing option children and onChange(event.target.value) handlers are kept
 * intentionally so legacy forms can migrate without rewriting their data flow.
 */
export default function AppSelect({
  children, value, onChange, disabled, id, className, title, "aria-label": ariaLabel,
}: Props) {
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<OptionProps> =>
      isValidElement<OptionProps>(child) && child.type === "option")
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    }));
  const selectedIndex = options.findIndex((item) => item.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const listId = "app-select-list-" + uid;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<Placement>({
    top: 0, left: 0, width: 220, maxHeight: 280,
  });

  const measure = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const below = viewportHeight - rect.bottom - 10;
    const above = rect.top - 10;
    const flip = below < 190 && above > below;
    const maxHeight = Math.max(72, Math.min(300, flip ? above - 8 : below - 8));
    const width = Math.min(Math.max(rect.width, 180), viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
    const top = flip ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6;
    setPlacement({ top, left, width, maxHeight });
  };

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    document.dispatchEvent(new CustomEvent(SELECT_OPEN_EVENT, { detail: uid }));
    measure();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange({ target: { value: option.value } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    const onAnotherSelect = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== uid) setOpen(false);
    };
    document.addEventListener(SELECT_OPEN_EVENT, onAnotherSelect);
    return () => document.removeEventListener(SELECT_OPEN_EVENT, onAnotherSelect);
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node) ||
          menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const scroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = menuRef.current?.querySelector<HTMLElement>(
      '[data-app-select-index="' + activeIndex + '"]',
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return;
    const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (direction) {
      event.preventDefault();
      if (!open) { openMenu(); return; }
      let candidate = activeIndex;
      for (let n = 0; n < options.length; n += 1) {
        candidate = (candidate + direction + options.length) % options.length;
        if (!options[candidate].disabled) { setActiveIndex(candidate); break; }
      }
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) openMenu();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) pick(activeIndex);
      else openMenu();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <span className={"app-select" + (className ? " " + className : "")}>
      <button
        type="button" ref={triggerRef} id={id} title={title} disabled={disabled}
        className="app-select-trigger"
        role="combobox" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? listId + "-option-" + activeIndex : undefined}
        aria-label={ariaLabel}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={onKeys}
      >
        <span className="app-select-value">{selectedOption?.label ?? "Select an option…"}</span>
        <ChevronDown size={14} className={"app-select-chevron" + (open ? " is-open" : "")} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="app-select-menu" id={listId} role="listbox"
          aria-label={ariaLabel ?? "Choose an option"}
          style={{ position: "fixed", top: placement.top, left: placement.left,
            width: placement.width, maxHeight: placement.maxHeight } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}>
          {options.map((option, index) =>
            <button
              type="button" role="option" key={option.value + "-" + index}
              data-app-select-index={index}
              id={listId + "-option-" + index}
              className={"app-select-option" + (index === activeIndex ? " is-active" : "")}
              aria-selected={option.value === value}
              disabled={option.disabled}
              tabIndex={-1}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>,
          )}
        </div>, document.body,
      )}
    </span>
  );
}
