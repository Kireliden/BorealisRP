
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { registerDiscovery } from "../collection/collectionStorage";
import { useRegisteredClickTrigger } from "../engine/useRegisteredClickTrigger";
import "./PotatoEgg.css";

const POTATO_TRIGGER_ID = "potato-exe";

type FloatingMessage = {
  id: number;
  text: string;
  x: number;
  y: number;
  variant: "count" | "confused" | "warning" | "stop";
};

function getFeedback(click: number): {
  text: string;
  variant: FloatingMessage["variant"];
} {
  switch (click) {
    case 5:
      return { text: "Huh?", variant: "confused" };
    case 11:
      return { text: "Careful!", variant: "warning" };
    case 16:
      return { text: "STOP!", variant: "stop" };
    default:
      return { text: `+${click}`, variant: "count" };
  }
}

export default function PotatoEgg() {
  const { trigger, advance, reset } = useRegisteredClickTrigger(
    POTATO_TRIGGER_ID,
    {
      type: "click-count",
      requiredClicks: 18,
    },
  );

  const [revealed, setRevealed] = useState(
    () => trigger.state.completed,
  );

  const [floatingMessages, setFloatingMessages] = useState<
    FloatingMessage[]
  >([]);

  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!revealed) return;

    void registerDiscovery(POTATO_TRIGGER_ID).catch((error) => {
      console.error("Failed to save Potato.EXE discovery:", error);
    });
  }, [revealed]);

  function handleLogoClick(event: MouseEvent<HTMLButtonElement>) {
    if (revealed || trigger.state.completed) return;

    const nextTrigger = advance();
    const nextClicks = nextTrigger.state.currentClicks;
    const feedback = getFeedback(nextClicks);
    const id = ++nextId.current;

    setFloatingMessages((current) => [
      ...current,
      {
        id,
        text: feedback.text,
        variant: feedback.variant,
        x: event.clientX,
        y: event.clientY,
      },
    ]);

    const removeTimer = setTimeout(() => {
      setFloatingMessages((current) =>
        current.filter((message) => message.id !== id),
      );
    }, 1100);

    timers.current.push(removeTimer);

    if (nextTrigger.state.completed) {
      const revealTimer = setTimeout(() => {
        setRevealed(true);
      }, 450);

      timers.current.push(revealTimer);
    }
  }

  function resetEgg() {
    setRevealed(false);
    reset();
    setFloatingMessages([]);
  }

  return (
    <>
      <button
        className="titlebar-logo"
        type="button"
        aria-label="Borealis logo"
        title="Borealis"
        onClick={handleLogoClick}
      >
        <svg className="borealis-moon-mark" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="#c4b5fd" stroke="#1e1e2e" strokeWidth="2.5" strokeLinejoin="round"/></svg>
      </button>

      {createPortal(
        <div className="potato-feedback" aria-hidden="true">
          {floatingMessages.map((message) => (
            <span
              key={message.id}
              className={`potato-float potato-float--${message.variant}`}
              style={{
                left: message.x,
                top: message.y,
              }}
            >
              {message.text}
            </span>
          ))}
        </div>,
        document.body,
      )}

      {revealed && (
        <div
          className="potato-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="potato-title"
          onClick={resetEgg}
        >
          <div
            className="potato-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="potato-art" aria-hidden="true">
              🥔
            </div>

            <h2 id="potato-title">YOU'VE BEEN POTATO'ED</h2>
            <p>Don't worry, she just wanted to say hi.</p>

            <button
              type="button"
              className="potato-dismiss"
              onClick={resetEgg}
            >
              Hi!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
