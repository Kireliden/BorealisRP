
import { useEffect, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import "./HolographicSticker.css";

interface HolographicStickerProps {
  imageSrc: string;
  alt: string;
  title?: string;
  onClose: () => void;
}

interface PointerPosition {
  x: number;
  y: number;
}

const INITIAL_POSITION: PointerPosition = { x: 50, y: 50 };

export default function HolographicSticker({
  imageSrc,
  alt,
  title,
  onClose,
}: HolographicStickerProps) {
  const [pointer, setPointer] =
    useState<PointerPosition>(INITIAL_POSITION);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const resetPointer = () => setPointer(INITIAL_POSITION);

  const stickerStyle = {
    "--pointer-x": `${pointer.x}%`,
    "--pointer-y": `${pointer.y}%`,
    "--tilt-x": `${(50 - pointer.y) * 0.16}deg`,
    "--tilt-y": `${(pointer.x - 50) * 0.16}deg`,
    "--sticker-mask": `url("${imageSrc}")`,
  } as CSSProperties;

  return (
    <div
      className="holographic-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="holographic-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? alt}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="holographic-close"
          type="button"
          onClick={onClose}
          aria-label="Cerrar coleccionable"
        >
          ×
        </button>

        {title && <p className="holographic-title">{title}</p>}

        <div
          className="holographic-stage"
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          <div className="holographic-card" style={stickerStyle}>
            <div className="holographic-art">
              <img src={imageSrc} alt={alt} draggable={false} />
            </div>

            <div className="holographic-foil" aria-hidden="true" />
            <div className="holographic-glare" aria-hidden="true" />
            
<div className="holographic-sparkles" aria-hidden="true">
  {Array.from({ length: 18 }, (_, i) => (
    <span
      key={i}
      className={`potato-glint potato-glint--${(i % 6) + 1}`}
      style={{
        left: `${8 + ((i * 37 + 13) % 84)}%`,
        top: `${8 + ((i * 53 + 29) % 84)}%`,
        animationDelay: `${-((i * 1.73) % 7)}s`,
        animationDuration: `${2.1 + ((i * 1.37) % 4.5)}s`,
        "--glint-size": `${3 + ((i * 7) % 7)}px`,
      } as React.CSSProperties}
    />
  ))}
</div>

          </div>
        </div>

        <p className="holographic-hint">
          Move your mouse over the sticker to see the holographic effect.
        </p>
      </section>
    </div>
  );
}
