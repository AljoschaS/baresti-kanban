import { formatDate } from "../dateUtils";

// Schmale Spalte links vom Projekt: Start- und Ziel-Datum.
// Start wird bei Anlage automatisch gesetzt und ist nie editierbar,
// Ziel-Datum aendert man ueber "Bearbeiten" an der Karte.
export default function DateCell({ startDate, targetDate }) {
  return (
    <div className="date-cell">
      <div className="date-row">
        <span className="date-label">Start</span>
        <span className="date-value">{formatDate(startDate)}</span>
      </div>
      <div className="date-row">
        <span className="date-label">Ziel</span>
        <span className="date-value">{formatDate(targetDate)}</span>
      </div>
    </div>
  );
}
