import { useEffect, useState } from "react";
import Board from "./components/Board";
import TeamColumn from "./components/TeamColumn";
import TagsColumn from "./components/TagsColumn";
import ArchivPage from "./components/ArchivPage";
import ResponsibleFilterBar from "./components/ResponsibleFilterBar";
import { api } from "./api";
import { toListWithItems, cardToItem, tokenToItem } from "./boardUtils";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("kanban");
  const [lists, setLists] = useState(null);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [archive, setArchive] = useState([]);
  const [error, setError] = useState(null);

  const [kanbanTitleFilter, setKanbanTitleFilter] = useState("");
  const [kanbanMainFilter, setKanbanMainFilter] = useState("");
  const [kanbanSecondaryFilter, setKanbanSecondaryFilter] = useState("");
  const [archivTitleFilter, setArchivTitleFilter] = useState("");
  const [archivMainFilter, setArchivMainFilter] = useState("");
  const [archivSecondaryFilter, setArchivSecondaryFilter] = useState("");

  function applyBoardData(data) {
    setLists(data.lists.map(toListWithItems));
    setUsers(data.users || []);
    setTags(data.tags || []);
    setArchive(data.archive || []);
  }

  useEffect(() => {
    api
      .getBoard()
      .then(applyBoardData)
      .catch((err) =>
        setError(
          "Backend nicht erreichbar. Laeuft der Server unter http://localhost:4000? (" +
            err.message +
            ")"
        )
      );
  }, []);

  async function handleAddUser(name, extra) {
    const user = await api.createUser(name, extra);
    setUsers((prev) => [...prev, user]);
  }

  async function handleUpdateUser(id, data) {
    const user = await api.updateUser(id, data);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
  }

  async function handleDeleteUser(id) {
    if (!confirm("Person wirklich entfernen? Sie wird von allen Projekten abgemeldet.")) return;
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.map((it) =>
          it.type === "card" && it.assignees
            ? { ...it, assignees: it.assignees.filter((uid) => uid !== id) }
            : it
        ),
      }))
    );
  }

  async function handleAddTag(label, color) {
    const tag = await api.createTag(label, color);
    setTags((prev) => [...prev, tag]);
  }

  async function handleUpdateTag(key, data) {
    const tag = await api.updateTag(key, data);
    setTags((prev) => prev.map((t) => (t.key === key ? tag : t)));
  }

  async function handleDeleteTag(key) {
    await api.deleteTag(key);
    // Der Tag kann auf beliebig vielen Projekten/Tokens gehangen haben -
    // statt das lokal muehsam nachzuziehen, laden wir das Board frisch neu.
    try {
      const data = await api.getBoard();
      applyBoardData(data);
    } catch (err) {
      alert(err.message);
    }
  }

  function handleProjectArchived(archived) {
    setArchive((prev) => [archived, ...prev]);
  }

  async function handleRestoreProject(archivedId) {
    try {
      const { card, tokens = [], attachments = [] } = await api.restoreArchivedProject(archivedId);
      setArchive((prev) => prev.filter((p) => p.id !== archivedId));
      setLists((prev) =>
        prev.map((l) => {
          let items = l.items;
          if (l.id === card.listId) {
            items = [...items, { ...cardToItem(card), attachments }];
          }
          const listTokens = tokens.filter((t) => t.listId === l.id);
          if (listTokens.length) {
            items = [
              ...items,
              ...listTokens.map((t) => tokenToItem({ ...t, projectTitle: card.title })),
            ];
          }
          return items === l.items ? l : { ...l, items };
        })
      );
    } catch (err) {
      alert(err.message);
    }
  }

  // Menue (Kanban/Archiv) steht jetzt rechts neben der Suchleiste statt in
  // einer eigenen linken Spalte - spart Platz auf schmaleren Bildschirmen.
  function SiteMenu() {
    return (
      <nav className="site-menu-inline">
        <button
          className={"site-menu-item" + (page === "kanban" ? " active" : "")}
          onClick={() => setPage("kanban")}
        >
          Kanban
        </button>
        <button
          className={"site-menu-item" + (page === "archiv" ? " active" : "")}
          onClick={() => setPage("archiv")}
        >
          Archiv
        </button>
      </nav>
    );
  }

  return (
    <div className="page-shell">
      <div className="app">
        <header className="app-header">
          <h1>{page === "archiv" ? "Archiv" : "Baresti GmbH"}</h1>
        </header>
        {error && <div className="error-banner">{error}</div>}
        {page === "kanban" && !error && !lists && <div className="loading">Lade Board...</div>}
        {page === "kanban" && lists && (
          <>
            <div className="filter-bar-row">
              <ResponsibleFilterBar
                titleValue={kanbanTitleFilter}
                onTitleChange={setKanbanTitleFilter}
                mainValue={kanbanMainFilter}
                secondaryValue={kanbanSecondaryFilter}
                onMainChange={setKanbanMainFilter}
                onSecondaryChange={setKanbanSecondaryFilter}
              />
              <SiteMenu />
            </div>
            <div className="kanban-frame">
              <div className="app-main">
                <div className="sidebar-stack">
                  <TeamColumn
                    users={users}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                  />
                  <TagsColumn
                    tags={tags}
                    onAddTag={handleAddTag}
                    onUpdateTag={handleUpdateTag}
                    onDeleteTag={handleDeleteTag}
                  />
                </div>
                <Board
                  lists={lists}
                  setLists={setLists}
                  users={users}
                  tags={tags}
                  onProjectArchived={handleProjectArchived}
                  titleFilter={kanbanTitleFilter}
                  mainFilter={kanbanMainFilter}
                  secondaryFilter={kanbanSecondaryFilter}
                />
              </div>
            </div>
          </>
        )}
        {page === "archiv" && (
          <>
            <div className="filter-bar-row">
              <ResponsibleFilterBar
                titleValue={archivTitleFilter}
                onTitleChange={setArchivTitleFilter}
                mainValue={archivMainFilter}
                secondaryValue={archivSecondaryFilter}
                onMainChange={setArchivMainFilter}
                onSecondaryChange={setArchivSecondaryFilter}
              />
              <SiteMenu />
            </div>
            <ArchivPage
              archive={archive}
              tags={tags}
              users={users}
              onRestore={handleRestoreProject}
              titleFilter={archivTitleFilter}
              mainFilter={archivMainFilter}
              secondaryFilter={archivSecondaryFilter}
            />
          </>
        )}
      </div>
    </div>
  );
}
