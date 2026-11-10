import { useEffect, useState } from "react";
import type { AppPreferences } from "../preferences/types";
import { SPECIAL_TITLES, verifySpecialTitleCode, type SpecialTitle, type SpecialTitleId } from "./specialTitles";

type Profile = AppPreferences["profile"];

/** Never display a title until its signed voucher and reserved name are verified. */
export function useActiveSpecialTitle(profile: Profile): SpecialTitle | null {
  const [verified, setVerified] = useState<{ key: string; title: SpecialTitle | null } | null>(null);
  const id = profile.activeSpecialTitleId;
  const code = id ? profile.specialTitleCodes[id] ?? "" : "";
  const key = `${profile.displayName}\u0000${id ?? ""}\u0000${code}`;
  useEffect(() => {
    let cancelled = false;
    if (!profile.showSpecialTitle || !id || !code || !(id in SPECIAL_TITLES)) return;
    void verifySpecialTitleCode(code, profile.displayName).then((title) => {
      if (!cancelled) setVerified({ key, title: title?.id === id ? title : null });
    });
    return () => { cancelled = true; };
  }, [code, id, key, profile.displayName, profile.showSpecialTitle]);
  return profile.showSpecialTitle && verified?.key === key ? verified.title : null;
}
