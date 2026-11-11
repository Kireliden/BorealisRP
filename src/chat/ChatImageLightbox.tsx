import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import "./chatImageLightbox.css";

export type ChatLightboxImage = { src: string; name: string };

type Props = {
  images: ChatLightboxImage[];
  startIndex: number;
  onClose: () => void;
};

export default function ChatImageLightbox({ images, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const active = images[index] ?? images[0];

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        event.preventDefault();
        setIndex((current) => (current + 1) % images.length);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        event.preventDefault();
        setIndex((current) => (current - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [images, onClose]);

  if (!active) return null;

  return createPortal(
    <div className="chat-image-lightbox-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="chat-image-lightbox" role="dialog" aria-modal="true" aria-label="Chat image preview">
        <header className="chat-image-lightbox-header">
          <span title={active.name}>{active.name}</span>
          <div className="chat-image-lightbox-controls">
            {images.length > 1 && <small>{index + 1} / {images.length}</small>}
            <button type="button" ref={closeButtonRef} aria-label="Close image" title="Close (Esc)" onClick={onClose}><X size={20} /></button>
          </div>
        </header>
        <div className="chat-image-lightbox-stage">
          {images.length > 1 && <button type="button" className="chat-image-lightbox-nav" aria-label="Previous image" title="Previous (Left arrow)" onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}><ChevronLeft size={25} /></button>}
          <img src={active.src} alt={active.name} />
          {images.length > 1 && <button type="button" className="chat-image-lightbox-nav" aria-label="Next image" title="Next (Right arrow)" onClick={() => setIndex((value) => (value + 1) % images.length)}><ChevronRight size={25} /></button>}
        </div>
        <div className="chat-image-lightbox-hint">{images.length > 1 ? "Use the arrow keys to browse · " : ""}Press Esc or click outside to close</div>
      </section>
    </div>, document.body,
  );
}
