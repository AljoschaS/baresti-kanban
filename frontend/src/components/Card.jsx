import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTagDisplay } from "../tags";
import TagPicker from "./TagPicker";
import UserPicker from "./UserPicker";
import AttachmentList from "./AttachmentList";
import CustomerInfoPopover from "./CustomerInfoPopover";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 4h12M6.3 4V2.5a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V4M3.4 4l.6 8.6a1 1 0 0 0 1 .9h5.9a1 1 0 0 0 1-.9L12.6 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "tags" hier sind die aktuell verwalteten Tag-Definitionen (Name/Farbe,
// siehe TagsColumn) - nicht zu verwechseln mit den auf DIESER Karte
// zugewiesenen Tags (card.tags / lokaler "cardTags"-State).
export default function Card({ card, users, tags, onDelete, onUpdate, onAddAttachment, onDeleteAttachment, draggable = true }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [cardTags, setCardTags] = useState(card.tags || []);
  const [assignees, setAssignees] = useState(card.assignees || []);
  const [targetDate, setTargetDate] = useState(card.targetDate || "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card-${card.id}`, data: { type: "card", card }, disabled: editing || !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignedUsers = (card.assignees || [])
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  function startEdit(e) {
    e.stopPropagation();
    setTitle(card.title);
    setDescription(card.description || "");
    setCardTags(card.tags || []);
    setAssignees(card.assignees || []);
    setTargetDate(card.targetDate || "");
    setEditing(true);
  }

  function save(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onUpdate(card.id, { title: title.trim(), description, tags: cardTags, assignees, targetDate: targetDate || null });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="card card-editing">
        <form onSubmit={save}>
          <input
            autoFocus
            className="edit-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="edit-desc-input"
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TagPicker tags={tags} selectedTags={cardTags} onChange={setCardTags} />
          <UserPicker users={users} selectedIds={assignees} onChange={setAssignees} />
          <div className="target-date-row">
            <label htmlFor={`target-date-${card.id}`}>Ziel-Datum</label>
            <input
              id={`target-date-${card.id}`}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="add-card-actions">
            <button type="submit">Speichern</button>
            <button type="button" onClick={() => setEditing(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    );
  }

  const [firstUser, ...restUsers] = assignedUsers;

  return (
    <div
      className={"card" + (draggable ? "" : " card-static")}
      ref={setNodeRef}
      style={style}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      <button
        className="card-delete-icon"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (!confirm(`Projekt "${card.title}" wirklich loeschen? Das kann nicht rueckgaengig gemacht werden.`)) return;
          onDelete(card.id);
        }}
        aria-label="Projekt loeschen"
        title="Projekt loeschen"
      >
        <TrashIcon />
      </button>
      {firstUser ? (
        <div className="card-header">
          {firstUser.avatar ? (
            <img
              className="avatar card-avatar-lg"
              src={firstUser.avatar}
              width={60}
              height={60}
              style={{ border: `3px solid ${firstUser.color}` }}
              alt=""
            />
          ) : (
            <span className="avatar-placeholder-lg" style={{ background: firstUser.color }}>
              {firstUser.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div className="card-header-text">
            <div className="card-title">{card.title}</div>
            <div className="card-subtitle">{firstUser.name}</div>
          </div>
        </div>
      ) : (
        <div className="card-title">{card.title}</div>
      )}
      {restUsers.length > 0 && (
        <div className="assignee-row">
          {restUsers.map((user) => (
            <span key={user.id} className="assignee-badge">
              {user.avatar ? (
                <img
                  className="avatar"
                  src={user.avatar}
                  width={16}
                  height={16}
                  style={{ border: `2px solid ${user.color}` }}
                  alt=""
                />
              ) : (
                <span className="user-dot" style={{ background: user.color }} />
              )}
              {user.name}
            </span>
          ))}
        </div>
      )}
      {card.tags?.length > 0 && (
        <div className="card-tags-row">
          {card.tags.map((tag) => {
            const display = getTagDisplay(tags, tag);
            if (!display) return null;
            return (
              <span key={tag.tagKey} className="tag-badge" style={{ background: display.color }}>
                {display.text}
              </span>
            );
          })}
        </div>
      )}
      {card.description && <div className="card-desc">{card.description}</div>}
      <AttachmentList
        attachments={card.attachments || []}
        onAdd={(data) => onAddAttachment(card.id, data)}
        onDelete={onDeleteAttachment}
        extraAction={<CustomerInfoPopover card={card} onUpdate={onUpdate} />}
      />
      <div className="card-actions">
        <button
          className="card-edit"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={startEdit}
          aria-label="Karte bearbeiten"
        >
          Bearbeiten
        </button>
      </div>
    </div>
  );
}
