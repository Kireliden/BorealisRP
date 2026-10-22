type Props = {
  initials: string;
  imageSrc?: string | null;
  alt?: string;
  expressionImage?: string | null;
  expressionIsPhoto?: boolean;
  expressionLabel?: string;
  fit?: "cover" | "contain";
  positionX?: number;
  positionY?: number;
  zoom?: number;
  fadeEdges?: boolean;
};

export default function CharacterPortraitArt({ initials, imageSrc, alt = "", expressionImage, expressionIsPhoto = false, expressionLabel = "Character expression", fit = "cover", positionX = 50, positionY = 50, zoom = 100, fadeEdges = false }: Props) {
  return <>
    {imageSrc ? (fadeEdges ? <div className="character-portrait-image-layer character-portrait-image-layer-fade"><img className="character-portrait-image" src={imageSrc} alt={alt} style={{ objectFit: fit, objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${positionX}% ${positionY}%` }} /></div> : <img className="character-portrait-image" src={imageSrc} alt={alt} style={{ objectFit: fit, objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${positionX}% ${positionY}%` }} />) : <span className="character-portrait-initials">{initials}</span>}
    {expressionImage && (expressionIsPhoto
      ? <img className="character-portrait-expression character-portrait-expression-photo" src={expressionImage} alt={expressionLabel} />
      : <span
          className="character-portrait-expression"
          aria-label={expressionLabel}
          style={{ maskImage: `url("${expressionImage}")`, WebkitMaskImage: `url("${expressionImage}")` }}
        />)}
  </>;
}
