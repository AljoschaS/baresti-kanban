import { useEffect, useState } from "react";
import Board from "./components/Board";
import TeamColumn from "./components/TeamColumn";
import TagsColumn from "./components/TagsColumn";
import TopBarDropdown from "./components/TopBarDropdown";
import ArchivPage from "./components/ArchivPage";
import JournalPage from "./components/JournalPage";
import ResponsibleFilterBar from "./components/ResponsibleFilterBar";
import LoginForm from "./components/LoginForm";
import { api, onUnauthorized } from "./api";
import { toListWithItems, cardToItem, tokenToItem } from "./boardUtils";
import "./App.css";

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.13 1.13M4.23 11.67l-1.13 1.13M12.9 12.9l-1.13-1.13M4.23 4.33 3.1 3.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 9.7A6 6 0 0 1 6.3 2.5a6 6 0 1 0 7.2 7.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState("kanban");
  const [lists, setLists] = useState(null);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [archive, setArchive] = useState([]);
  const [error, setError] = useState(null);

  // Auth: "loading" waehrend der erste Check laeuft, "login" wenn ein Login
  // noetig ist, "ready" wenn die App genutzt werden kann (eingeloggt oder
  // noch niemand hat ueberhaupt ein Passwort gesetzt).
  const [authStatus, setAuthStatus] = useState("loading");
  const [currentUser, setCurrentUser] = useState(null);

  const [kanbanTitleFilter, setKanbanTitleFilter] = useState("");
  const [kanbanMainFilter, setKanbanMainFilter] = useState("");
  const [kanbanSecondaryFilter, setKanbanSecondaryFilter] = useState("");
  const [archivTitleFilter, setArchivTitleFilter] = useState("");
  const [archivMainFilter, setArchivMainFilter] = useState("");
  const [archivSecondaryFilter, setArchivSecondaryFilter] = useState("");

  // Theme: startet mit dem zuletzt gewaehlten Wert (localStorage), sonst mit
  // der Systemeinstellung, sonst hell. data-theme am <html>-Element steuert
  // die CSS-Variablen in App.css.
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function applyBoardData(data) {
    setLists(data.lists.map(toListWithItems));
    setUsers(data.users || []);
    setTags(data.tags || []);
    setArchive(data.archive || []);
  }

  function loadBoard() {
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
  }

  useEffect(() => {
    // Springt jederzeit auf den Login-Bildschirm, wenn eine Anfrage mit 401
    // zurueckkommt - z.B. wenn waehrend des Einrichtens gerade das erste
    // Nutzer-Passwort gesetzt wurde und der Login ab sofort greift, oder
    // wenn eine bestehende Sitzung abgelaufen ist.
    onUnauthorized(() => {
      setCurrentUser(null);
      setAuthStatus("login");
    });
    api.getMe().then(({ authRequired, user }) => {
      if (authRequired && !user) {
        setAuthStatus("login");
        return;
      }
      setCurrentUser(user || null);
      setAuthStatus("ready");
      loadBoard();
    });
  }, []);

  function handleLoggedIn(user) {
    setCurrentUser(user);
    setAuthStatus("ready");
    loadBoard();
  }

  async function handleLogout() {
    await api.logout();
    // Einfachster, sicherer Weg alle geladenen Daten wieder loszuwerden.
    window.location.reload();
  }

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

  async function handleDeleteArchivedProject(archivedId) {
    try {
      await api.deleteArchivedProject(archivedId);
      setArchive((prev) => prev.filter((p) => p.id !== archivedId));
    } catch (err) {
      alert(err.message);
    }
  }

  // Menue (Kanban/Archiv) sowie Team- und Tags-Verwaltung stehen jetzt
  // gesammelt oben rechts in der Topbar statt in einer eigenen linken
  // Spalte - Team/Tags als Dropdown, spart Platz auf schmaleren Bildschirmen.
  function TopBarExtras() {
    return (
      <div className="topbar-extras">
        <TopBarDropdown label="Team" count={users.length}>
          <TeamColumn
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        </TopBarDropdown>
        <TopBarDropdown label="Tags" count={tags.length}>
          <TagsColumn
            tags={tags}
            onAddTag={handleAddTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        </TopBarDropdown>
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
          <button
            className={"site-menu-item" + (page === "journal" ? " active" : "")}
            onClick={() => setPage("journal")}
          >
            Journal
          </button>
        </nav>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Helles Design" : "Dunkles Design"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        {currentUser && (
          <button className="site-menu-item logout-btn" onClick={handleLogout} title={currentUser.email || ""}>
            {currentUser.name} · Abmelden
          </button>
        )}
      </div>
    );
  }

  if (authStatus === "loading") {
    return <div className="loading">Lade...</div>;
  }

  if (authStatus === "login") {
    return <LoginForm onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="page-shell">
      <div className="app">
        <header className="app-header">
          <h1>{page === "archiv" ? "Archiv" : page === "journal" ? "Journal" : "Baresti GmbH"}</h1>
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
              <TopBarExtras />
            </div>
            <div className="kanban-frame">
              <div className="app-main">
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
              <TopBarExtras />
            </div>
            <ArchivPage
              archive={archive}
              tags={tags}
              users={users}
              onRestore={handleRestoreProject}
              onDelete={handleDeleteArchivedProject}
              titleFilter={archivTitleFilter}
              mainFilter={archivMainFilter}
              secondaryFilter={archivSecondaryFilter}
            />
          </>
        )}
        {page === "journal" && (
          <>
            <div className="filter-bar-row filter-bar-row-end">
              <TopBarExtras />
            </div>
            <JournalPage users={users} />
          </>
        )}
      </div>
    </div>
  );
}
