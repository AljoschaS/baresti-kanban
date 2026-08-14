// Gemeinsamer Datums-Formatierer: ISO-Datum (YYYY-MM-DD) -> deutsches Format (TT.MM.JJJJ).
export function formatDate(isoDate) {
  if (!isoDate) return "–";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

// Voller Zeitstempel (Datum + Uhrzeit) fuer das Journal, z.B. aus new Date().toISOString().
export function formatDateTime(isoTimestamp) {
  if (!isoTimestamp) return "–";
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
