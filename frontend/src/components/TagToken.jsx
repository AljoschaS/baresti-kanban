import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTagDef } from "../tags";

// Sprechblase: gefuellt/deutlich sichtbar sobald eine Notiz hinterlegt ist,
// als reines Umriss-Icon wenn (noch) leer.
function NoteBubbleIcon({ filled }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 3.2c0-.66.54-1.2 1.2-1.2h9.6c.66 0 1.2.54 1.2 1.2v6.1c0 .66-.54 1.2-1.2 1.2H6.9L4 13.3v-2.8H3.2C2.54 10.5 2 9.96 2 9.3V3.2Z"
        fill={filled ? "#ffffff" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M4.6 5.2h6.8M4.6 7.4h4.4"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// Ein einzelner, verschiebbarer Tag. Gehoert zu einem Projekt (cardId),
// zeigt zur Orientierung den Projektnamen klein mit an.
// cardAssignees/users: um dem Tag oben links einen der zugewiesenen
// Projekt-Personen zuordnen zu koennen (Haupt- und Nebenverantwortliche).
// onNoteChange: um dem Tag eine freie Notiz/Bemerkung hinzuzufuegen.
export default function TagToken({ token, tags, onDelete, cardAssignees, users, onAssigneeChange, onNoteChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `token-${token.id}`, data: { type: "token", token } });

  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(token.note || "");
  const panelRef = useRef(null);

  useEffect(() => {
    if (!noteOpen) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closeAndSave();
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") closeAndSave();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteOpen, draftNote]);

  function closeAndSave() {
    setNoteOpen(false);
    if (draftNote !== (token.note || "")) {
      onNoteChange?.(token.id, draftNote);
    }
  }

  function openNote(e) {
    e.stopPropagation();
    setDraftNote(token.note || "");
    setNoteOpen(true);
  }

  const def = getTagDef(tags, token.tagKey);
  const color = def?.color || "#999";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: color,
  };

  const assignableUsers = (cardAssignees || [])
    .map((id) => (users || []).find((u) => u.id === id))
    .filter(Boolean);
  const assignedUser = assignableUsers.find((u) => u.id === token.assigneeId) || null;
  const showAssignee = onAssigneeChange && assignableUsers.length > 0;
  const hasNote = Boolean(token.note && token.note.trim());

  return (
    <div className="tag-token" ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {showAssignee && (
        <div className="tag-token-assignee" onPointerDown={(e) => e.stopPropagation()}>
          {assignedUser?.avatar ? (
            <img className="tag-token-assignee-avatar" src={assignedUser.avatar} alt="" />
          ) : (
            <span
              className="tag-token-assignee-dot"
              style={{ background: assignedUser ? assignedUser.color : "rgba(255,255,255,0.25)" }}
            >
              {assignedUser ? assignedUser.name.charAt(0).toUpperCase() : ""}
            </span>
          )}
          <select
            className="tag-token-assignee-select"
            value={token.assigneeId ?? ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              onAssigneeChange(token.id, val === "" ? null : Number(val));
            }}
            aria-label="Zustaendige Person fuer diesen Tag"
          >
            <option value="">–</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="tag-token-label">{token.tagLabel}</div>
      {token.projectTitle && (
        <div className="tag-token-project">{token.projectTitle}</div>
      )}
      {onNoteChange && (
        <button
          className={"tag-token-note-btn" + (hasNote ? " has-note" : "")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={openNote}
          title={hasNote ? token.note : "Notiz hinzufuegen"}
          aria-label="Notiz zu diesem Tag"
        >
          <NoteBubbleIcon filled={hasNote} />
        </button>
      )}
      <button
        className="tag-token-delete"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(token.id);
        }}
        aria-label="Tag entfernen"
      >
        x
      </button>
      {noteOpen && (
        <div
          className="tag-token-note-panel"
          ref={panelRef}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Notiz..."
            rows={3}
          />
          <div className="tag-token-note-actions">
            <button type="button" className="tag-token-note-save" onClick={closeAndSave}>
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
