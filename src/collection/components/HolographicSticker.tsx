
import { useEffect, useId, useState } from "react";
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

  // A separate CSS mask-image URL can use a different GIF frame from the
  // displayed <img>. Animated stickers instead filter SourceAlpha on the
  // actual rendered frame: there is only one animation timeline to follow.
  const isAnimatedSticker = /\.gif(?:$|[?#])/i.test(imageSrc);
  const animatedFilterId = `holographic-animated-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const animatedGlareColor = pointer.x < 34 ? "#b6e6ff"
    : pointer.x > 66 ? "#ffd3a8" : "#efc6ff";

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

        <div className="holographic-stage">
          <div
            className={`holographic-card${isAnimatedSticker ? " holographic-card--animated" : ""}`}
            style={stickerStyle}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
          >
            {isAnimatedSticker && (
              <svg className="holographic-animated-filter-defs" aria-hidden="true" focusable="false">
                <defs>
                  <filter id={animatedFilterId} x="0" y="0" width="100%" height="100%"
                    colorInterpolationFilters="sRGB">
                    {/* SourceAlpha belongs to the animated IMAGE ITSELF, rather than
                        an independent CSS mask with a possibly desynchronised frame. */}
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.047"
                      numOctaves="1" seed="8" result="holo-noise" />
                    <feColorMatrix in="holo-noise" type="matrix"
                      values={`1.5 -0.6 0 0 0.1
                               -0.3 1.5 -0.3 0 0.14
                               0.1 -0.6 1.6 0 0.15
                               0 0 0 0 0.28`}
                      result="holo-colour" />
                    <feComposite in="holo-colour" in2="SourceAlpha"
                      operator="in" result="holo-shaped" />
                    <feBlend in="SourceGraphic" in2="holo-shaped"
                      mode="screen" result="holo-art" />
                    <feFlood floodColor={animatedGlareColor} floodOpacity="0.12" result="holo-glare" />
                    <feComposite in="holo-glare" in2="SourceAlpha"
                      operator="in" result="holo-glare-shaped" />
                    <feBlend in="holo-art" in2="holo-glare-shaped" mode="screen" />
                  </filter>
                </defs>
              </svg>
            )}
            <div className="holographic-art">
              <img src={imageSrc} alt={alt} draggable={false}
                style={isAnimatedSticker ? { filter: `url("#${animatedFilterId}")` } : undefined} />
            </div>

            {!isAnimatedSticker && (
              <>
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
                      } as CSSProperties}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="holographic-hint">
          Move your mouse over the sticker to see the holographic effect.
        </p>
      </section>
    </div>
  );
}
