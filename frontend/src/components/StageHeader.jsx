import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Kopfzellen-Titel einer Arbeits-Spalte (z.B. "Warte auf Kunden").
// Ueber den Griff lassen sich die Spalten untereinander neu anordnen.
export default function StageHeader({ list, onDeleteList }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `col-${list.id}`, data: { type: "list", listId: list.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="stage-header-cell" ref={setNodeRef} style={style}>
      <span className="list-drag-handle" {...attributes} {...listeners} aria-label="Spalte verschieben">
        ⠿
      </span>
      <span className="stage-title">{list.title}</span>
      {!list.protected && (
        <button className="list-delete" onClick={() => onDeleteList(list.id)} aria-label="Spalte loeschen">
          x
        </button>
      )}
    </div>
  );
}
