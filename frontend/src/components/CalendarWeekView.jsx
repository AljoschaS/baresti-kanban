import {
  addDays,
  startOfWeek,
  isSameDay,
  getDaySegment,
  packSegments,
  formatTimeShort,
} from "../calendarUtils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 32; // px pro Stunde

export default function CalendarWeekView({ cursorDate, entries, users }) {
  const weekStart = startOfWeek(cursorDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="calendar-week-view">
      <div className="calendar-week-header">
        <div className="calendar-week-hour-gutter" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={"calendar-week-day-label" + (isSameDay(day, today) ? " is-today" : "")}
          >
            <span className="calendar-week-day-weekday">
              {day.toLocaleDateString("de-DE", { weekday: "short" })}
            </span>
            <span className="calendar-week-day-date">{day.getDate()}.</span>
          </div>
        ))}
      </div>
      <div className="calendar-week-body">
        <div className="calendar-week-hour-gutter">
          {HOURS.map((h) => (
            <div key={h} className="calendar-week-hour-label" style={{ height: HOUR_HEIGHT }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((day) => {
          const segments = entries
            .map((entry) => getDaySegment(entry, day))
            .filter(Boolean);
          const packed = packSegments(segments);

          return (
            <div
              key={day.toISOString()}
              className="calendar-week-day-column"
              style={{ height: HOUR_HEIGHT * 24 }}
            >
              {packed.map(({ entry, startFraction, endFraction, lane, laneCount }) => {
                const user = usersById[entry.userId];
                const top = startFraction * HOUR_HEIGHT * 24;
                const height = Math.max((endFraction - startFraction) * HOUR_HEIGHT * 24, 14);
                const width = 100 / laneCount;
                const left = width * lane;
                const label = `${user?.name || "?"}: ${formatTimeShort(entry.start)}–${formatTimeShort(entry.end)}${entry.title ? " · " + entry.title : ""}`;
                return (
                  <div
                    key={entry.id}
                    className="calendar-week-entry"
                    title={label}
                    style={{
                      top,
                      height,
                      left: `${left}%`,
                      width: `calc(${width}% - 2px)`,
                      background: user?.color || "#999",
                    }}
                  >
                    <span className="calendar-week-entry-name">{user?.name || "?"}</span>
                    {entry.title && <span className="calendar-week-entry-title">{entry.title}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
