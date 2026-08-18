const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
// Noetig, damit req.secure hinter dem Railway-Proxy korrekt erkannt wird
// (fuer sichere Cookies in Produktion, ohne extra Umgebungsvariable).
app.set("trust proxy", 1);
// PORT wird beim Hosting meist automatisch als Umgebungsvariable vorgegeben.
const PORT = process.env.PORT || 4000;
// DATA_DIR: wo db.json + hochgeladene Dateien liegen. Beim Hosting sollte das
// auf ein dauerhaftes Volume zeigen (sonst gehen die Daten bei jedem Deploy
// verloren) - lokal ist das einfach der backend-Ordner selbst.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
// Gebautes Frontend (frontend/npm run build), wird vom selben Server mit ausgeliefert.
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Leere, aber gueltige Datenbasis fuer einen ganz frischen Start (z.B. neues
// Hosting-Volume ohne vorhandene db.json). Die 6 Standard-Listen entsprechen
// dem, was auch beim allerersten lokalen Setup angelegt wurde.
const EMPTY_DB = {
  lists: [
    { id: 1, title: "Projekte", position: 0, protected: true, pinnedRight: false },
    { id: 2, title: "Warte auf Kunden", position: 1, protected: false, pinnedRight: false },
    { id: 3, title: "In Bearbeitung", position: 2, protected: false, pinnedRight: false },
    { id: 4, title: "on Hold", position: 3, protected: false, pinnedRight: false },
    { id: 5, title: "Fertig", position: 4, protected: false, pinnedRight: false },
    { id: 6, title: "Umgesetzt", position: 5, protected: false, pinnedRight: true },
  ],
  cards: [],
  tokens: [],
  users: [],
  tags: [
    { id: 1, key: "helloTESS", label: "helloTESS!", color: "#6554C0", custom: false },
    { id: 2, key: "passaDuo", label: "passaDuo", color: "#00B8D9", custom: false },
    { id: 3, key: "wallee", label: "Wallee", color: "#36B37E", custom: false },
    { id: 4, key: "sonstiges", label: "Sonstiges", color: "#FF8B00", custom: true },
  ],
  attachments: [],
  archivedProjects: [],
  activityLog: [],
  availability: [],
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
}

// --- Individueller Login (E-Mail + Passwort je Person) ---
// JWT_SECRET unbedingt in Produktion (Railway-Variable) auf einen langen,
// zufaelligen Wert setzen - ohne gesetzte Variable wird lokal ein fester
// Entwicklungs-Schluessel verwendet, der fuer echtes Hosting nicht sicher ist.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-bitte-in-produktion-per-JWT_SECRET-setzen";
const TOKEN_COOKIE = "token";
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

// Nutzer-Objekt ohne passwordHash - so verlassen Passwort-Hashes nie den Server.
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

// Solange noch niemand ein Passwort gesetzt hat, bleibt die App fuer alle
// offen (wie bisher im lokalen Betrieb) - so lassen sich in Ruhe Zugaenge
// fuer das ganze Team anlegen. Sobald mindestens eine Person ein Passwort
// hat, verlangt jede API-Anfrage einen gueltigen Login.
function authRequired(req, res, next) {
  const db = readDB();
  const anyPasswordSet = db.users.some((u) => u.passwordHash);
  if (!anyPasswordSet) return next();

  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) return res.status(401).json({ error: "Bitte anmelden" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((u) => u.id === payload.uid);
    if (!user) return res.status(401).json({ error: "Bitte anmelden" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Sitzung abgelaufen, bitte erneut anmelden" });
  }
}

app.use(cookieParser());
// origin:true spiegelt den anfragenden Ursprung (statt "*"), das ist noetig,
// damit Cookies bei credentials:"include" ueberhaupt gesetzt/gesendet werden.
app.use(cors({ origin: true, credentials: true }));
// Hoeheres Limit, da Profilbilder/Datei-Anhaenge als Base64-Text im JSON-Body mitgeschickt werden.
app.use(express.json({ limit: "8mb" }));

// Alle schreibenden Anfragen (POST/PATCH/DELETE/PUT) werden strikt
// nacheinander abgearbeitet, nie parallel - so kann nie eine Anfrage einen
// aelteren Stand von db.json lesen, waehrend eine andere Anfrage gerade eine
// neuere Version geschrieben hat ("Lost Update"). Aktuell sind alle Routen
// komplett synchron und daher schon von Natur aus sicher (Node fuehrt
// synchronen Code nie ueberlappend aus) - diese Warteschlange schuetzt aber
// zuverlaessig auch vor kuenftigen Aenderungen (z.B. asynchrone
// Bildverarbeitung oder E-Mail-Versand), ohne dass man das bei jeder neuen
// Route selbst im Kopf behalten muss.
let writeQueue = Promise.resolve();
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  writeQueue = writeQueue.then(
    () =>
      new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        res.on("finish", finish);
        res.on("close", finish);
        // Sicherheitsnetz: falls eine Antwort aus irgendeinem Grund nie
        // endet, blockiert das nicht dauerhaft alle folgenden Schreibzugriffe.
        setTimeout(finish, 30000);
        next();
      })
  );
});

