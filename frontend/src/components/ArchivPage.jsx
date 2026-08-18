import { formatDate } from "../dateUtils";
import { getTagDisplay } from "../tags";
import { matchesResponsibleFilter, matchesTitleFilter } from "../filterUtils";
import AttachmentList from "./AttachmentList";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 4h12M6.3 4V2.5a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V4M3.4 4l.6 8.6a1 1 0 0 0 1 .9h5.9a1 1 0 0 0 1-.9L12.6 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Zeigt alle archivierten Projekte (per "Archivieren"-Button vom Board aus).
export default function ArchivPage({
  archive = [],
  tags = [],
  users = [],
  onRestore,
  onDelete,
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
                <div className="archiv-item-actions">
                  <button className="restore-btn" onClick={() => onRestore?.(project.id)}>
                    Wiederherstellen
                  </button>
                  <button
                    className="archiv-delete-btn"
                    onClick={() => {
                      if (confirm(`"${project.title}" endgueltig aus dem Archiv loeschen? Das kann nicht rueckgaengig gemacht werden.`)) {
                        onDelete?.(project.id);
                      }
                    }}
                    aria-label="Endgueltig loeschen"
                    title="Endgueltig loeschen"
                  >
                    <TrashIcon />
                  </button>
                </div>
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
            {(project.customerNumber || project.contactName || project.contactPhone || project.contactEmail) && (
              <div className="archiv-item-customer">
                {project.customerNumber && <span>Kunde: {project.customerNumber}</span>}
                {project.contactName && <span>Ansprechpartner: {project.contactName}</span>}
                {project.contactPhone && <span>Tel: {project.contactPhone}</span>}
                {project.contactEmail && <span>E-Mail: {project.contactEmail}</span>}
              </div>
            )}
            <AttachmentList attachments={project.attachments || []} readOnly />
          </div>
        );
      })}
    </div>
  );
}
