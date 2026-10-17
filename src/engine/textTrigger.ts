
/**
 * Returns the text currently being edited by an input target,
 * or null when the event did not originate from an editable field.
 */
export function getEditableText(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value;
  }

  const editableElement = target.closest<HTMLElement>(
    '[contenteditable="true"]',
  );

  return editableElement?.textContent ?? null;
}

/**
 * Checks whether editable text contains a trigger phrase,
 * ignoring differences in letter casing.
 */
export function containsTriggerPhrase(
  text: string,
  phrase: string,
): boolean {
  const normalisedPhrase = phrase.trim().toLocaleLowerCase();

  if (!normalisedPhrase) {
    return false;
  }

  return text.toLocaleLowerCase().includes(normalisedPhrase);
}
