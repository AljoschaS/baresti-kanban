import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTagDef } from "../tags";

// Ein einzelner, verschiebbarer Tag. Gehoert zu einem Projekt (cardId),
// zeigt zur Orientierung den Projektnamen klein mit an.
// cardAssignees/users: um dem Tag oben links einen der zugewiesenen
// Projekt-Personen zuordnen zu koennen (Haupt- und Nebenverantwortliche).
export default function TagToken({ token, tags, onDelete, cardAssignees, users, onAssigneeChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `token-${token.id}`, data: { type: "token", token } });

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
    </div>
  );
}
