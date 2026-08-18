import { useState } from "react";
import {
  localInputToIso,
  formatTimeShort,
  buildWeekdayNightPreset,
  buildWeekendPreset,
  repeatSegmentsWeekly,
} from "../calendarUtils";
import { formatDate } from "../dateUtils";

const PRESETS = {
  weekdayNights: {
    label: "Rufbereitschaft Wochentags (Mo-Fr, nur Naechte)",
    build: buildWeekdayNightPreset,
  },
  weekend: {
    label: "Rufbereitschaft Wochenende (Fr 18 - So 23:59)",
    build: buildWeekendPreset,
  },
};

// Ein Teammitglied in der Kalender-Seitenleiste: Bild/Name, ein Formular um
// einen neuen Zeitraum hinzuzufuegen - entweder frei gewaehlt (Datum+Uhrzeit
// von/bis) oder ueber eine der beiden Vorlagen (Rufbereitschaft Wochentags/
// Wochenende), optional mit woechentlicher Wiederholung bis zu einem
// Enddatum - und darunter ein aufklappbares Dropdown mit allen bereits
// hinterlegten Zeitraeumen dieser Person (inkl. Loeschen, auch serienweise).
export default function TeamMemberPanel({ user, entries, onAdd, onAddBulk, onDelete, onDeleteSeries }) {
  const [presetKey, setPresetKey] = useState("");
  const [presetDate, setPresetDate] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [title, setTitle] = useState("");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const sortedEntries = [...entries].sort((a, b) => new Date(a.start) - new Date(b.start));

  function resetForm() {
    setPresetKey("");
    setPresetDate("");
    setFromInput("");
    setToInput("");
    setTitle("");
    setRepeatEnabled(false);
    setRepeatUntil("");
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    let templateSegments;
    if (presetKey) {
      if (!presetDate) {
        setError("Bitte ein Datum in der Zielwoche waehlen");
        return;
      }
      templateSegments = PRESETS[presetKey].build(new Date(presetDate));
    } else {
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
      templateSegments = [{ start: new Date(startIso), end: new Date(endIso) }];
    }

    let allSegments = templateSegments;
    if (repeatEnabled) {
      if (!repeatUntil) {
        setError("Bitte ein Enddatum fuer die Wiederholung waehlen");
        return;
      }
      allSegments = repeatSegmentsWeekly(templateSegments, new Date(repeatUntil));
    }

    setSubmitting(true);
    try {
      if (allSegments.length === 1) {
        await onAdd(user.id, {
          start: allSegments[0].start.toISOString(),
          end: allSegments[0].end.toISOString(),
          title: title.trim(),
        });
      } else {
        await onAddBulk(
          user.id,
          allSegments.map((seg) => ({
            start: seg.start.toISOString(),
            end: seg.end.toISOString(),
            title: title.trim(),
          }))
        );
      }
      resetForm();
      setListOpen(false);
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
          <span>Vorlage</span>
          <select value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
            <option value="">Zeitraum frei waehlen</option>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        {presetKey ? (
          <label className="calendar-add-field">
            <span>Datum (beliebiger Tag der Zielwoche)</span>
            <input type="date" value={presetDate} onChange={(e) => setPresetDate(e.target.value)} />
          </label>
        ) : (
          <>
            <label className="calendar-add-field">
              <span>Von</span>
              <input type="datetime-local" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
            </label>
            <label className="calendar-add-field">
              <span>Bis</span>
              <input type="datetime-local" value={toInput} onChange={(e) => setToInput(e.target.value)} />
            </label>
          </>
        )}

        <input
          className="calendar-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel/Grund (optional)"
        />

        <label className="calendar-repeat-row">
          <input
            type="checkbox"
            checked={repeatEnabled}
            onChange={(e) => setRepeatEnabled(e.target.checked)}
          />
          <span>Woechentlich wiederholen</span>
        </label>
        {repeatEnabled && (
          <label className="calendar-add-field">
            <span>Wiederholen bis</span>
            <input type="date" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} />
          </label>
        )}

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
                <div className="calendar-entry-item-actions">
                  {entry.seriesId && (
                    <button
                      type="button"
                      className="calendar-entry-delete-series"
                      onClick={() => onDeleteSeries(entry.seriesId)}
                      aria-label="Ganze Serie entfernen"
                      title="Ganze Serie entfernen"
                    >
                      Serie
                    </button>
                  )}
                  <button
                    type="button"
                    className="calendar-entry-delete"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Nur diesen Zeitraum entfernen"
                    title="Nur diesen Zeitraum entfernen"
                  >
                    x
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
