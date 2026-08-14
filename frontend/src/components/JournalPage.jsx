import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDateTime } from "../dateUtils";

// Aktivitaets-Historie: wer hat wann was im System gemacht. Wird bei jedem
// Aufruf des Reiters frisch vom Server geladen (bis zu 500 juengste Eintraege).
export default function JournalPage() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    api
      .getActivity()
      .then((data) => setEntries(data.entries || []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="kanban-frame journal-list">
      <div className="journal-header">
        <h3>Journal</h3>
        <button className="journal-refresh-btn" onClick={load}>
          Aktualisieren
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {entries === null && !error && <div className="loading">Lade Journal...</div>}
      {entries && entries.length === 0 && (
        <div className="filter-empty-hint">Noch keine Aktivitaeten aufgezeichnet.</div>
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
