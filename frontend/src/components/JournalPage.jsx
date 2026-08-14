import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDateTime } from "../dateUtils";

// datetime-local liefert lokale Zeit ohne Zeitzone (z.B. "2026-08-14T10:23").
// new Date(...) interpretiert das als lokale Zeit - toISOString() rechnet
// korrekt in UTC um, damit der Vergleich mit den gespeicherten Zeitstempeln stimmt.
function localInputToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

// Aktivitaets-Historie: wer hat wann was im System gemacht. Wird bei jedem
// Aufruf des Reiters bzw. jeder Filter-Aenderung frisch vom Server geladen
// (bis zu 500 Eintraege, serverseitig nach Zeitraum/Nutzer/Projekt gefiltert).
export default function JournalPage({ users = [] }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [userId, setUserId] = useState("");
  const [project, setProject] = useState("");

  function load() {
    setError(null);
    api
      .getActivity({
        from: localInputToIso(fromInput),
        to: localInputToIso(toInput),
        userId,
        project,
      })
      .then((data) => setEntries(data.entries || []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromInput, toInput, userId, project]);

  function resetFilters() {
    setFromInput("");
    setToInput("");
    setUserId("");
    setProject("");
  }

  const filtersActive = fromInput || toInput || userId || project;

  return (
    <div className="kanban-frame journal-list">
      <div className="journal-header">
        <h3>Journal</h3>
        <button className="journal-refresh-btn" onClick={load}>
          Aktualisieren
        </button>
      </div>

      <div className="journal-filters">
        <label className="responsible-filter-field">
          <span>Von</span>
          <input type="datetime-local" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
        </label>
        <label className="responsible-filter-field">
          <span>Bis</span>
          <input type="datetime-local" value={toInput} onChange={(e) => setToInput(e.target.value)} />
        </label>
        <label className="responsible-filter-field">
          <span>Person</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="responsible-filter-field">
          <span>Projektname</span>
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Suchen..."
          />
        </label>
        {filtersActive && (
          <button type="button" className="journal-reset-btn" onClick={resetFilters}>
            Filter zuruecksetzen
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {entries === null && !error && <div className="loading">Lade Journal...</div>}
      {entries && entries.length === 0 && (
        <div className="filter-empty-hint">
          {filtersActive ? "Keine Aktivitaeten gefunden, die zum Filter passen." : "Noch keine Aktivitaeten aufgezeichnet."}
        </div>
      )}
      {entries && entries.length > 0 && (
        <div className="journal-entries">
          {entries.map((entry) => (
            <div className="journal-entry" key={entry.id}>
              <span className="journal-entry-time">{formatDateTime(entry.ts)}</span>
              <span className="journal-entry-summary">{entry.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
