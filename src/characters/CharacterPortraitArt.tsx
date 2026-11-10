import type { CSSProperties } from "react";

/** All OC portraits use one framing calculation, regardless of where they are shown. */
export type PortraitFraming = {
  fit?: "cover" | "contain";
  positionX?: number;
  positionY?: number;
  zoom?: number;
};

export function characterPortraitStyle({ fit = "contain", positionX = 50, positionY = 50, zoom = 100 }: PortraitFraming): CSSProperties {
  return {
    objectFit: fit,
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `scale(${zoom / 100})`,
    transformOrigin: `${positionX}% ${positionY}%`,
  };
}

type Props = PortraitFraming & {
  initials: string;
  imageSrc?: string | null;
  alt?: string;
  expressionImage?: string | null;
  expressionIsPhoto?: boolean;
  expressionLabel?: string;
  fadeEdges?: boolean;
};

export default function CharacterPortraitArt({
  initials, imageSrc, alt = "", expressionImage, expressionIsPhoto = false,
  expressionLabel = "Character expression", fit = "contain", positionX = 50,
  positionY = 50, zoom = 100, fadeEdges = false,
}: Props) {
  const image = imageSrc
    ? <img className="character-portrait-image" src={imageSrc} alt={alt} style={characterPortraitStyle({ fit, positionX, positionY, zoom })} />
    : <span className="character-portrait-initials">{initials}</span>;

  return <>
    {imageSrc && fadeEdges
      ? <div className="character-portrait-image-layer character-portrait-image-layer-fade">{image}</div>
      : image}
    {expressionImage && (expressionIsPhoto
      ? <img className="character-portrait-expression character-portrait-expression-photo" src={expressionImage} alt={expressionLabel} />
      : <span className="character-portrait-expression" aria-label={expressionLabel}
          style={{ maskImage: `url("${expressionImage}")`, WebkitMaskImage: `url("${expressionImage}")` }} />
    )}
  </>;
}
