import {
  WEEKDAY_LABELS,
  getYearMonths,
  getMonthGridDays,
  entryOverlapsDay,
  isSameDay,
  formatMonthShortLabel,
} from "../calendarUtils";

const MAX_DOTS_PER_DAY = 4;

function MiniMonth({ month, entries, users, onSelect }) {
  const days = getMonthGridDays(month);
  const today = new Date();
  const currentMonth = month.getMonth();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="calendar-mini-month">
      <button type="button" className="calendar-mini-month-title" onClick={() => onSelect(month)}>
        {formatMonthShortLabel(month)}
      </button>
      <div className="calendar-mini-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label.charAt(0)}</span>
        ))}
      </div>
      <div className="calendar-mini-grid">
        {days.map((day) => {
          const outsideMonth = day.getMonth() !== currentMonth;
          const isToday = isSameDay(day, today);
          const dayEntries = entries.filter((e) => entryOverlapsDay(e, day));
          const distinctUserIds = [...new Set(dayEntries.map((e) => e.userId))];
          const dots = distinctUserIds.slice(0, MAX_DOTS_PER_DAY);
          const tooltip = dayEntries
            .map((e) => usersById[e.userId]?.name)
            .filter(Boolean)
            .join(", ");

          return (
            <div
              key={day.toISOString()}
              className={
                "calendar-mini-cell" +
                (outsideMonth ? " outside-month" : "") +
                (isToday ? " is-today" : "")
              }
              title={tooltip || undefined}
            >
              <span className="calendar-mini-cell-date">{day.getDate()}</span>
              {dots.length > 0 && (
                <span className="calendar-mini-cell-dots">
                  {dots.map((uid) => (
                    <span
                      key={uid}
                      className="calendar-mini-dot"
                      style={{ background: usersById[uid]?.color || "#999" }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Jahres-Ansicht: 12 kleine Monatsraster, Tage mit Eintraegen bekommen einen
// kleinen Punkt in der Farbe der jeweiligen Person (bis zu 4, Rest nur per
// Tooltip). Klick auf einen Monatsnamen springt in die Monats-Ansicht.
export default function CalendarYearView({ cursorDate, entries, users, onSelectMonth }) {
  const months = getYearMonths(cursorDate);

  return (
    <div className="calendar-year-view">
      {months.map((month) => (
        <MiniMonth
          key={month.toISOString()}
          month={month}
          entries={entries}
          users={users}
          onSelect={onSelectMonth}
        />
      ))}
    </div>
  );
}
