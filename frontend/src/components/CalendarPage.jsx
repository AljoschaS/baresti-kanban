import { useEffect, useState } from "react";
import { api } from "../api";
import TeamMemberPanel from "./TeamMemberPanel";
import CalendarMonthView from "./CalendarMonthView";
import CalendarWeekView from "./CalendarWeekView";
import CalendarYearView from "./CalendarYearView";
import {
  addDays,
  startOfWeek,
  formatMonthLabel,
  formatWeekLabel,
  formatYearLabel,
} from "../calendarUtils";

// Kalender-Seite: links eine Leiste mit allen Teammitgliedern (Bild+Name,
// Formular fuer neue Zeitraeume, Dropdown-Liste der eigenen Eintraege),
// rechts der eigentliche Kalender (Monats- oder Wochen-Ansicht), der die
// Zeitraeume aller Personen in ihrer jeweiligen Farbe anzeigt.
export default function CalendarPage({ users = [] }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const [cursorDate, setCursorDate] = useState(new Date());

  function load() {
    setError(null);
    api
      .getAvailability()
      .then((data) => setEntries(data.entries || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(userId, data) {
    const entry = await api.createAvailability({ userId, ...data });
    setEntries((prev) => [...prev, entry]);
  }

  async function handleDelete(entryId) {
    if (!confirm("Diesen Zeitraum wirklich entfernen?")) return;
    await api.deleteAvailability(entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  function goToday() {
    setCursorDate(new Date());
  }

  function goPrev() {
    setCursorDate((d) => {
      if (viewMode === "month") return addMonths(d, -1);
      if (viewMode === "year") return addYears(d, -1);
      return addDays(d, -7);
    });
  }

  function goNext() {
    setCursorDate((d) => {
      if (viewMode === "month") return addMonths(d, 1);
      if (viewMode === "year") return addYears(d, 1);
      return addDays(d, 7);
    });
  }

  function addMonths(date, amount) {
    const d = new Date(date);
    d.setDate(1);
    d.setMonth(d.getMonth() + amount);
    return d;
  }

  function addYears(date, amount) {
    const d = new Date(date);
    d.setDate(1);
    d.setFullYear(d.getFullYear() + amount);
    return d;
  }

  function handleSelectMonth(month) {
    setCursorDate(month);
    setViewMode("month");
  }

  const label =
    viewMode === "month"
      ? formatMonthLabel(cursorDate)
      : viewMode === "year"
      ? formatYearLabel(cursorDate)
      : formatWeekLabel(startOfWeek(cursorDate));

  return (
    <div className="kanban-frame calendar-page">
      <aside className="calendar-sidebar">
        {users.length === 0 && (
          <div className="calendar-sidebar-empty">Noch keine Teammitglieder angelegt.</div>
        )}
        {users.map((user) => (
          <TeamMemberPanel
            key={user.id}
            user={user}
            entries={entries.filter((e) => e.userId === user.id)}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </aside>
      <div className="calendar-main">
        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button type="button" onClick={goPrev} aria-label="Zurueck">
              ‹
            </button>
            <button type="button" className="calendar-today-btn" onClick={goToday}>
              Heute
            </button>
            <button type="button" onClick={goNext} aria-label="Weiter">
              ›
            </button>
            <span className="calendar-label">{label}</span>
          </div>
          <div className="calendar-view-toggle">
            <button
              type="button"
              className={"calendar-view-btn" + (viewMode === "week" ? " active" : "")}
              onClick={() => setViewMode("week")}
            >
              Woche
            </button>
            <button
              type="button"
              className={"calendar-view-btn" + (viewMode === "month" ? " active" : "")}
              onClick={() => setViewMode("month")}
            >
              Monat
            </button>
            <button
              type="button"
              className={"calendar-view-btn" + (viewMode === "year" ? " active" : "")}
              onClick={() => setViewMode("year")}
            >
              Jahr
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading && !error && <div className="loading">Lade Kalender...</div>}
        {!loading && !error && viewMode === "month" && (
          <CalendarMonthView cursorDate={cursorDate} entries={entries} users={users} />
        )}
        {!loading && !error && viewMode === "week" && (
          <CalendarWeekView cursorDate={cursorDate} entries={entries} users={users} />
        )}
        {!loading && !error && viewMode === "year" && (
          <CalendarYearView
            cursorDate={cursorDate}
            entries={entries}
            users={users}
            onSelectMonth={handleSelectMonth}
          />
        )}
      </div>
    </div>
  );
}
