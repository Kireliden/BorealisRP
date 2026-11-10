/**
 * Public special-title registry.
 *
 * Redemption codes are Ed25519 signed by the project owner. ONLY the public
 * verification key lives in the repository. Never commit the private key or
 * personal redemption codes. A local/offline client can be modified, so this
 * protects genuine installations from trivial impersonation but is not DRM
 * or a server-enforced account identity.
 */
export type SpecialTitleId = "moon-developer" | "star-developer";
export type SpecialTitle = {
  id: SpecialTitleId;
  label: string;
  symbol: "moon" | "star";
  variant: "moon" | "star";
  /** Empty list permits a signed code issued for any display name. */
  reservedNames: readonly string[];
};
export const SPECIAL_TITLES: Record<SpecialTitleId, SpecialTitle> = {
  "moon-developer": {
    id: "moon-developer", label: "Moon Developer",
    symbol: "moon", variant: "moon", reservedNames: ["kire"],
  },
  "star-developer": {
    id: "star-developer", label: "Star Developer",
    symbol: "star", variant: "star", reservedNames: ["zero"],
  },
};

const PUBLIC_KEY = "_BNK2bdnqTCCNUbt-jDwxw1thHfzkBXtmW_XZgC-eEA";
const MAX_CODE_LENGTH = 2000;

export function normaliseTitleName(name: string): string {
  return name.trim().toLocaleLowerCase("en-GB");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid code encoding.");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

let verificationKey: Promise<CryptoKey> | null = null;
async function getVerificationKey(): Promise<CryptoKey> {
  verificationKey ??= crypto.subtle.importKey(
    "raw", decodeBase64Url(PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"],
  );
  return verificationKey;
}

/** Codes have the shape brd1.BASE64URL_JSON.ED25519_SIGNATURE. */
export async function verifySpecialTitleCode(
  code: string, displayName: string,
): Promise<SpecialTitle | null> {
  try {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length > MAX_CODE_LENGTH) return null;
    const parts = trimmed.split(".");
    if (parts.length !== 3 || parts[0] !== "brd1") return null;
    const [, payloadPart, signaturePart] = parts;
    const decoded: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
    if (!decoded || typeof decoded !== "object") return null;
    const claim = decoded as { v?: unknown; id?: unknown; subject?: unknown };
    if (claim.v !== 1 || typeof claim.id !== "string" || typeof claim.subject !== "string") return null;
    if (!Object.prototype.hasOwnProperty.call(SPECIAL_TITLES, claim.id)) return null;
    const title = SPECIAL_TITLES[claim.id as SpecialTitleId];
    const currentName = normaliseTitleName(displayName);
    if (!currentName || claim.subject !== currentName) return null;
    if (title.reservedNames.length && !title.reservedNames.includes(currentName)) return null;
    const key = await getVerificationKey();
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" }, key, decodeBase64Url(signaturePart),
      new TextEncoder().encode(payloadPart),
    );
    return valid ? title : null;
  } catch {
    return null;
  }
}

export async function verifiedSpecialTitles(
  displayName: string, unlocked: Record<string, string>,
): Promise<SpecialTitle[]> {
  const matches = await Promise.all(
    Object.values(unlocked).map((code) => verifySpecialTitleCode(code, displayName)),
  );
  return matches.filter((title): title is SpecialTitle => title !== null);
}
