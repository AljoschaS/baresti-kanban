import { formatDate } from "../dateUtils";
import { getTagDisplay } from "../tags";
import { matchesResponsibleFilter, matchesTitleFilter } from "../filterUtils";
import AttachmentList from "./AttachmentList";

// Zeigt alle archivierten Projekte (per "Archivieren"-Button vom Board aus).
export default function ArchivPage({
  archive = [],
  tags = [],
  users = [],
  onRestore,
  titleFilter = "",
  mainFilter = "",
  secondaryFilter = "",
}) {
  if (archive.length === 0) {
    return (
      <div className="kanban-frame archiv-page">
        <p>Hier landen künftig alle abgeschlossenen Kanban-Projekte.</p>
      </div>
    );
  }

  const visibleArchive = archive.filter(
    (project) =>
      matchesTitleFilter(project.title, titleFilter) &&
      matchesResponsibleFilter(project.assignees, users, mainFilter, secondaryFilter)
  );

  return (
    <div className="kanban-frame archiv-list">
      {visibleArchive.length === 0 && (
        <div className="filter-empty-hint">Keine archivierten Projekte gefunden, die zum Filter passen.</div>
      )}
      {visibleArchive.map((project) => {
        const assignedUsers = (project.assignees || [])
          .map((id) => users.find((u) => u.id === id))
          .filter(Boolean);
        const [first, ...rest] = assignedUsers;

        return (
          <div className="archiv-item" key={project.id}>
            <div className="archiv-item-header">
              <span className="archiv-item-title">{project.title}</span>
              <div className="archiv-item-meta">
                <span className="archiv-item-dates">
                  Start {formatDate(project.startDate)} · Ziel {formatDate(project.targetDate)} · Archiviert am{" "}
                  {formatDate(project.archivedAt)}
                </span>
                <button className="restore-btn" onClick={() => onRestore?.(project.id)}>
                  Wiederherstellen
                </button>
              </div>
            </div>
            {(first || rest.length > 0) && (
              <div className="archiv-item-people">
                {first && <span>Hauptverantwortlich: {first.name}</span>}
                {rest.length > 0 && <span>Beteiligt: {rest.map((u) => u.name).join(", ")}</span>}
              </div>
            )}
            {project.tags?.length > 0 && (
              <div className="card-tags-row">
                {project.tags.map((tag) => {
                  const display = getTagDisplay(tags, tag);
                  if (!display) return null;
                  return (
                    <span key={tag.tagKey} className="tag-badge" style={{ background: display.color }}>
                      {display.text}
                    </span>
                  );
                })}
              </div>
            )}
            {project.description && <div className="card-desc">{project.description}</div>}
            <AttachmentList attachments={project.attachments || []} readOnly />
          </div>
        );
      })}
    </div>
  );
}