app.post("/api/login", (req, res) => {
  const db = readDB();
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || "";
  const user = db.users.find((u) => u.passwordHash && normalizeEmail(u.email) === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "E-Mail oder Passwort falsch" });
  }
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: TOKEN_MAX_AGE_MS,
  });
  logActivity(db, user, "login", `${user.name} hat sich angemeldet`);
  writeDB(db);
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  // Bewusst kein authRequired hier: Abmelden soll immer klappen, auch bei
  // bereits abgelaufener/ungueltiger Sitzung - geloggt wird nur best-effort.
  const token = req.cookies?.[TOKEN_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const db = readDB();
      const user = db.users.find((u) => u.id === payload.uid);
      if (user) {
        logActivity(db, user, "logout", `${user.name} hat sich abgemeldet`);
        writeDB(db);
      }
    } catch {
      // Cookie ungueltig/abgelaufen - trotzdem normal ausloggen.
    }
  }
  res.clearCookie(TOKEN_COOKIE);
  res.status(204).end();
});

app.get("/api/me", authRequired, (req, res) => {
  const db = readDB();
  const anyPasswordSet = db.users.some((u) => u.passwordHash);
  if (!anyPasswordSet) return res.json({ authRequired: false, user: null });
  res.json({ authRequired: true, user: publicUser(req.user) });
});

// Ab hier verlangt jede /api- und /uploads-Route einen Login (sobald die
// Bootstrap-Phase vorbei ist, siehe authRequired oben).
app.use("/api", authRequired);
app.use("/uploads", authRequired, express.static(UPLOADS_DIR));
// Das gebaute Frontend bleibt bewusst oeffentlich erreichbar - sonst koennte
// das Login-Formular selbst nie geladen werden.
app.use(express.static(FRONTEND_DIST));

