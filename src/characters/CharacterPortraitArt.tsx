type Props = {
  initials: string;
  imageSrc?: string | null;
  alt?: string;
  expressionImage?: string | null;
  expressionLabel?: string;
  fit?: "cover" | "contain";
  positionX?: number;
  positionY?: number;
  zoom?: number;
};

export default function CharacterPortraitArt({ initials, imageSrc, alt = "", expressionImage, expressionLabel = "Character expression", fit = "cover", positionX = 50, positionY = 50, zoom = 100 }: Props) {
  return <>
    {imageSrc ? <img className="character-portrait-image" src={imageSrc} alt={alt} style={{ objectFit: fit, objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${positionX}% ${positionY}%` }} /> : <span className="character-portrait-initials">{initials}</span>}
    {expressionImage && <span
      className="character-portrait-expression"
      aria-label={expressionLabel}
      style={{ maskImage: `url("${expressionImage}")`, WebkitMaskImage: `url("${expressionImage}")` }}
    />}
  </>;
}
