/**
 * pickDialectAudio(entity, dialect) — resolve the correct audio URL for
 * the given dialect, with graceful fallback to the legacy single-URL
 * shape.
 *
 * Supported entity shapes (checked in order):
 *
 *   1) ``entity[`audio${dialect}`]``       → per-dialect suffixed field.
 *                                             E.g. ``word.audioRP`` /
 *                                                  ``word.audioAmE``.
 *   2) ``entity.audio[dialect]``           → nested per-dialect dict
 *                                             (matches the ``phoneme.audio.AmE.isolated``
 *                                             shape used at the card root).
 *   3) ``entity.audio``                    → legacy single-URL field
 *                                             (assumed AmE recording).
 *
 * Fallback: if the requested dialect has no track, the OTHER dialect is
 * returned (better broken-flag playback than silence).
 *
 * @param {object} entity  — commonWord entry or mnemonic object.
 * @param {'AmE'|'RP'} dialect
 * @returns {string|null}
 */
export function pickDialectAudio(entity, dialect) {
  if (!entity) return null;
  const other = dialect === 'RP' ? 'AmE' : 'RP';

  // 1) Suffixed field: audioRP / audioAmE
  const suffixed = entity[`audio${dialect}`];
  if (suffixed && typeof suffixed === 'string') return suffixed;

  // 2) Nested dict: audio.RP / audio.AmE (string or {isolated: string})
  const a = entity.audio;
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    const branch = a[dialect];
    if (typeof branch === 'string' && branch) return branch;
    if (branch && typeof branch === 'object' && branch.isolated) return branch.isolated;
    // fallback to other dialect
    const otherBranch = a[other];
    if (typeof otherBranch === 'string' && otherBranch) return otherBranch;
    if (otherBranch && typeof otherBranch === 'object' && otherBranch.isolated) return otherBranch.isolated;
  }

  // 3) Legacy single-URL field on entity
  const legacy = entity.audio;
  if (typeof legacy === 'string' && legacy) return legacy;

  // 4) Suffixed fallback in the OTHER dialect
  const otherSuffixed = entity[`audio${other}`];
  if (typeof otherSuffixed === 'string' && otherSuffixed) return otherSuffixed;

  return null;
}

export default pickDialectAudio;
