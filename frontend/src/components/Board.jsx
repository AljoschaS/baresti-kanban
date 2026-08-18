import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import StageHeader from "./StageHeader";
import FixedStageHeader from "./FixedStageHeader";
import ProjectRow from "./ProjectRow";
import TagPicker from "./TagPicker";
import UserPicker from "./UserPicker";
import { api } from "../api";
import { cardToItem, tokenToItem } from "../boardUtils";
import { matchesResponsibleFilter, matchesTitleFilter } from "../filterUtils";
import { getTagDef } from "../tags";

export default function Board({
  lists,
  setLists,
  users,
  tags,
  onProjectArchived,
  titleFilter = "",
  mainFilter = "",
  secondaryFilter = "",
}) {
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectTags, setNewProjectTags] = useState([]);
  const [newProjectAssignees, setNewProjectAssignees] = useState([]);
  const [newProjectTargetDate, setNewProjectTargetDate] = useState("");

  // Fuer die DragOverlay: waehrend des Ziehens bleibt so ein sichtbares
  // Abbild des Tags/der Spalte staendig am Mauszeiger, statt erst beim
  // Loslassen "reinzuspringen".
  const [activeToken, setActiveToken] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [activeRow, setActiveRow] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const projectList = lists.find((l) => l.protected);
  // Fixierte Spalten (z.B. "Umgesetzt") sind nicht Teil der sortierbaren
  // Arbeits-Spalten - sie werden separat und immer ganz am Ende gerendert.
  const pinnedRightList = lists.find((l) => l.pinnedRight);
  const stageLists = lists
    .filter((l) => !l.protected && !l.pinnedRight)
    .sort((a, b) => a.position - b.position);
  const projectCards = projectList
    ? projectList.items.filter((it) => it.type === "card").sort((a, b) => a.position - b.position)
    : [];
  const visibleProjectCards = projectCards.filter(
    (card) =>
      matchesTitleFilter(card.title, titleFilter) &&
      matchesResponsibleFilter(card.assignees, users, mainFilter, secondaryFilter)
  );

  function tokensFor(cardId, listId) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return [];
    return list.items
      .filter((it) => it.type === "token" && it.cardId === cardId)
      .sort((a, b) => a.position - b.position);
  }

  // Ein Projekt darf archiviert werden, sobald es mindestens einen Tag hat
  // und ALLE seine Tags in der fixierten "Umgesetzt"-Spalte liegen.
  function canArchiveCard(cardId) {
    if (!pinnedRightList) return false;
    const allTokens = lists.flatMap((l) =>
      l.items.filter((it) => it.type === "token" && it.cardId === cardId)
    );
    if (allTokens.length === 0) return false;
    return allTokens.every((t) => t.listId === pinnedRightList.id);
  }

  function findTokenLocation(domId) {
    for (const list of lists) {
      const item = list.items.find((it) => it.domId === domId);
      if (item && item.type === "token") return { listId: list.id, cardId: item.cardId };
    }
    return null;
  }

  async function persistCellOrder(listId, tokens) {
    await Promise.all(
      tokens.map((t, index) => api.updateToken(t.id, { listId, position: index }))
    );
  }

  async function persistListPositions(orderedLists) {
    await Promise.all(
      orderedLists.map((l, index) => api.updateList(l.id, { position: index }))
    );
  }

  async function persistCardPositions(orderedCards) {
    await Promise.all(
      orderedCards.map((c, index) => api.updateCard(c.id, { position: index }))
    );
  }

  function resolveStageListIdFromOverId(overId) {
    if (String(overId).startsWith("col-")) return Number(String(overId).replace("col-", ""));
    return null;
  }

  function handleColumnDragEnd(active, over) {
    const activeListId = Number(String(active.id).replace("col-", ""));
    const overListId = resolveStageListIdFromOverId(over.id);
    if (overListId == null || overListId === activeListId) return;

    const oldIndex = lists.findIndex((l) => l.id === activeListId);
    const newIndex = lists.findIndex((l) => l.id === overListId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(lists, oldIndex, newIndex);
    setLists(reordered);
    persistListPositions(reordered);
  }

  function handleRowDragEnd(active, over) {
    const activeCardId = Number(String(active.id).replace("row-", ""));
    const overCardId = Number(String(over.id).replace("row-", ""));
    if (activeCardId === overCardId) return;

    const oldIndex = projectCards.findIndex((c) => c.id === activeCardId);
    const newIndex = projectCards.findIndex((c) => c.id === overCardId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(projectCards, oldIndex, newIndex);

    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== projectList.id) return l;
        const nonCardItems = l.items.filter((it) => it.type !== "card");
        const reorderedItems = reordered.map((c, index) => ({ ...c, position: index }));
        return { ...l, items: [...nonCardItems, ...reorderedItems] };
      })
    );
    persistCardPositions(reordered);
  }

  function handleTokenDragEnd(active, over) {
    const activeDomId = active.id;
    const overId = over.id;

    const source = findTokenLocation(activeDomId);
    if (!source) return;

    let destCardId;
    let destListId;

    if (String(overId).startsWith("cell-")) {
      const parts = String(overId).split("-");
      destCardId = Number(parts[1]);
      destListId = Number(parts[2]);
    } else {
      const dest = findTokenLocation(overId);
      if (!dest) return;
      destCardId = dest.cardId;
      destListId = dest.listId;
    }

    // Tags gehoeren fest zu ihrem Projekt: nur Verschieben innerhalb derselben Zeile erlaubt.
    if (destCardId !== source.cardId) return;

    setLists((prev) => {
      const next = prev.map((l) => ({ ...l, items: [...l.items] }));
      const fromList = next.find((l) => l.id === source.listId);
      const movingIndex = fromList.items.findIndex((it) => it.domId === activeDomId);
      const [moving] = fromList.items.splice(movingIndex, 1);
      moving.listId = destListId;

      const toList = next.find((l) => l.id === destListId);
      let insertIndex;
      if (String(overId).startsWith("cell-")) {
        insertIndex = toList.items.length;
      } else {
        insertIndex = toList.items.findIndex((it) => it.domId === overId);
        if (insertIndex === -1) insertIndex = toList.items.length;
      }
      toList.items.splice(insertIndex, 0, moving);

      const affectedTokens = toList.items.filter(
        (it) => it.type === "token" && it.cardId === destCardId
      );
      persistCellOrder(toList.id, affectedTokens);
      if (fromList.id !== toList.id) {
        const fromTokens = fromList.items.filter(
          (it) => it.type === "token" && it.cardId === source.cardId
        );
        persistCellOrder(fromList.id, fromTokens);
      }
      return next;
    });
  }

  function handleDragStart(event) {
    const { active } = event;
    if (active.data.current?.type === "list") {
      setActiveColumn(lists.find((l) => l.id === active.data.current.listId) || null);
      setActiveToken(null);
      setActiveRow(null);
      return;
    }
    if (active.data.current?.type === "row") {
      setActiveRow(projectCards.find((c) => c.id === active.data.current.cardId) || null);
      setActiveToken(null);
      setActiveColumn(null);
      return;
    }
    const loc = findTokenLocation(active.id);
    const list = loc && lists.find((l) => l.id === loc.listId);
    const token = list?.items.find((it) => it.domId === active.id);
    setActiveToken(token || null);
    setActiveColumn(null);
    setActiveRow(null);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveToken(null);
    setActiveColumn(null);
    setActiveRow(null);
    if (!over) return;

    if (active.data.current?.type === "list") {
      handleColumnDragEnd(active, over);
      return;
    }
    if (active.data.current?.type === "row") {
      handleRowDragEnd(active, over);
      return;
    }
    handleTokenDragEnd(active, over);
  }

  function handleDragCancel() {
    setActiveToken(null);
    setActiveColumn(null);
    setActiveRow(null);
  }

  async function handleAddCard(listId, title, tags, assignees, extra = {}) {
    const { card, tokens = [] } = await api.createCard(listId, title, { tags, assignees, ...extra });
    setLists((prev) =>
      prev.map((l) => {
        let items = l.items;
        if (l.id === card.listId) items = [...items, cardToItem(card)];
        const listTokens = tokens.filter((t) => t.listId === l.id);
        if (listTokens.length) {
          items = [
            ...items,
            ...listTokens.map((t) => tokenToItem({ ...t, projectTitle: card.title })),
          ];
        }
        return items === l.items ? l : { ...l, items };
      })
    );
  }

  async function handleUpdateCard(cardId, data) {
    const { card, tokens = [] } = await api.updateCard(cardId, data);
    setLists((prev) =>
      prev.map((l) => {
        let items = l.items.map((it) =>
          it.type === "card" && it.id === cardId ? { ...it, ...card } : it
        );
        const listTokens = tokens.filter((t) => t.listId === l.id);
        if (listTokens.length) {
          items = [
            ...items,
            ...listTokens.map((t) => tokenToItem({ ...t, projectTitle: card.title })),
          ];
        }
        return { ...l, items };
      })
    );
  }

  async function handleDeleteCard(cardId) {
    await api.deleteCard(cardId);
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.filter(
          (it) => !((it.type === "card" && it.id === cardId) || (it.type === "token" && it.cardId === cardId))
        ),
      }))
    );
  }

  async function handleArchiveCard(cardId) {
    const card = projectCards.find((c) => c.id === cardId);
    const title = card ? card.title : "dieses Projekt";
    if (!confirm(`"${title}" wirklich archivieren? Es wird vom Board entfernt.`)) return;
    try {
      const archived = await api.archiveCard(cardId);
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          items: l.items.filter(
            (it) => !((it.type === "card" && it.id === cardId) || (it.type === "token" && it.cardId === cardId))
          ),
        }))
      );
      onProjectArchived?.(archived);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteToken(tokenId) {
    await api.deleteToken(tokenId);
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.filter((it) => !(it.type === "token" && it.id === tokenId)),
      }))
    );
  }

  async function handleAssigneeChange(tokenId, assigneeId) {
    try {
      await api.updateToken(tokenId, { assigneeId });
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          items: l.items.map((it) =>
            it.type === "token" && it.id === tokenId ? { ...it, assigneeId } : it
          ),
        }))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleNoteChange(tokenId, note) {
    try {
      const updated = await api.updateToken(tokenId, { note });
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          items: l.items.map((it) =>
            it.type === "token" && it.id === tokenId ? { ...it, note: updated.note } : it
          ),
        }))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddAttachment(cardId, data) {
    const attachment = await api.addAttachment(cardId, data);
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.map((it) =>
          it.type === "card" && it.id === cardId
            ? { ...it, attachments: [...(it.attachments || []), attachment] }
            : it
        ),
      }))
    );
  }

  async function handleDeleteAttachment(attachmentId) {
    await api.deleteAttachment(attachmentId);
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.map((it) =>
          it.type === "card" && it.attachments
            ? { ...it, attachments: it.attachments.filter((a) => a.id !== attachmentId) }
            : it
        ),
      }))
    );
  }

  async function handleDeleteList(listId) {
    if (!confirm("Spalte inklusive aller Tags darin wirklich loeschen?")) return;
    try {
      await api.deleteList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (err) {
      alert(err.message);
    }
  }

  async function submitNewList(e) {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    const list = await api.createList(newListTitle.trim());
    setLists((prev) => [...prev, { ...list, items: [] }]);
    setNewListTitle("");
    setAddingList(false);
  }

  async function submitNewProject(e) {
    e.preventDefault();
    if (!newProjectTitle.trim() || !projectList) return;
    await handleAddCard(projectList.id, newProjectTitle.trim(), newProjectTags, newProjectAssignees, {
      description: newProjectDescription,
      targetDate: newProjectTargetDate || null,
    });
    setNewProjectTitle("");
    setNewProjectDescription("");
    setNewProjectTags([]);
    setNewProjectAssignees([]);
    setNewProjectTargetDate("");
    setAddingProject(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="swimlane-scroll">
        <div className="swimlane-header">
          <div className="row-drag-handle-header" />
          <div className="date-header-cell">Start / Ziel</div>
          <div className="swimlane-row-label-header">Projekte</div>
          <SortableContext items={stageLists.map((l) => `col-${l.id}`)} strategy={horizontalListSortingStrategy}>
            {stageLists.map((list) => (
              <StageHeader key={list.id} list={list} onDeleteList={handleDeleteList} />
            ))}
          </SortableContext>
          {pinnedRightList && <FixedStageHeader list={pinnedRightList} />}
          <div className="stage-header-cell add-stage-cell">
            {addingList ? (
              <form onSubmit={submitNewList}>
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Titel der Spalte"
                />
                <div className="add-card-actions">
                  <button type="submit">OK</button>
                  <button type="button" onClick={() => setAddingList(false)}>
                    X
                  </button>
                </div>
              </form>
            ) : (
              <button className="add-list-btn" onClick={() => setAddingList(true)}>
                + Spalte
              </button>
            )}
          </div>
        </div>

        <div className="swimlane-body">
          <SortableContext
            items={visibleProjectCards.map((c) => `row-${c.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {visibleProjectCards.map((card) => (
              <ProjectRow
                key={card.id}
                card={card}
                stageLists={stageLists}
                pinnedRightList={pinnedRightList}
                tokensFor={tokensFor}
                tags={tags}
                users={users}
                onDeleteToken={handleDeleteToken}
                onAssigneeChange={handleAssigneeChange}
                onNoteChange={handleNoteChange}
                canArchiveCard={canArchiveCard}
                onArchive={handleArchiveCard}
                onDeleteCard={handleDeleteCard}
                onUpdateCard={handleUpdateCard}
                onAddAttachment={handleAddAttachment}
                onDeleteAttachment={handleDeleteAttachment}
              />
            ))}
          </SortableContext>

          {visibleProjectCards.length === 0 && (titleFilter.trim() || mainFilter.trim() || secondaryFilter.trim()) && (
            <div className="filter-empty-hint">Keine Projekte gefunden, die zum Filter passen.</div>
          )}

          <div className="swimlane-row swimlane-add-row">
            <div className="row-drag-handle-cell row-drag-handle-cell-empty" />
            <div className="date-cell" />
            <div className="swimlane-row-label">
              {addingProject ? (
                <form className="add-card-form" onSubmit={submitNewProject}>
                  <input
                    autoFocus
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Projektname"
                  />
                  <textarea
                    className="edit-desc-input"
                    placeholder="Beschreibung (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                  <TagPicker tags={tags} selectedTags={newProjectTags} onChange={setNewProjectTags} />
                  <UserPicker users={users} selectedIds={newProjectAssignees} onChange={setNewProjectAssignees} />
                  <div className="target-date-row">
                    <label htmlFor="new-project-target-date">Ziel-Datum</label>
                    <input
                      id="new-project-target-date"
                      type="date"
                      value={newProjectTargetDate}
                      onChange={(e) => setNewProjectTargetDate(e.target.value)}
                    />
                  </div>
                  <div className="add-card-actions">
                    <button type="submit">Hinzufuegen</button>
                    <button type="button" onClick={() => setAddingProject(false)}>
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : (
                <button className="add-card-btn" onClick={() => setAddingProject(true)}>
                  + Projekt
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {activeToken && (
          <div
            className="tag-token tag-token-overlay"
            style={{ background: getTagDef(tags, activeToken.tagKey)?.color || "#999" }}
          >
            <div className="tag-token-label">{activeToken.tagLabel}</div>
            {activeToken.projectTitle && (
              <div className="tag-token-project">{activeToken.projectTitle}</div>
            )}
          </div>
        )}
        {activeColumn && (
          <div className="stage-header-cell stage-header-overlay">
            <span className="list-drag-handle">⠿</span>
            <span className="stage-title">{activeColumn.title}</span>
          </div>
        )}
        {activeRow && (
          <div className="row-drag-overlay">
            <span className="row-drag-handle-cell">⠿</span>
            <span className="row-drag-overlay-title">{activeRow.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
