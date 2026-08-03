import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTagDef } from "../tags";

// Ein einzelner, verschiebbarer Tag. Gehoert zu einem Projekt (cardId),
// zeigt zur Orientierung den Projektnamen klein mit an.
export default function TagToken({ token, tags, onDelete }) {
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

  return (
    <div className="tag-token" ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
