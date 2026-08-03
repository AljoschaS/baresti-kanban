import { useState } from "react";

// Unter der Team-Spalte: Tags verwalten (anzeigen, umbenennen, Farbe aendern,
// neue Tags erstellen). Tags mit "custom: true" (z.B. "Sonstiges") erlauben
// bei der Zuweisung zusaetzlich einen freien Text - das bleibt hier unangetastet.
export default function TagsColumn({ tags, onAddTag, onUpdateTag, onDeleteTag }) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#0052CC");

  const [editingKey, setEditingKey] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingColor, setEditingColor] = useState("#0052CC");

  function submitNewTag(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAddTag(newLabel.trim(), newColor);
    setNewLabel("");
    setNewColor("#0052CC");
    setAdding(false);
  }

  function startEdit(tag) {
    setEditingKey(tag.key);
    setEditingLabel(tag.label);
    setEditingColor(tag.color || "#0052CC");
  }

  function submitEdit(e) {
    e.preventDefault();
    if (!editingLabel.trim()) return;
    onUpdateTag(editingKey, { label: editingLabel.trim(), color: editingColor });
    setEditingKey(null);
  }

  return (
    <div className="list team-column tags-column">
      <div className="list-header">
        <h3>Tags</h3>
      </div>

      <div className="list-cards">
        {tags.map((tag) =>
          editingKey === tag.key ? (
            <form key={tag.key} className="add-card-form" onSubmit={submitEdit}>
              <input
                autoFocus
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
              />
              <div className="color-picker-row">
                <label>Farbe</label>
                <input
                  type="color"
                  value={editingColor}
                  onChange={(e) => setEditingColor(e.target.value)}
                />
              </div>
              <div className="add-card-actions">
                <button type="submit">Speichern</button>
                <button type="button" onClick={() => setEditingKey(null)}>
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div key={tag.key} className="user-card">
              <span className="tag-badge tag-badge-sm" style={{ background: tag.color }}>
                {tag.label}
              </span>
              <div className="user-card-actions">
                <button onClick={() => startEdit(tag)} aria-label="Tag bearbeiten">
                  Bearbeiten
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`Tag "${tag.label}" wirklich loeschen? Er wird von allen Projekten entfernt.`)) return;
                    onDeleteTag(tag.key);
                  }}
                  aria-label="Tag entfernen"
                >
                  x
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {adding ? (
        <form className="add-card-form" onSubmit={submitNewTag}>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Bezeichnung"
          />
          <div className="color-picker-row">
            <label>Farbe</label>
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          </div>
          <div className="add-card-actions">
            <button type="submit">Hinzufuegen</button>
            <button type="button" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setAdding(true)}>
          + Tag
        </button>
      )}
    </div>
  );
}
