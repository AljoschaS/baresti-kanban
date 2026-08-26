import { useState } from "react";
import { createPortal } from "react-dom";
import { resolveFileUrl } from "../api";
import { usePopoverPosition } from "../usePopoverPosition";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.3-2.3a2.6 2.6 0 0 0-3.7-3.7l-1 1M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.4 8.9a2.6 2.6 0 0 0 3.7 3.7l1-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 1.8H4.6a1.2 1.2 0 0 0-1.2 1.2v10a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.3L9 1.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 1.8v3.5h3.6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

// Ein Dropdown fuer eine Anhang-Art (Links bzw. Dateien): Button mit Icon,
// Beschriftung und - sobald etwas hinterlegt ist - einer kleinen Anzahl-Badge.
// Der Inhalt (Liste + Hinzufuegen-Bereich) wird als Popover geoeffnet, damit
// die Projektzeile nicht durch lange Anhang-Listen in die Hoehe gezogen wird.
function AttachmentDropdown({ label, icon, items, count, onDelete, readOnly, children, emptyHint }) {
  const { open, openAt, close, triggerRef, panelRef, panelStyle } = usePopoverPosition();

  // In der Nur-Lese-Ansicht (Archiv) gibt es nichts hinzuzufuegen - ein
  // leeres Dropdown waere dort nur unnoetiges Beiwerk.
  if (readOnly && count === 0) return null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={"attachment-add-btn attachment-dropdown-btn" + (count > 0 ? " has-items" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (open) close();
          else openAt();
        }}
        title={label}
      >
        {icon}
        {label}
        {count > 0 && <span className="attachment-count">{count}</span>}
      </button>
      {open &&
        panelStyle &&
        createPortal(
          <div
            className="attachment-panel"
            ref={panelRef}
            style={panelStyle}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {items.length > 0 ? (
              <div className="attachment-list">
                {items.map((att) => (
                  <div key={att.id} className="attachment-item">
                    <a
                      href={att.type === "file" ? resolveFileUrl(att.url) : att.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {att.label}
                    </a>
                    {!readOnly && (
                      <button onClick={() => onDelete(att.id)} aria-label="Anhang entfernen">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="attachment-empty">{emptyHint}</div>
            )}
            {!readOnly && <div className="attachment-panel-add">{children}</div>}
          </div>,
          document.body
        )}
    </>
  );
}

// Zeigt Web-Links und hochgeladene Dateien einer Karte an und erlaubt es,
// direkt (ohne in den Bearbeiten-Modus zu muessen) neue hinzuzufuegen oder
// zu entfernen. Beides steckt jeweils in einem eigenen Dropdown mit
// Anzahl-Badge (analog zu den Kundendaten).
export default function AttachmentList({ attachments, onAdd, onDelete, readOnly = false, extraAction = null }) {
  const [addingLink, setAddingLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const links = attachments.filter((a) => a.type === "link");
  const files = attachments.filter((a) => a.type === "file");

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
      <div className="attachment-actions">
        <AttachmentDropdown
          label="Link"
          icon={<LinkIcon />}
          items={links}
          count={links.length}
          onDelete={onDelete}
          readOnly={readOnly}
          emptyHint="Noch keine Links hinterlegt"
        >
          {addingLink ? (
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
            <button type="button" className="attachment-add-btn" onClick={() => setAddingLink(true)}>
              + Link hinzufuegen
            </button>
          )}
        </AttachmentDropdown>

        <AttachmentDropdown
          label="Datei"
          icon={<FileIcon />}
          items={files}
          count={files.length}
          onDelete={onDelete}
          readOnly={readOnly}
          emptyHint="Noch keine Dateien hinterlegt"
        >
          <label className="attachment-add-btn">
            {uploading ? "Laedt hoch..." : "+ Datei hochladen"}
            <input type="file" hidden disabled={uploading} onChange={handleFileSelected} />
          </label>
        </AttachmentDropdown>

        {extraAction}
      </div>
    </div>
  );
}
