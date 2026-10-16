
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./PotatoEgg.css";
import { createPortal } from "react-dom";
import { registerDiscovery } from "../collection/collectionStorage";

const REQUIRED_CLICKS = 18;

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
  const [clicks, setClicks] = useState(0);
  const [revealed, setRevealed] = useState(false);
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

  void registerDiscovery("potato-exe").catch((error) => {
    console.error("Failed to save Potato.EXE discovery:", error);
  });
}, [revealed]);

  function handleLogoClick(event: MouseEvent<HTMLButtonElement>) {
    if (revealed) return;

    const nextClicks = clicks + 1;
    const feedback = getFeedback(nextClicks);
    const id = ++nextId.current;

    setClicks(nextClicks);

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
        current.filter((message) => message.id !== id)
      );
    }, 1100);

    timers.current.push(removeTimer);

    if (nextClicks === REQUIRED_CLICKS) {
      const revealTimer = setTimeout(() => {
        setRevealed(true);
      }, 450);

      timers.current.push(revealTimer);
    }
  }

  function resetEgg() {
    setRevealed(false);
    setClicks(0);
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
        ✦
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
  document.body
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
