import neutralFace from "openmoji/black/svg/1F610.svg?url";
import slightSmile from "openmoji/black/svg/1F642.svg?url";
import smirkingFace from "openmoji/black/svg/1F60F.svg?url";
import angryFace from "openmoji/black/svg/1F620.svg?url";
import cryingFace from "openmoji/black/svg/1F622.svg?url";
import flushedFace from "openmoji/black/svg/1F633.svg?url";

export const expressions = [
  { emoji: "😐", label: "Neutral", image: neutralFace },
  { emoji: "🙂", label: "Smile", image: slightSmile },
  { emoji: "😏", label: "Smirk", image: smirkingFace },
  { emoji: "😠", label: "Angry", image: angryFace },
  { emoji: "😢", label: "Crying", image: cryingFace },
  { emoji: "😳", label: "Flushed", image: flushedFace },
] as const;

export const defaultExpression = expressions[0];
