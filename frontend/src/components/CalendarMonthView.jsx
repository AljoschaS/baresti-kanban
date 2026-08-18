import {
  WEEKDAY_LABELS,
  getMonthGridDays,
  entryOverlapsDay,
  isSameDay,
  formatTimeShort,
} from "../calendarUtils";

const MAX_VISIBLE_PER_DAY = 4;

export default function CalendarMonthView({ cursorDate, entries, users }) {
  const days = getMonthGridDays(cursorDate);
  const today = new Date();
  const currentMonth = cursorDate.getMonth();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-month-weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => entryOverlapsDay(e, day));
          const outsideMonth = day.getMonth() !== currentMonth;
          const isToday = isSameDay(day, today);
          const visible = dayEntries.slice(0, MAX_VISIBLE_PER_DAY);
          const hiddenCount = dayEntries.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              className={
                "calendar-month-cell" +
                (outsideMonth ? " outside-month" : "") +
                (isToday ? " is-today" : "")
              }
            >
              <div className="calendar-month-cell-date">{day.getDate()}</div>
              <div className="calendar-month-cell-entries">
                {visible.map((entry) => {
                  const user = usersById[entry.userId];
                  const label = `${user?.name || "?"}: ${formatTimeShort(entry.start)}–${formatTimeShort(entry.end)}${entry.title ? " · " + entry.title : ""}`;
                  return (
                    <div
                      key={entry.id}
                      className="calendar-month-entry"
                      style={{ background: user?.color || "#999" }}
                      title={label}
                    >
                      {user?.name || "?"}
                      {entry.title ? ` · ${entry.title}` : ""}
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <div className="calendar-month-entry-more">+{hiddenCount} mehr</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
