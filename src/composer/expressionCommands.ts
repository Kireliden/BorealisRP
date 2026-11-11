import { expressions } from "./expressions";

export const EXPRESSION_COMMANDS = [
  { command: "/neutral", label: "Neutral", expression: "Neutral" },
  { command: "/smile", label: "Smile", expression: "Smile" },
  { command: "/smirk", label: "Smirk", expression: "Smirk" },
  { command: "/angry", label: "Angry", expression: "Angry" },
  { command: "/cry", label: "Crying", expression: "Crying" },
  { command: "/flushed", label: "Flushed", expression: "Flushed" },
] as const;

const aliases: Record<string, string> = {
  cry: "Crying", crying: "Crying", sad: "Crying",
  blush: "Flushed", flushed: "Flushed",
  smile: "Smile", neutral: "Neutral", smirk: "Smirk",
  angry: "Angry", mad: "Angry",
};

export function resolveExpressionCommand(text: string) {
  const match = /^\/([a-z]+)$/i.exec(text.trim());
  if (!match) return null;
  const label = aliases[match[1].toLocaleLowerCase()];
  return expressions.find((expression) => expression.label === label) ?? null;
}

export function commandQuery(text: string): string | null {
  const match = /^\/([a-z]*)$/i.exec(text.trim());
  return match ? match[1].toLocaleLowerCase() : null;
}
