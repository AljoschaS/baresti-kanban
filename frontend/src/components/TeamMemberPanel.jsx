import { useState } from "react";
import { localInputToIso, formatTimeShort } from "../calendarUtils";
import { formatDate } from "../dateUtils";

// Ein Teammitglied in der Kalender-Seitenleiste: Bild/Name, ein Formular um
// einen neuen Zeitraum (Datum+Uhrzeit von/bis, optionaler Titel) hinzuzufuegen,
// und darunter ein aufklappbares Dropdown mit allen bereits hinterlegten
// Zeitraeumen dieser Person (inkl. Loeschen).
export default function TeamMemberPanel({ user, entries, onAdd, onDelete }) {
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const sortedEntries = [...entries].sort((a, b) => new Date(a.start) - new Date(b.start));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const startIso = localInputToIso(fromInput);
    const endIso = localInputToIso(toInput);
    if (!startIso || !endIso) {
      setError("Bitte Von und Bis ausfuellen");
      return;
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError("Ende muss nach dem Start liegen");
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(user.id, { start: startIso, end: endIso, title: title.trim() });
      setFromInput("");
      setToInput("");
      setTitle("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatEntryRange(entry) {
    const start = new Date(entry.start);
    const end = new Date(entry.end);
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    if (sameDay) {
      return `${formatDate(entry.start.slice(0, 10))} ${formatTimeShort(entry.start)}–${formatTimeShort(entry.end)}`;
    }
    return `${formatDate(entry.start.slice(0, 10))} ${formatTimeShort(entry.start)} – ${formatDate(entry.end.slice(0, 10))} ${formatTimeShort(entry.end)}`;
  }

  return (
    <div className="calendar-member-panel">
      <div className="calendar-member-header">
        {user.avatar ? (
          <img
            className="avatar"
            src={user.avatar}
            width={28}
            height={28}
            style={{ border: `2px solid ${user.color}` }}
            alt=""
          />
        ) : (
          <span className="user-dot" style={{ background: user.color, width: 24, height: 24 }} />
        )}
        <span className="calendar-member-name">{user.name}</span>
      </div>

      <form className="calendar-add-form" onSubmit={submit}>
        <label className="calendar-add-field">
          <span>Von</span>
          <input type="datetime-local" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
        </label>
        <label className="calendar-add-field">
          <span>Bis</span>
          <input type="datetime-local" value={toInput} onChange={(e) => setToInput(e.target.value)} />
        </label>
        <input
          className="calendar-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel/Grund (optional)"
        />
        {error && <div className="calendar-add-error">{error}</div>}
        <button type="submit" className="calendar-add-btn" disabled={submitting}>
          Hinzufuegen
        </button>
      </form>

      <div className="calendar-member-entries">
        <button
          type="button"
          className="calendar-entries-toggle"
          onClick={() => setListOpen((v) => !v)}
        >
          {sortedEntries.length} Zeitraum{sortedEntries.length === 1 ? "" : "e"}
          <span className={"calendar-entries-caret" + (listOpen ? " open" : "")}>▾</span>
        </button>
        {listOpen && (
          <ul className="calendar-entries-list">
            {sortedEntries.length === 0 && (
              <li className="calendar-entries-empty">Noch keine Eintraege</li>
            )}
            {sortedEntries.map((entry) => (
              <li key={entry.id} className="calendar-entry-item">
                <div className="calendar-entry-info">
                  <span className="calendar-entry-range">{formatEntryRange(entry)}</span>
                  {entry.title && <span className="calendar-entry-title">{entry.title}</span>}
                </div>
                <button
                  type="button"
                  className="calendar-entry-delete"
                  onClick={() => onDelete(entry.id)}
                  aria-label="Zeitraum entfernen"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