// --- ganz einfache Dateibasierte "Datenbank" ---
// Fuer den Start reicht eine JSON-Datei. Spaeter leicht gegen
// PostgreSQL/SQLite austauschbar, ohne dass sich die Routen aendern muessen.
function readDB() {
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(items) {
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

// Anzahl Elemente (Karten + Tag-Tokens zusammen), die aktuell in einer
// Liste liegen. Wird benutzt, um neue Elemente ans Ende anzuhaengen.
function itemCountInList(db, listId) {
  const cardCount = db.cards.filter((c) => c.listId === listId).length;
  const tokenCount = db.tokens.filter((t) => t.listId === listId).length;
  return cardCount + tokenCount;
}

// Liste, in die ein neu zugewiesener Tag zunaechst als Token wandert:
// die naechste Liste (nach Reihenfolge) hinter der Liste der Projekt-Karte.
// Gibt es keine naechste Liste, bleibt der Token in derselben Liste.
function nextListId(db, fromListId) {
  const sorted = [...db.lists].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((l) => l.id === fromListId);
  if (idx === -1 || idx === sorted.length - 1) return fromListId;
  return sorted[idx + 1].id;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => t && t.tagKey)
    .map((t) => ({ tagKey: t.tagKey, tagLabel: t.tagLabel || "" }));
}

// Fuer Journal-Texte: Standard-Tags haben meist kein eigenes tagLabel
// (das kommt aus der Tag-Definition), nur "Sonstiges" & Co. haben einen
// individuellen Text. Hier holen wir uns notfalls die Definition dazu.
function getTagLabelFallback(db, tagKey) {
  const def = (db.tags || []).find((t) => t.key === tagKey);
  return def?.label || tagKey;
}

function normalizeAssignees(assignees, db) {
  if (!Array.isArray(assignees)) return [];
  const validIds = new Set(db.users.map((u) => u.id));
  return [...new Set(assignees.map(Number))].filter((id) => validIds.has(id));
}

// --- Journal: wer hat wann was gemacht ---
// actor ist entweder req.user (aus authRequired) oder waehrend der
// Bootstrap-Phase/beim Login-Vorgang direkt ein Nutzer-Objekt/null.
// Bewusst NICHT fuer reine Positions-/Reihenfolge-Aenderungen aufgerufen,
// sonst wuerde jedes Verschieben per Drag&Drop das Journal zuspammen.
// extra kann z.B. { cardTitle } enthalten - fuer projektbezogene Aktionen,
// damit im Journal spaeter nach Projektname gefiltert werden kann, ohne den
// Freitext der summary parsen zu muessen.
function logActivity(db, actor, action, summary, extra = {}) {
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.push({
    id: nextId(db.activityLog),
    ts: new Date().toISOString(),
    userId: actor ? actor.id : null,
    userName: actor ? actor.name : "System",
    action,
    summary,
    ...extra,
  });
  // Nicht unbegrenzt wachsen lassen.
  if (db.activityLog.length > 2000) {
    db.activityLog = db.activityLog.slice(db.activityLog.length - 2000);
  }
}

// Kurzform "TT.MM. HH:MM" fuer Journal-Eintraege zu Kalender-Zeitraeumen.
function formatIsoForLog(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}. ${hours}:${minutes}`;
}

const USER_COLORS = [
  "#0052CC",
  "#36B37E",
  "#FF5630",
  "#6554C0",
  "#00B8D9",
  "#FF8B00",
  "#DE350B",
  "#00875A",
];

// --- Board: liefert Listen inkl. ihrer Projekt-Karten und Tag-Tokens ---
app.get("/api/board", (req, res) => {
  const db = readDB();
  const lists = [...db.lists]
    .sort((a, b) => a.position - b.position)
    .map((list) => ({
      ...list,
      cards: db.cards
        .filter((c) => c.listId === list.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          ...c,
          attachments: db.attachments.filter((a) => a.cardId === c.id),
        })),
      tokens: db.tokens
        .filter((t) => t.listId === list.id)
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          ...t,
          projectTitle: db.cards.find((c) => c.id === t.cardId)?.title || "",
        })),
    }));
  const users = [...db.users].sort((a, b) => a.position - b.position).map(publicUser);
  const archive = [...(db.archivedProjects || [])].sort((a, b) => b.id - a.id);
  const tags = db.tags || [];
  res.json({ lists, users, archive, tags });
});

// --- Journal: Aktivitaets-Historie (wer hat wann was gemacht) ---
// Unterstuetzt optionale Filter per Query-Parameter:
//   from/to   - ISO-Zeitstempel, grenzen den Zeitraum ein (jeweils inklusive)
//   userId    - nur Eintraege dieser Person
//   project   - Freitext-Suche im Projektnamen (falls die Aktion einem Projekt zugeordnet ist)
app.get("/api/activity", (req, res) => {
  const db = readDB();
  const { from, to, userId, project } = req.query;
  let entries = [...(db.activityLog || [])];

  if (from) entries = entries.filter((e) => e.ts >= from);
  if (to) entries = entries.filter((e) => e.ts <= to);
  if (userId) entries = entries.filter((e) => String(e.userId) === String(userId));
  if (project && project.trim()) {
    const needle = project.trim().toLowerCase();
    entries = entries.filter((e) => (e.cardTitle || "").toLowerCase().includes(needle));
  }

  entries.sort((a, b) => b.id - a.id);
  res.json({ entries: entries.slice(0, 500) });
});

// --- Tags: verwaltbare Tag-Definitionen (Label + Farbe) ---
app.post("/api/tags", (req, res) => {
  const db = readDB();
  if (!db.tags) db.tags = [];
  const { label, color } = req.body;
  if (!label || !label.trim()) {
    return res.status(400).json({ error: "label ist erforderlich" });
  }
  const id = nextId(db.tags);
  const newTag = {
    id,
    key: `tag_${id}`,
    label: label.trim(),
    color: color || "#6554C0",
    custom: false,
  };
  db.tags.push(newTag);
  logActivity(db, req.user, "tag.create", `${req.user?.name || "Jemand"} hat den Tag "${newTag.label}" erstellt`);
  writeDB(db);
  res.status(201).json(newTag);
});

app.patch("/api/tags/:key", (req, res) => {
  const db = readDB();
  if (!db.tags) db.tags = [];
  const key = req.params.key;
  const tag = db.tags.find((t) => t.key === key);
  if (!tag) return res.status(404).json({ error: "Tag nicht gefunden" });
  if (req.body.label !== undefined && req.body.label.trim()) {
    tag.label = req.body.label.trim();
  }
  if (req.body.color !== undefined) {
    tag.color = req.body.color;
  }
  logActivity(db, req.user, "tag.update", `${req.user?.name || "Jemand"} hat den Tag "${tag.label}" bearbeitet`);
  writeDB(db);
  res.json(tag);
});

app.delete("/api/tags/:key", (req, res) => {
  const db = readDB();
  if (!db.tags) db.tags = [];
  const key = req.params.key;
  const existing = db.tags.find((t) => t.key === key);
  if (!existing) return res.status(404).json({ error: "Tag nicht gefunden" });

  db.tags = db.tags.filter((t) => t.key !== key);
  // Diesen Tag ueberall entfernen, wo er gerade zugewiesen ist: von den
  // Projekt-Karten selbst und von allen noch offenen Tag-Tokens auf dem Board.
  db.cards.forEach((c) => {
    if (Array.isArray(c.tags)) {
      c.tags = c.tags.filter((t) => t.tagKey !== key);
    }
  });
  db.tokens = db.tokens.filter((t) => t.tagKey !== key);

  logActivity(db, req.user, "tag.delete", `${req.user?.name || "Jemand"} hat den Tag "${existing.label}" geloescht`);
  writeDB(db);
  res.status(204).end();
});

// --- Team-Mitglieder ---
app.post("/api/users", (req, res) => {
  const db = readDB();
  const { name, color, avatar, email, password } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name ist erforderlich" });
  }
  const cleanEmail = email !== undefined ? normalizeEmail(email) : "";
  if (cleanEmail) {
    const taken = db.users.some((u) => normalizeEmail(u.email) === cleanEmail);
    if (taken) return res.status(400).json({ error: "E-Mail wird bereits verwendet" });
  }
  const newUser = {
    id: nextId(db.users),
    name: name.trim(),
    color: color || USER_COLORS[db.users.length % USER_COLORS.length],
    avatar: avatar || null,
    position: db.users.length,
    email: cleanEmail || null,
    passwordHash: password ? bcrypt.hashSync(password, 10) : null,
  };
  db.users.push(newUser);
  logActivity(db, req.user, "user.create", `${req.user?.name || "Jemand"} hat "${newUser.name}" im Team hinzugefuegt`);
  writeDB(db);
  res.status(201).json(publicUser(newUser));
});

app.patch("/api/users/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const user = db.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: "Nutzer nicht gefunden" });
  const changedParts = [];
  if (req.body.name !== undefined && req.body.name.trim() && req.body.name.trim() !== user.name) {
    changedParts.push("Name");
    user.name = req.body.name.trim();
  }
  if (req.body.color !== undefined) {
    user.color = req.body.color;
  }
  if (req.body.avatar !== undefined) {
    user.avatar = req.body.avatar;
  }
  if (req.body.email !== undefined) {
    const cleanEmail = normalizeEmail(req.body.email);
    if (cleanEmail) {
      const taken = db.users.some((u) => u.id !== id && normalizeEmail(u.email) === cleanEmail);
      if (taken) return res.status(400).json({ error: "E-Mail wird bereits verwendet" });
    }
    if (cleanEmail !== normalizeEmail(user.email)) changedParts.push("E-Mail");
    user.email = cleanEmail || null;
  }
  // Leeres Passwort beim Bearbeiten = unveraendert lassen (kein versehentliches Loeschen).
  if (req.body.password) {
    user.passwordHash = bcrypt.hashSync(req.body.password, 10);
    changedParts.push("Passwort");
  }
  if (changedParts.length) {
    logActivity(
      db,
      req.user,
      "user.update",
      `${req.user?.name || "Jemand"} hat bei "${user.name}" ${changedParts.join(", ")} geaendert`
    );
  }
  writeDB(db);
  res.json(publicUser(user));
});

app.delete("/api/users/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const removedUser = db.users.find((u) => u.id === id);
  db.users = db.users.filter((u) => u.id !== id);
  db.cards.forEach((c) => {
    if (Array.isArray(c.assignees)) {
      c.assignees = c.assignees.filter((uid) => uid !== id);
    }
  });
  db.tokens.forEach((t) => {
    if (t.assigneeId === id) t.assigneeId = null;
  });
  if (db.availability) {
    db.availability = db.availability.filter((e) => e.userId !== id);
  }
  if (removedUser) {
    logActivity(db, req.user, "user.delete", `${req.user?.name || "Jemand"} hat "${removedUser.name}" aus dem Team entfernt`);
  }
  writeDB(db);
  res.status(204).end();
});

// --- Listen ---
app.post("/api/lists", (req, res) => {
  const db = readDB();
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title ist erforderlich" });
  }
  // Fixierte Spalten (z.B. "Umgesetzt") zaehlen nicht mit, damit neue Spalten
  // immer VOR ihnen eingefuegt werden - sie sollen immer ganz rechts bleiben.
  const normalLists = db.lists.filter((l) => !l.pinnedRight);
  const maxPosition = normalLists.length
    ? Math.max(...normalLists.map((l) => l.position))
    : -1;
  const newPosition = maxPosition + 1;
  const newList = {
    id: nextId(db.lists),
    title: title.trim(),
    position: newPosition,
    protected: false,
    pinnedRight: false,
  };
  db.lists.push(newList);
  db.lists
    .filter((l) => l.pinnedRight && l.position <= newPosition)
    .forEach((l) => {
      l.position = newPosition + 1;
    });
  logActivity(db, req.user, "list.create", `${req.user?.name || "Jemand"} hat die Spalte "${newList.title}" erstellt`);
  writeDB(db);
  res.status(201).json(newList);
});

app.patch("/api/lists/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const list = db.lists.find((l) => l.id === id);
  if (!list) return res.status(404).json({ error: "Liste nicht gefunden" });
  // Reine Positions-Aenderungen (Spalten per Drag&Drop umsortieren) werden
  // bewusst NICHT geloggt - nur echte Titel-Aenderungen.
  if (req.body.title !== undefined && req.body.title !== list.title) {
    const oldTitle = list.title;
    list.title = req.body.title;
    logActivity(db, req.user, "list.update", `${req.user?.name || "Jemand"} hat die Spalte "${oldTitle}" in "${list.title}" umbenannt`);
  }
  if (req.body.position !== undefined) list.position = req.body.position;
  writeDB(db);
  res.json(list);
});

app.delete("/api/lists/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const list = db.lists.find((l) => l.id === id);
  if (!list) return res.status(404).json({ error: "Liste nicht gefunden" });
  if (list.protected || list.pinnedRight) {
    return res.status(400).json({ error: "Diese Liste ist geschuetzt und kann nicht geloescht werden" });
  }
  const cardIds = db.cards.filter((c) => c.listId === id).map((c) => c.id);
  db.attachments
    .filter((a) => cardIds.includes(a.cardId) && a.type === "file")
    .forEach((a) => deleteUploadedFile(a.url));
  db.lists = db.lists.filter((l) => l.id !== id);
  db.cards = db.cards.filter((c) => c.listId !== id);
  db.tokens = db.tokens.filter(
    (t) => t.listId !== id && !cardIds.includes(t.cardId)
  );
  db.attachments = db.attachments.filter((a) => !cardIds.includes(a.cardId));
  logActivity(db, req.user, "list.delete", `${req.user?.name || "Jemand"} hat die Spalte "${list.title}" geloescht`);
  writeDB(db);
  res.status(204).end();
});

// --- Projekt-Karten ---
app.post("/api/cards", (req, res) => {
  const db = readDB();
  const { listId, title, description, tags, assignees } = req.body;
  if (!listId || !title || !title.trim()) {
    return res.status(400).json({ error: "listId und title sind erforderlich" });
  }
  const cleanTags = normalizeTags(tags);
  const today = new Date().toISOString().slice(0, 10);
  const newCard = {
    id: nextId(db.cards),
    listId,
    title: title.trim(),
    description: description || "",
    position: itemCountInList(db, listId),
    tags: cleanTags,
    assignees: normalizeAssignees(assignees, db),
    startDate: today,
    targetDate: req.body.targetDate || null,
    customerNumber: req.body.customerNumber || "",
    contactName: req.body.contactName || "",
    contactPhone: req.body.contactPhone || "",
    contactEmail: req.body.contactEmail || "",
  };
  db.cards.push(newCard);

  const targetListId = nextListId(db, listId);
  const newTokens = cleanTags.map((tag, i) => ({
    id: nextId(db.tokens) + i,
    cardId: newCard.id,
    tagKey: tag.tagKey,
    tagLabel: tag.tagLabel,
    listId: targetListId,
    position: itemCountInList(db, targetListId) + i,
    assigneeId: null,
    note: null,
  }));
  db.tokens.push(...newTokens);

  logActivity(db, req.user, "card.create", `${req.user?.name || "Jemand"} hat das Projekt "${newCard.title}" angelegt`, { cardTitle: newCard.title });
  writeDB(db);
  res.status(201).json({ card: newCard, tokens: newTokens });
});

app.patch("/api/cards/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const card = db.cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ error: "Karte nicht gefunden" });

  const { title, description, listId, position, tags, assignees, targetDate, customerNumber, contactName, contactPhone, contactEmail } = req.body;
  // Reine Positions-/Listen-Aenderungen (Zeilen per Drag&Drop umsortieren)
  // werden bewusst NICHT im Journal geloggt - nur inhaltliche Aenderungen.
  const changedParts = [];
  if (title !== undefined && title !== card.title) {
    changedParts.push("Titel");
    card.title = title;
  }
  if (description !== undefined && description !== card.description) {
    changedParts.push("Beschreibung");
    card.description = description;
  }
  if (listId !== undefined) card.listId = listId;
  if (position !== undefined) card.position = position;
  if (assignees !== undefined) {
    const newAssignees = normalizeAssignees(assignees, db);
    const changed =
      newAssignees.length !== card.assignees.length ||
      newAssignees.some((uid) => !card.assignees.includes(uid));
    if (changed) changedParts.push("Zustaendige");
    card.assignees = newAssignees;
    // Tags, die einem jetzt nicht mehr zugewiesenen Nutzer zugeteilt waren,
    // muessen die Zuweisung verlieren - der ist fuer dieses Projekt nicht mehr waehlbar.
    const stillValid = new Set(card.assignees);
    db.tokens.forEach((t) => {
      if (t.cardId === card.id && t.assigneeId != null && !stillValid.has(t.assigneeId)) {
        t.assigneeId = null;
      }
    });
  }
  // startDate wird bewusst nie hier gesetzt - das ist immer der Erstellungszeitpunkt.
  if (targetDate !== undefined && (targetDate || null) !== card.targetDate) {
    changedParts.push("Ziel-Datum");
    card.targetDate = targetDate || null;
  }
  if (
    (customerNumber !== undefined && customerNumber !== (card.customerNumber || "")) ||
    (contactName !== undefined && contactName !== (card.contactName || "")) ||
    (contactPhone !== undefined && contactPhone !== (card.contactPhone || "")) ||
    (contactEmail !== undefined && contactEmail !== (card.contactEmail || ""))
  ) {
    changedParts.push("Kundendaten");
  }
  if (customerNumber !== undefined) card.customerNumber = customerNumber;
  if (contactName !== undefined) card.contactName = contactName;
  if (contactPhone !== undefined) card.contactPhone = contactPhone;
  if (contactEmail !== undefined) card.contactEmail = contactEmail;

  let newTokens = [];
  if (tags !== undefined) {
    const cleanTags = normalizeTags(tags);
    const existingKeys = new Set((card.tags || []).map((t) => t.tagKey));
    const addedTags = cleanTags.filter((t) => !existingKeys.has(t.tagKey));
    card.tags = cleanTags;

    if (addedTags.length) {
      changedParts.push("Tags");
      const targetListId = nextListId(db, card.listId);
      newTokens = addedTags.map((tag, i) => ({
        id: nextId(db.tokens) + i,
        cardId: card.id,
        tagKey: tag.tagKey,
        tagLabel: tag.tagLabel,
        listId: targetListId,
        position: itemCountInList(db, targetListId) + i,
        assigneeId: null,
        note: null,
      }));
      db.tokens.push(...newTokens);
    }
  }

  if (changedParts.length) {
    logActivity(
      db,
      req.user,
      "card.update",
      `${req.user?.name || "Jemand"} hat bei "${card.title}" ${changedParts.join(", ")} geaendert`,
      { cardTitle: card.title }
    );
  }
  writeDB(db);
  res.json({ card, tokens: newTokens });
});

app.delete("/api/cards/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const card = db.cards.find((c) => c.id === id);
  db.attachments
    .filter((a) => a.cardId === id && a.type === "file")
    .forEach((a) => deleteUploadedFile(a.url));
  db.cards = db.cards.filter((c) => c.id !== id);
  db.tokens = db.tokens.filter((t) => t.cardId !== id);
  db.attachments = db.attachments.filter((a) => a.cardId !== id);
  if (card) {
    logActivity(db, req.user, "card.delete", `${req.user?.name || "Jemand"} hat das Projekt "${card.title}" geloescht`, { cardTitle: card.title });
  }
  writeDB(db);
  res.status(204).end();
});

// --- Archiv ---
// Ein Projekt kann erst archiviert werden, wenn es mindestens einen Tag hat
// und ALLE seine Tags in der fixierten "Umgesetzt"-Spalte liegen.
app.post("/api/cards/:id/archive", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const card = db.cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ error: "Karte nicht gefunden" });

  const pinnedList = db.lists.find((l) => l.pinnedRight);
  const cardTokens = db.tokens.filter((t) => t.cardId === id);
  const allInPinnedList =
    pinnedList && cardTokens.length > 0 && cardTokens.every((t) => t.listId === pinnedList.id);
  if (!allInPinnedList) {
    return res.status(400).json({
      error: "Projekt kann erst archiviert werden, wenn alle Tags auf 'Umgesetzt' liegen",
    });
  }

  const cardAttachments = db.attachments.filter((a) => a.cardId === id);

  if (!db.archivedProjects) db.archivedProjects = [];
  const archived = {
    id: nextId(db.archivedProjects),
    title: card.title,
    description: card.description || "",
    tags: card.tags || [],
    assignees: card.assignees || [],
    startDate: card.startDate,
    targetDate: card.targetDate,
    archivedAt: new Date().toISOString().slice(0, 10),
    attachments: cardAttachments.map((a) => ({ ...a })),
    customerNumber: card.customerNumber || "",
    contactName: card.contactName || "",
    contactPhone: card.contactPhone || "",
    contactEmail: card.contactEmail || "",
  };
  db.archivedProjects.push(archived);

  // Karte und Tags aus dem aktiven Board entfernen. Anhaenge (Dateien/Links)
  // bleiben erhalten - sie wandern mit ins Archiv statt geloescht zu werden.
  db.cards = db.cards.filter((c) => c.id !== id);
  db.tokens = db.tokens.filter((t) => t.cardId !== id);
  db.attachments = db.attachments.filter((a) => a.cardId !== id);

  logActivity(db, req.user, "card.archive", `${req.user?.name || "Jemand"} hat das Projekt "${archived.title}" archiviert`, { cardTitle: archived.title });
  writeDB(db);
  res.status(201).json(archived);
});

// Ein archiviertes Projekt wieder auf dem Board anlegen - in der Ausgangslage,
// so wie ein frisch neu erstelltes Projekt: ganz in der "Projekte"-Liste,
// die Tags starten wieder in der ersten Arbeits-Spalte, neues Start-Datum,
// kein Ziel-Datum. Titel, Tags, Zustaendige, Beschreibung, Anhaenge und
// Kundendaten bleiben erhalten.
app.post("/api/archive/:id/restore", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  if (!db.archivedProjects) db.archivedProjects = [];
  const archivedIndex = db.archivedProjects.findIndex((p) => p.id === id);
  if (archivedIndex === -1) return res.status(404).json({ error: "Archiv-Eintrag nicht gefunden" });
  const archived = db.archivedProjects[archivedIndex];

  const projectList = db.lists.find((l) => l.protected);
  if (!projectList) return res.status(500).json({ error: "Projekte-Liste nicht gefunden" });

  const cleanTags = normalizeTags(archived.tags);
  const today = new Date().toISOString().slice(0, 10);
  const newCard = {
    id: nextId(db.cards),
    listId: projectList.id,
    title: archived.title,
    description: archived.description || "",
    position: itemCountInList(db, projectList.id),
    tags: cleanTags,
    assignees: normalizeAssignees(archived.assignees, db),
    startDate: today,
    targetDate: null,
    customerNumber: archived.customerNumber || "",
    contactName: archived.contactName || "",
    contactPhone: archived.contactPhone || "",
    contactEmail: archived.contactEmail || "",
  };
  db.cards.push(newCard);

  const targetListId = nextListId(db, projectList.id);
  const newTokens = cleanTags.map((tag, i) => ({
    id: nextId(db.tokens) + i,
    cardId: newCard.id,
    tagKey: tag.tagKey,
    tagLabel: tag.tagLabel,
    listId: targetListId,
    position: itemCountInList(db, targetListId) + i,
    assigneeId: null,
  }));
  db.tokens.push(...newTokens);

  const newAttachments = (archived.attachments || []).map((a, i) => ({
    id: nextId(db.attachments) + i,
    cardId: newCard.id,
    type: a.type,
    label: a.label,
    url: a.url,
    ...(a.mimeType !== undefined ? { mimeType: a.mimeType } : {}),
    ...(a.size !== undefined ? { size: a.size } : {}),
  }));
  db.attachments.push(...newAttachments);

  db.archivedProjects.splice(archivedIndex, 1);

  logActivity(db, req.user, "card.restore", `${req.user?.name || "Jemand"} hat das Projekt "${newCard.title}" aus dem Archiv wiederhergestellt`, { cardTitle: newCard.title });
  writeDB(db);
  res.status(201).json({ card: newCard, tokens: newTokens, attachments: newAttachments });
});

// Archiviertes Projekt endgueltig loeschen (inkl. hochgeladener Anhaenge).
app.delete("/api/archive/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  if (!db.archivedProjects) db.archivedProjects = [];
  const archived = db.archivedProjects.find((p) => p.id === id);
  if (!archived) return res.status(404).json({ error: "Archiv-Eintrag nicht gefunden" });

  (archived.attachments || [])
    .filter((a) => a.type === "file")
    .forEach((a) => deleteUploadedFile(a.url));

  db.archivedProjects = db.archivedProjects.filter((p) => p.id !== id);
  logActivity(db, req.user, "card.delete_archived", `${req.user?.name || "Jemand"} hat das archivierte Projekt "${archived.title}" endgueltig geloescht`, { cardTitle: archived.title });
  writeDB(db);
  res.status(204).end();
});

// --- Anhaenge (Web-Links oder hochgeladene Dateien) ---
function deleteUploadedFile(url) {
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(url)));
  } catch (err) {
    // Datei war schon weg - kein Problem.
  }
}

app.post("/api/cards/:cardId/attachments", (req, res) => {
  const db = readDB();
  const cardId = Number(req.params.cardId);
  const card = db.cards.find((c) => c.id === cardId);
  if (!card) return res.status(404).json({ error: "Karte nicht gefunden" });

  const { type, label, url, dataUrl, fileName, mimeType } = req.body;

  if (type === "link") {
    if (!url || !url.trim()) {
      return res.status(400).json({ error: "url ist erforderlich" });
    }
    const attachment = {
      id: nextId(db.attachments),
      cardId,
      type: "link",
      label: (label && label.trim()) || url.trim(),
      url: url.trim(),
    };
    db.attachments.push(attachment);
    logActivity(db, req.user, "attachment.add", `${req.user?.name || "Jemand"} hat den Link "${attachment.label}" zu "${card.title}" hinzugefuegt`, { cardTitle: card.title });
    writeDB(db);
    return res.status(201).json(attachment);
  }

  if (type === "file") {
    const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || "");
    if (!match) {
      return res.status(400).json({ error: "Ungueltige Datei" });
    }
    const mime = mimeType || match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = fileName && fileName.includes(".") ? fileName.split(".").pop() : (mime.split("/")[1] || "bin");
    const storedName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buffer);

    const attachment = {
      id: nextId(db.attachments),
      cardId,
      type: "file",
      label: (label && label.trim()) || fileName || storedName,
      url: `/uploads/${storedName}`,
      mimeType: mime,
      size: buffer.length,
    };
    db.attachments.push(attachment);
    logActivity(db, req.user, "attachment.add", `${req.user?.name || "Jemand"} hat die Datei "${attachment.label}" zu "${card.title}" hinzugefuegt`, { cardTitle: card.title });
    writeDB(db);
    return res.status(201).json(attachment);
  }

  res.status(400).json({ error: "type muss 'link' oder 'file' sein" });
});

app.delete("/api/attachments/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const attachment = db.attachments.find((a) => a.id === id);
  if (attachment && attachment.type === "file") {
    deleteUploadedFile(attachment.url);
  }
  db.attachments = db.attachments.filter((a) => a.id !== id);
  if (attachment) {
    const card = db.cards.find((c) => c.id === attachment.cardId);
    logActivity(db, req.user, "attachment.delete", `${req.user?.name || "Jemand"} hat den Anhang "${attachment.label}" von "${card?.title || "?"}" entfernt`, { cardTitle: card?.title });
  }
  writeDB(db);
  res.status(204).end();
});

// --- Tag-Tokens (einzelne, verschiebbare Tags auf dem Board) ---
app.patch("/api/tokens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const token = db.tokens.find((t) => t.id === id);
  if (!token) return res.status(404).json({ error: "Token nicht gefunden" });

  const { listId, position, assigneeId, note } = req.body;
  const card = db.cards.find((c) => c.id === token.cardId);
  const tagLabel = token.tagLabel || getTagLabelFallback(db, token.tagKey);

  // Spalten-Wechsel (Stage-Move) wird geloggt, reine Umsortierung innerhalb
  // derselben Spalte (nur position) bewusst nicht - sonst spammt jedes
  // Drag&Drop das Journal.
  if (listId !== undefined && listId !== token.listId) {
    const oldList = db.lists.find((l) => l.id === token.listId);
    const newList = db.lists.find((l) => l.id === listId);
    token.listId = listId;
    logActivity(
      db,
      req.user,
      "token.move",
      `${req.user?.name || "Jemand"} hat "${tagLabel}" bei "${card?.title || "?"}" von "${oldList?.title || "?"}" nach "${newList?.title || "?"}" verschoben`,
      { cardTitle: card?.title }
    );
  }
  if (position !== undefined) token.position = position;
  if (assigneeId !== undefined) {
    if (assigneeId === null) {
      if (token.assigneeId != null) {
        const prevUser = db.users.find((u) => u.id === token.assigneeId);
        logActivity(db, req.user, "token.assignee", `${req.user?.name || "Jemand"} hat die Zuweisung von "${tagLabel}" bei "${card?.title || "?"}"${prevUser ? ` (${prevUser.name})` : ""} entfernt`, { cardTitle: card?.title });
      }
      token.assigneeId = null;
    } else {
      const allowed = card && Array.isArray(card.assignees) && card.assignees.includes(assigneeId);
      if (!allowed) {
        return res.status(400).json({ error: "Nutzer ist diesem Projekt nicht zugewiesen" });
      }
      token.assigneeId = assigneeId;
      const newUser = db.users.find((u) => u.id === assigneeId);
      logActivity(db, req.user, "token.assignee", `${req.user?.name || "Jemand"} hat "${tagLabel}" bei "${card?.title || "?"}" ${newUser ? newUser.name : "jemandem"} zugewiesen`, { cardTitle: card?.title });
    }
  }
  if (note !== undefined) {
    const cleanNote = (note || "").trim() || null;
    if (cleanNote !== token.note) {
      token.note = cleanNote;
      if (cleanNote) {
        logActivity(db, req.user, "token.note", `${req.user?.name || "Jemand"} hat eine Notiz zu "${tagLabel}" bei "${card?.title || "?"}" hinterlegt`, { cardTitle: card?.title });
      } else {
        logActivity(db, req.user, "token.note", `${req.user?.name || "Jemand"} hat die Notiz zu "${tagLabel}" bei "${card?.title || "?"}" entfernt`, { cardTitle: card?.title });
      }
    }
  }

  writeDB(db);
  res.json(token);
});

app.delete("/api/tokens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const token = db.tokens.find((t) => t.id === id);
  db.tokens = db.tokens.filter((t) => t.id !== id);
  if (token) {
    const card = db.cards.find((c) => c.id === token.cardId);
    const tagLabel = token.tagLabel || getTagLabelFallback(db, token.tagKey);
    logActivity(db, req.user, "token.delete", `${req.user?.name || "Jemand"} hat "${tagLabel}" von "${card?.title || "?"}" entfernt`, { cardTitle: card?.title });
  }
  writeDB(db);
  res.status(204).end();
});

// --- Kalender / Verfuegbarkeit ---
// Zeitraeume, die einer Person zugeordnet sind und im Kalender in ihrer
// Farbe markiert werden (z.B. Urlaub, Termine, Home Office).
app.get("/api/availability", (req, res) => {
  const db = readDB();
  res.json({ entries: db.availability || [] });
});

app.post("/api/availability", (req, res) => {
  const db = readDB();
  if (!db.availability) db.availability = [];
  const { userId, start, end, title } = req.body;
  const user = db.users.find((u) => u.id === Number(userId));
  if (!user) return res.status(400).json({ error: "Teammitglied nicht gefunden" });
  if (!start || !end) return res.status(400).json({ error: "start und end sind erforderlich" });
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    return res.status(400).json({ error: "Ende muss nach dem Start liegen" });
  }
  const entry = {
    id: nextId(db.availability),
    userId: user.id,
    start,
    end,
    title: (title || "").trim(),
    seriesId: null,
  };
  db.availability.push(entry);
  logActivity(
    db,
    req.user,
    "availability.create",
    `${req.user?.name || "Jemand"} hat einen Zeitraum fuer ${user.name} im Kalender hinzugefuegt (${formatIsoForLog(start)} - ${formatIsoForLog(end)})`
  );
  writeDB(db);
  res.status(201).json(entry);
});

// Legt mehrere Zeitraeume auf einmal an, die als zusammengehoerige "Serie"
// markiert werden (gemeinsame seriesId) - fuer vordefinierte Zeitraeume
// (die aus mehreren Bloecken bestehen, z.B. Rufbereitschaft Mo-Fr) und fuer
// woechentliche Wiederholungen. So laesst sich die ganze Serie spaeter mit
// einem Klick wieder entfernen, statt jeden Termin einzeln loeschen zu muessen.
app.post("/api/availability/bulk", (req, res) => {
  const db = readDB();
  if (!db.availability) db.availability = [];
  const rawEntries = req.body.entries;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return res.status(400).json({ error: "entries darf nicht leer sein" });
  }
  if (rawEntries.length > 500) {
    return res.status(400).json({ error: "Zu viele Zeitraeume auf einmal (max. 500)" });
  }
  const created = [];
  const seriesId = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
  for (const raw of rawEntries) {
    const { userId, start, end, title } = raw || {};
    const user = db.users.find((u) => u.id === Number(userId));
    if (!user) return res.status(400).json({ error: "Teammitglied nicht gefunden" });
    if (!start || !end) return res.status(400).json({ error: "start und end sind erforderlich" });
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      return res.status(400).json({ error: "Ende muss nach dem Start liegen" });
    }
    created.push({
      id: nextId(db.availability) + created.length,
      userId: user.id,
      start,
      end,
      title: (title || "").trim(),
      seriesId,
    });
  }
  db.availability.push(...created);
  const firstUser = db.users.find((u) => u.id === created[0].userId);
  logActivity(
    db,
    req.user,
    "availability.create_bulk",
    `${req.user?.name || "Jemand"} hat ${created.length} Zeitraeume fuer ${firstUser?.name || "?"} im Kalender hinzugefuegt (Serie)`
  );
  writeDB(db);
  res.status(201).json({ entries: created });
});

app.delete("/api/availability/series/:seriesId", (req, res) => {
  const db = readDB();
  if (!db.availability) db.availability = [];
  const seriesId = req.params.seriesId;
  const toRemove = db.availability.filter((e) => e.seriesId === seriesId);
  db.availability = db.availability.filter((e) => e.seriesId !== seriesId);
  if (toRemove.length) {
    const user = db.users.find((u) => u.id === toRemove[0].userId);
    logActivity(
      db,
      req.user,
      "availability.delete_bulk",
      `${req.user?.name || "Jemand"} hat eine Serie von ${toRemove.length} Zeitraeumen fuer ${user?.name || "?"} im Kalender entfernt`
    );
  }
  writeDB(db);
  res.status(204).end();
});

app.delete("/api/availability/:id", (req, res) => {
  const db = readDB();
  if (!db.availability) db.availability = [];
  const id = Number(req.params.id);
  const entry = db.availability.find((e) => e.id === id);
  db.availability = db.availability.filter((e) => e.id !== id);
  if (entry) {
    const user = db.users.find((u) => u.id === entry.userId);
    logActivity(
      db,
      req.user,
      "availability.delete",
      `${req.user?.name || "Jemand"} hat einen Zeitraum fuer ${user?.name || "?"} im Kalender entfernt (${formatIsoForLog(entry.start)} - ${formatIsoForLog(entry.end)})`
    );
  }
  writeDB(db);
  res.status(204).end();
});

// Alles, was keine /api- oder /uploads-Route ist, bekommt die Frontend-App
// (index.html) ausgeliefert - so funktioniert auch direktes Aufrufen von
// Unterseiten. Muss ganz am Ende stehen, nach allen echten Routen.
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  const indexFile = path.join(FRONTEND_DIST, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("Frontend nicht gebaut. Erst 'npm run build' im frontend-Ordner ausfuehren.");
  }
});

app.listen(PORT, () => {
  const db = readDB();
  const authOn = db.users.some((u) => u.passwordHash);
  console.log(`Kanban-Backend laeuft auf http://localhost:${PORT}`);
  console.log(
    `Login-Pflicht: ${authOn ? "aktiv (mind. ein Nutzer hat ein Passwort)" : "aus - noch kein Nutzer-Passwort gesetzt"}`
  );
  if (!process.env.JWT_SECRET) {
    console.log("Hinweis: JWT_SECRET ist nicht gesetzt - fuer echtes Hosting per Umgebungsvariable setzen.");
  }
});
