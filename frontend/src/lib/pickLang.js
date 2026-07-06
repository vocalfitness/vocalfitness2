/**
 * pickLang(value, lang, fallbackLang = 'en')
 *
 * Return the string value for the current language from a bilingual
 * object of the shape ``{ it, en }``. Falls back gracefully:
 *
 *   • If ``value`` is a string → returned as-is (backwards-compat with
 *     legacy single-language records).
 *   • If ``value[lang]`` exists → returned.
 *   • Otherwise → ``value[fallbackLang]`` or the first non-empty entry
 *     or an empty string.
 *
 * Usage:
 *   const { language } = useLanguage();
 *   <p>{pickLang(muscle.detail, language)}</p>
 */
export function pickLang(value, lang, fallbackLang = 'en') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);
  if (value[lang]) return value[lang];
  if (value[fallbackLang]) return value[fallbackLang];
  const first = Object.values(value).find((v) => typeof v === 'string' && v.trim());
  return first || '';
}

export default pickLang;
