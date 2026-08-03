import { useState } from "react";
import { resolveFileUrl } from "../api";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Zeigt Web-Links und hochgeladene Dateien einer Karte an und erlaubt es,
// direkt (ohne in den Bearbeiten-Modus zu muessen) neue hinzuzufuegen oder
// zu entfernen.
export default function AttachmentList({ attachments, onAdd, onDelete, readOnly = false }) {
  const [addingLink, setAddingLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  function submitLink(e) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    onAdd({ type: "link", label: linkLabel.trim(), url });
    setLinkLabel("");
    setLinkUrl("");
    setAddingLink(false);
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await onAdd({ type: "file", dataUrl, fileName: file.name, mimeType: file.type });
    } catch (err) {
      alert("Datei konnte nicht hochgeladen werden: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="attachments" onPointerDown={(e) => e.stopPropagation()}>
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((att) => (
            <div key={att.id} className="attachment-item">
              <a
                href={att.type === "file" ? resolveFileUrl(att.url) : att.url}
                target="_blank"
                rel="noreferrer"
              >
                {att.type === "file" ? "📎" : "🔗"} {att.label}
              </a>
              {!readOnly && (
                <button onClick={() => onDelete(att.id)} aria-label="Anhang entfernen">
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (addingLink ? (
        <form className="add-card-form" onSubmit={submitLink}>
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
          />
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Beschriftung (optional)"
          />
          <div className="add-card-actions">
            <button type="submit">Hinzufuegen</button>
            <button type="button" onClick={() => setAddingLink(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <div className="attachment-actions">
          <button className="attachment-add-btn" onClick={() => setAddingLink(true)}>
            + Link
          </button>
          <label className="attachment-add-btn">
            {uploading ? "Laedt hoch..." : "+ Datei"}
            <input type="file" hidden disabled={uploading} onChange={handleFileSelected} />
          </label>
        </div>
      ))}
    </div>
  );
}
