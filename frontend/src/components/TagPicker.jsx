// Mehrfachauswahl: mehrere Tags koennen gleichzeitig einem Projekt
// zugewiesen werden. "selectedTags" ist ein Array aus {tagKey, tagLabel}.
// "tags" sind die aktuell verwalteten Tag-Definitionen (siehe TagsColumn).
export default function TagPicker({ tags, selectedTags, onChange }) {
  const isSelected = (key) => selectedTags.some((t) => t.tagKey === key);
  const getLabel = (key) => selectedTags.find((t) => t.tagKey === key)?.tagLabel || "";

  function toggle(tag) {
    if (isSelected(tag.key)) {
      onChange(selectedTags.filter((t) => t.tagKey !== tag.key));
    } else {
      onChange([...selectedTags, { tagKey: tag.key, tagLabel: tag.custom ? "" : tag.label }]);
    }
  }

  function setCustomLabel(key, label) {
    onChange(selectedTags.map((t) => (t.tagKey === key ? { ...t, tagLabel: label } : t)));
  }

  const selectedCustomTags = tags.filter((tag) => tag.custom && isSelected(tag.key));

  return (
    <div className="tag-picker">
      <div className="tag-options">
        {tags.map((tag) => {
          const selected = isSelected(tag.key);
          return (
            <button
              type="button"
              key={tag.key}
              className={"tag-option" + (selected ? " selected" : "")}
              style={{
                borderColor: tag.color,
                background: selected ? tag.color : "transparent",
                color: selected ? "#fff" : tag.color,
              }}
              onClick={() => toggle(tag)}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
      {selectedCustomTags.map((tag) => (
        <input
          key={tag.key}
          className="tag-custom-input"
          placeholder={`Eigene Bezeichnung fuer "${tag.label}"`}
          value={getLabel(tag.key)}
          onChange={(e) => setCustomLabel(tag.key, e.target.value)}
        />
      ))}
    </div>
  );
}
