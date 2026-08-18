// Gemeinsame Helfer fuer die Kalender-Ansicht (Monat + Woche).

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Montag als Wochenstart (deutsche Konvention), unabhaengig von der
// Browser-Locale (die z.T. Sonntag als ersten Tag der Woche annimmt).
export function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sonntag, 1 = Montag, ...
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 42 Zellen (6 Wochen), Montag-Start, inklusive Rand-Tagen aus dem
// Vor-/Folgemonat - so bleibt das Raster in jedem Monat gleich hoch.
export function getMonthGridDays(cursorDate) {
  const gridStart = startOfWeek(startOfMonth(cursorDate));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// Ueberschneidet sich ein Kalender-Eintrag (start/end als ISO-Strings) mit
// einem bestimmten Tag?
export function entryOverlapsDay(entry, day) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const entryStart = new Date(entry.start).getTime();
  const entryEnd = new Date(entry.end).getTime();
  return entryStart < dayEnd && entryEnd > dayStart;
}

// Anteil eines Tages (0-1 je Start/Ende), den ein Eintrag an diesem
// bestimmten Tag belegt - fuer die Positionierung in der Wochen-Ansicht.
// Gibt null zurueck, wenn keine Ueberschneidung besteht.
export function getDaySegment(entry, day) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const entryStart = new Date(entry.start).getTime();
  const entryEnd = new Date(entry.end).getTime();
  const segStart = Math.max(entryStart, dayStart);
  const segEnd = Math.min(entryEnd, dayEnd);
  if (segEnd <= segStart) return null;
  const dayMs = dayEnd - dayStart;
  return {
    entry,
    startFraction: (segStart - dayStart) / dayMs,
    endFraction: (segEnd - dayStart) / dayMs,
  };
}

// Packt ueberlappende Tages-Segmente in nebeneinanderliegende Spuren
// (einfacher Greedy-Algorithmus), damit sich zeitlich ueberschneidende
// Eintraege in der Wochen-Ansicht nicht gegenseitig verdecken.
export function packSegments(segments) {
  const sorted = [...segments].sort((a, b) => a.startFraction - b.startFraction);
  const laneEnds = [];
  const placed = sorted.map((seg) => {
    let lane = laneEnds.findIndex((end) => end <= seg.startFraction);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.endFraction);
    } else {
      laneEnds[lane] = seg.endFraction;
    }
    return { ...seg, lane };
  });
  const laneCount = laneEnds.length || 1;
  return placed.map((seg) => ({ ...seg, laneCount }));
}

// Die 12 Monatsanfaenge eines Jahres - fuer die Jahres-Ansicht (ein
// Mini-Monatsraster pro Eintrag).
export function getYearMonths(cursorDate) {
  const year = cursorDate.getFullYear();
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}

export function formatYearLabel(date) {
  return String(date.getFullYear());
}

export function formatMonthShortLabel(date) {
  const label = date.toLocaleDateString("de-DE", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthLabel(date) {
  const label = date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startStr = String(weekStart.getDate()).padStart(2, "0");
  const endStr = String(weekEnd.getDate()).padStart(2, "0");
  const endMonthLabel = weekEnd.toLocaleDateString("de-DE", { month: "long" });
  if (sameMonth) {
    return `${startStr}.–${endStr}. ${endMonthLabel} ${weekEnd.getFullYear()}`;
  }
  const startMonth = String(weekStart.getMonth() + 1).padStart(2, "0");
  return `${startStr}.${startMonth}. – ${endStr}. ${endMonthLabel} ${weekEnd.getFullYear()}`;
}

export function formatTimeShort(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function withTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Preset "Rufbereitschaft Wochentags": 5 einzelne Bloecke, die nur die
// Naechte/Randzeiten Montag bis Freitag abdecken (nicht die Arbeitszeit
// 08:30-18:00 tagsueber): Mo 00:01-08:30, dann jeden Abend 18:00 bis zum
// naechsten Morgen 08:30, bis inklusive Do 18:00 - Fr 08:30.
// anyDateInWeek: ein beliebiges Datum in der Zielwoche, die Woche wird
// daraus automatisch (Montag als Wochenstart) ermittelt.
export function buildWeekdayNightPreset(anyDateInWeek) {
  const monday = startOfWeek(anyDateInWeek);
  const segments = [
    { start: withTime(monday, 0, 1), end: withTime(monday, 8, 30) },
  ];
  for (let i = 0; i < 4; i++) {
    const day = addDays(monday, i);
    const nextDay = addDays(monday, i + 1);
    segments.push({ start: withTime(day, 18, 0), end: withTime(nextDay, 8, 30) });
  }
  return segments;
}

// Preset "Rufbereitschaft Wochenende": ein einzelner Block Freitag 18:00
// bis Sonntag 23:59.
export function buildWeekendPreset(anyDateInWeek) {
  const monday = startOfWeek(anyDateInWeek);
  const friday = addDays(monday, 4);
  const sunday = addDays(monday, 6);
  return [{ start: withTime(friday, 18, 0), end: withTime(sunday, 23, 59) }];
}

// Wiederholt eine Liste von Segmenten (Date-Objekte) woechentlich, bis
// einschliesslich zum angegebenen Enddatum. Sicherheitsnetz bei 260 Wochen
// (~5 Jahre), damit ein falsch gesetztes Enddatum nicht zu einer
// Endlos-/Riesenschleife fuehrt.
export function repeatSegmentsWeekly(segments, untilDate) {
  const untilTime = addDays(startOfDay(untilDate), 1).getTime() - 1;
  const result = [];
  let weekOffset = 0;
  while (weekOffset <= 260) {
    const shifted = segments.map((seg) => ({
      start: addDays(seg.start, weekOffset * 7),
      end: addDays(seg.end, weekOffset * 7),
    }));
    if (shifted[0].start.getTime() > untilTime) break;
    result.push(...shifted);
    weekOffset += 1;
  }
  return result;
}

// datetime-local liefert lokale Zeit ohne Zeitzone (z.B. "2026-08-14T10:23").
// new Date(...) interpretiert das als lokale Zeit - toISOString() rechnet
// korrekt in UTC um, damit der Vergleich/die Speicherung konsistent bleibt.
export function localInputToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}
