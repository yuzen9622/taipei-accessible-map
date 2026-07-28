/**
 * Maps an app/i18n language tag onto the `lang` values the place-search
 * endpoints accept.
 *
 * The backend schema only accepts `zh-*` / `en-*` tags and **400s on anything
 * else instead of falling back to Chinese**, so an unexpected i18n value (a
 * browser-detected "ja", say) would break search entirely. Returning
 * `undefined` for those omits the param, which the backend treats as zh-TW.
 */
export function toApiLang(language?: string): "zh-TW" | "en" | undefined {
  if (!language) return undefined;
  const tag = language.toLowerCase();
  if (tag === "zh" || tag.startsWith("zh-")) return "zh-TW";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return undefined;
}
