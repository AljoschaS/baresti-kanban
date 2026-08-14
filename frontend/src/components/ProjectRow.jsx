import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "./Card";
import StageCell from "./StageCell";
import DateCell from "./DateCell";

// Eine Projekt-Zeile. Ueber den Griff ganz links laesst sich die ganze
// Zeile per Drag & Drop neu einsortieren (analog zum Spalten-Griff).
export default function ProjectRow({
  card,
  stageLists,
  pinnedRightList,
  tokensFor,
  tags,
  users,
  onDeleteToken,
  onAssigneeChange,
  canArchiveCard,
  onArchive,
  onDeleteCard,
  onUpdateCard,
  onAddAttachment,
  onDeleteAttachment,
}) {
  // Eigenes "row-" Praefix (statt "card-"), weil Card.jsx selbst intern
  // ebenfalls ein (hier deaktiviertes) useSortable mit der id `card-${id}`
  // registriert - zwei Komponenten mit derselben Sortable-ID wuerden sich
  // innerhalb desselben DndContext in die Quere kommen.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `row-${card.id}`, data: { type: "row", cardId: card.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="swimlane-row" ref={setNodeRef} style={style}>
      <div
        className="row-drag-handle-cell"
        {...attributes}
        {...listeners}
        aria-label="Projekt-Zeile verschieben"
      >
        ⠿
      </div>
      <DateCell startDate={card.startDate} targetDate={card.targetDate} />
      <div className="swimlane-row-label">
        <Card
          card={card}
          users={users}
          tags={tags}
          onDelete={onDeleteCard}
          onUpdate={onUpdateCard}
          onAddAttachment={onAddAttachment}
          onDeleteAttachment={onDeleteAttachment}
          draggable={false}
        />
      </div>
      {stageLists.map((list) => (
        <StageCell
          key={list.id}
          cardId={card.id}
          list={list}
          tokens={tokensFor(card.id, list.id)}
          tags={tags}
          onDeleteToken={onDeleteToken}
          cardAssignees={card.assignees}
          users={users}
          onAssigneeChange={onAssigneeChange}
        />
      ))}
      {pinnedRightList && (
        <StageCell
          cardId={card.id}
          list={pinnedRightList}
          tokens={tokensFor(card.id, pinnedRightList.id)}
          tags={tags}
          onDeleteToken={onDeleteToken}
          showArchiveButton={canArchiveCard(card.id)}
          onArchive={onArchive}
          cardAssignees={card.assignees}
          users={users}
          onAssigneeChange={onAssigneeChange}
        />
      )}
      {/* Platzhalter unter der "+ Spalte"-Kopfzelle (jetzt ganz rechts,
          hinter "Umgesetzt"), damit die Spaltenbreiten ausgerichtet bleiben. */}
      <div className="swimlane-cell add-stage-filler-cell" />
    </div>
  );
}
