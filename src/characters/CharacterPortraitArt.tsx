type Props = {
  initials: string;
  imageSrc?: string | null;
  alt?: string;
  expressionImage?: string | null;
  expressionLabel?: string;
  fit?: "cover" | "contain";
};

export default function CharacterPortraitArt({ initials, imageSrc, alt = "", expressionImage, expressionLabel = "Character expression", fit = "cover" }: Props) {
  return <>
    {imageSrc ? <img className="character-portrait-image" src={imageSrc} alt={alt} style={{ objectFit: fit }} /> : <span className="character-portrait-initials">{initials}</span>}
    {expressionImage && <span
      className="character-portrait-expression"
      aria-label={expressionLabel}
      style={{ maskImage: `url("${expressionImage}")`, WebkitMaskImage: `url("${expressionImage}")` }}
    />}
  </>;
}
