import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import TagToken from "./TagToken";

// Eine Zelle in der Zeilen-Ansicht: die Tags eines bestimmten Projekts,
// die aktuell in dieser Arbeits-Spalte stehen. Tags koennen per Drag&Drop
// nur innerhalb derselben Projekt-Zeile in andere Zellen verschoben werden.
// In der fixierten "Umgesetzt"-Spalte kann zusaetzlich ein "Archivieren"-Button
// erscheinen, sobald alle Tags des Projekts hier angekommen sind.
export default function StageCell({ cardId, list, tokens, tags, onDeleteToken, showArchiveButton, onArchive, cardAssignees, users, onAssigneeChange }) {
  const { setNodeRef } = useDroppable({
    id: `cell-${cardId}-${list.id}`,
    data: { type: "cell", cardId, listId: list.id },
  });

  const tokenIds = tokens.map((t) => t.domId);

  return (
    <div className={"swimlane-cell" + (showArchiveButton ? " swimlane-cell-archivable" : "")} ref={setNodeRef}>
      <div className="swimlane-cell-tags">
        <SortableContext items={tokenIds} strategy={rectSortingStrategy}>
          {tokens.map((token) => (
            <TagToken
              key={token.domId}
              token={token}
              tags={tags}
              onDelete={onDeleteToken}
              cardAssignees={cardAssignees}
              users={users}
              onAssigneeChange={onAssigneeChange}
            />
          ))}
        </SortableContext>
      </div>
      {showArchiveButton && (
        <button className="archive-btn" onClick={() => onArchive(cardId)}>
          Archivieren
        </button>
      )}
    </div>
  );
}
