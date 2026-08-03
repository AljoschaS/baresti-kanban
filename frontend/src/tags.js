// Tag-Definitionen (Name/Farbe) werden jetzt vom Backend verwaltet (siehe
// TagsColumn) und als "tags"-Array durchgereicht statt hier fest zu stehen.
// "custom: true" bedeutet: bei der Zuweisung kann zusaetzlich ein freier
// Text hinterlegt werden (z.B. bei "Sonstiges").

export function getTagDef(tags, tagKey) {
  return (tags || []).find((t) => t.key === tagKey) || null;
}

// Anzeigetext eines einzelnen zugewiesenen Tags ({tagKey, tagLabel}):
// bei custom-Tags der individuelle Text (falls gesetzt), sonst der feste Label-Text.
export function getTagDisplay(tags, tag) {
  const def = getTagDef(tags, tag.tagKey);
  if (!def) return null;
  const text = def.custom && tag.tagLabel ? tag.tagLabel : def.label;
  return { text, color: def.color };
}
