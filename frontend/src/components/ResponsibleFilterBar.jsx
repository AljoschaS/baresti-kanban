// Filterleiste: Projektname (freier Text), Hauptverantwortlicher (erster
// Zugewiesener eines Projekts) und Beteiligte (alle weiteren Zugewiesenen).
export default function ResponsibleFilterBar({
  titleValue,
  onTitleChange,
  mainValue,
  secondaryValue,
  onMainChange,
  onSecondaryChange,
}) {
  return (
    <div className="responsible-filter">
      <label className="responsible-filter-field">
        <span>Projektname</span>
        <input
          value={titleValue}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Suchen..."
        />
      </label>
      <label className="responsible-filter-field">
        <span>Hauptverantwortlich</span>
        <input
          value={mainValue}
          onChange={(e) => onMainChange(e.target.value)}
          placeholder="Name suchen..."
        />
      </label>
      <label className="responsible-filter-field">
        <span>Beteiligt</span>
        <input
          value={secondaryValue}
          onChange={(e) => onSecondaryChange(e.target.value)}
          placeholder="Name suchen..."
        />
      </label>
    </div>
  );
}
