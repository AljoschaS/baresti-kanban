// Prueft, ob ein Projekt (ueber seine assignee-User-IDs) zum
// Verantwortlichkeits-Filter passt. "Hauptverantwortlich" ist der erste
// Eintrag in assignees, "Beteiligt" sind alle weiteren. Beide Filterfelder
// sind unabhaengige Teilstring-Suchen (Gross-/Kleinschreibung egal); wenn
// beide gesetzt sind, muessen beide zutreffen.
export function matchesResponsibleFilter(assigneeIds, users, mainFilter, secondaryFilter) {
  const main = (mainFilter || "").trim().toLowerCase();
  const secondary = (secondaryFilter || "").trim().toLowerCase();
  if (!main && !secondary) return true;

  const assignedUsers = (assigneeIds || [])
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);
  const [first, ...rest] = assignedUsers;

  if (main && (!first || !first.name.toLowerCase().includes(main))) {
    return false;
  }
  if (secondary && !rest.some((u) => u.name.toLowerCase().includes(secondary))) {
    return false;
  }
  return true;
}

// Einfache Teilstring-Suche (Gross-/Kleinschreibung egal) im Projektnamen.
export function matchesTitleFilter(title, titleFilter) {
  const needle = (titleFilter || "").trim().toLowerCase();
  if (!needle) return true;
  return (title || "").toLowerCase().includes(needle);
}
