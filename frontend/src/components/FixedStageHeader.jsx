// Kopfzelle einer fixierten Arbeits-Spalte (z.B. "Umgesetzt"): steht immer
// ganz rechts, ist nicht verschiebbar und kann nicht geloescht werden.
export default function FixedStageHeader({ list }) {
  return (
    <div className="stage-header-cell stage-header-locked">
      <span className="stage-title">{list.title}</span>
    </div>
  );
}
