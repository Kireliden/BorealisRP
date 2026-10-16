
import { useEffect, useState } from "react";
import { loadCollection } from "./collectionStorage";
import type { CollectionEntry } from "./collectionTypes";
import HolographicSticker from "./components/HolographicSticker";
import "./CollectionModal.css";
import potatoSticker from "../easter-eggs/assets/ee_001.png";

type CollectionsModalProps = {
  onClose: () => void;
};

const COLLECTION_ITEMS = [
  {
    id: "potato-exe",
    name: "POTATO.EXE",
    description: "Don't worry, she just wanted to say hi.",
    icon: "🥔",
    imageSrc: potatoSticker,
    imageAlt: "POTATO.EXE, the pink potato sticker",
  },
] as const;

type CollectionItem = (typeof COLLECTION_ITEMS)[number];

export default function CollectionsModal({
  onClose,
}: CollectionsModalProps) {
  const [discoveries, setDiscoveries] = useState<CollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSticker, setSelectedSticker] =
    useState<CollectionItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadCollection()
      .then((data) => {
        if (!cancelled) setDiscoveries(data.discovered);
      })
      .catch((error) => {
        console.error("Failed to load collection:", error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !selectedSticker) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedSticker]);

  const discoveredIds = new Set(discoveries.map((entry) => entry.id));

  const discoveredCount = COLLECTION_ITEMS.filter((item) =>
    discoveredIds.has(item.id),
  ).length;

  const totalCount = COLLECTION_ITEMS.length;
  const progress =
    totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0;

  return (
    <div
      className="collections-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="collections-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collections-title"
      >
        <header className="collections-header">
          <div className="collections-heading-copy">
            <span className="collections-eyebrow">
              BOREALIS ROLEPLAY DEN
            </span>

            <h2 id="collections-title">Collections</h2>

            <p className="collections-subtitle">
              Little secrets, curious discoveries, and things hiding
              in plain sight.
            </p>
          </div>

          <button
            className="collections-close"
            type="button"
            onClick={onClose}
            aria-label="Close Collections"
            title="Close"
          >
            ×
          </button>
        </header>

        <div className="collections-content">
          <section className="collections-summary">
            <div
              className="collections-summary-icon"
              aria-hidden="true"
            >
              <span>✦</span>
            </div>

            <div className="collections-summary-copy">
              <span className="collections-summary-eyebrow">
                YOUR LITTLE ARCHIVE
              </span>

              <strong>Your discoveries</strong>

              <p>
                {isLoading
                  ? "Counting your secrets…"
                  : `${discoveredCount} of ${totalCount} secrets discovered`}
              </p>

              <div
                className="collections-progress"
                role="progressbar"
                aria-label="Collection completion"
                aria-valuemin={0}
                aria-valuemax={totalCount}
                aria-valuenow={discoveredCount}
              >
                <span
                  className="collections-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <span className="collections-count">
              {String(discoveredCount).padStart(2, "0")}
              <span> / {String(totalCount).padStart(2, "0")}</span>
            </span>
          </section>

          <div className="collections-section-heading">
            <div>
              <h3>The hidden things</h3>
              <p>Some secrets are better found than told.</p>
            </div>

            <span className="collections-section-count">
              {String(totalCount).padStart(2, "0")} ENTRIES
            </span>
          </div>

          {isLoading ? (
            <p className="collections-message" role="status">
              Gathering your discoveries…
            </p>
          ) : loadError ? (
            <p className="collections-message" role="alert">
              Your collection couldn't be loaded. Try closing and
              reopening this window.
            </p>
          ) : (
            <div className="collections-list">
              {COLLECTION_ITEMS.map((item, index) => {
                const discovery = discoveries.find(
                  (entry) => entry.id === item.id,
                );

                const isDiscovered = Boolean(discovery);

                return (
                  <article
                    className={`collection-entry ${
                      isDiscovered
                        ? "collection-entry--discovered"
                        : "collection-entry--unknown"
                    }`}
                    key={item.id}
                  >
                    <button
                      className={`collection-entry-art collection-entry-art-button ${
                        isDiscovered ? "" : "collection-entry-art-button--locked"
                      }`}
                      type="button"
                      disabled={!isDiscovered}
                      onClick={() => {
                        if (isDiscovered) setSelectedSticker(item);
                      }}
                      aria-label={
                        isDiscovered
                          ? `View ${item.name} sticker`
                          : "Undiscovered secret"
                      }
                    >
                      <span className="collection-entry-number">
                        {String(index + 1).padStart(3, "0")}
                      </span>

                      {isDiscovered ? (
                        <img
                          className="collection-sticker-image"
                          src={item.imageSrc}
                          alt=""
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="collection-entry-icon"
                          aria-hidden="true"
                        >
                          ?
                        </div>
                      )}

                      <span className="collection-entry-art-label">
                        {isDiscovered ? "UNLOCKED · VIEW" : "UNDISCOVERED"}
                      </span>
                    </button>

                    <div className="collection-entry-copy">
                      <span className="collection-entry-eyebrow">
                        {isDiscovered
                          ? "A SECRET DISCOVERED"
                          : "SOMETHING IS HIDING"}
                      </span>

                      <h4>
                        {isDiscovered ? item.name : "Unknown secret"}
                      </h4>

                      <p>
                        {isDiscovered
                          ? item.description
                          : "Keep exploring Borealis to discover this secret."}
                      </p>

                      {isDiscovered && (
                        <span className="collection-entry-status">
                          <span
                            className="collection-status-dot"
                            aria-hidden="true"
                          />
                          DISCOVERED
                        </span>
                      )}
                    </div>

                    <span
                      className="collection-entry-mark"
                      aria-label={
                        isDiscovered ? "Discovered" : "Not yet discovered"
                      }
                    >
                      {isDiscovered ? "✓" : "?"}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="collections-footer">
          <span>
            <span className="collections-footer-star" aria-hidden="true">
              ✦
            </span>
            Every secret has a story.
          </span>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>

      {selectedSticker && (
        <HolographicSticker
          imageSrc={selectedSticker.imageSrc}
          alt={selectedSticker.imageAlt}
          title={selectedSticker.name}
          onClose={() => setSelectedSticker(null)}
        />
      )}
    </div>
  );
}
