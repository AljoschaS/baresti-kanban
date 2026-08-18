import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTagDef } from "../tags";

function NoteIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 3.5h12M2 7h12M2 10.5h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
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
          <NoteIcon />
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
