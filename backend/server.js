const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
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
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
}

// --- Passwortschutz (HTTP Basic Auth) ---
// Nur aktiv, wenn BASIC_AUTH_USER/BASIC_AUTH_PASS gesetzt sind - lokal beim
// Entwickeln bleibt es ohne Login. Schuetzt Frontend UND API gleichermassen.
function checkBasicAuth(req, res, next) {
  const authUser = process.env.BASIC_AUTH_USER;
  const authPass = process.env.BASIC_AUTH_PASS;
  if (!authUser || !authPass) return next();

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const sep = decoded.indexOf(":");
    const reqUser = decoded.slice(0, sep);
    const reqPass = decoded.slice(sep + 1);
    if (reqUser === authUser && reqPass === authPass) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Baresti GmbH Kanban"');
  res.status(401).send("Zugriff verweigert");
}
app.use(checkBasicAuth);

app.use(cors());
// Hoeheres Limit, da Profilbilder/Datei-Anhaenge als Base64-Text im JSON-Body mitgeschickt werden.
app.use(express.json({ limit: "8mb" }));
// Hochgeladene Dateien liegen unter backend/uploads/ und werden hier ausgeliefert.
app.use("/uploads", express.static(UPLOADS_DIR));
// Das gebaute Frontend (falls vorhanden) ausliefern.
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

function normalizeAssignees(assignees, db) {
  if (!Array.isArray(assignees)) return [];
  const validIds = new Set(db.users.map((u) => u.id));
  return [...new Set(assignees.map(Number))].filter((id) => validIds.has(id));
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
  const users = [...db.users].sort((a, b) => a.position - b.position);
  const archive = [...(db.archivedProjects || [])].sort((a, b) => b.id - a.id);
  const tags = db.tags || [];
  res.json({ lists, users, archive, tags });
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
  writeDB(db);
  res.json(tag);
});

app.delete("/api/tags/:key", (req, res) => {
  const db = readDB();
  if (!db.tags) db.tags = [];
  const key = req.params.key;
  const exists = db.tags.some((t) => t.key === key);
  if (!exists) return res.status(404).json({ error: "Tag nicht gefunden" });

  db.tags = db.tags.filter((t) => t.key !== key);
  // Diesen Tag ueberall entfernen, wo er gerade zugewiesen ist: von den
  // Projekt-Karten selbst und von allen noch offenen Tag-Tokens auf dem Board.
  db.cards.forEach((c) => {
    if (Array.isArray(c.tags)) {
      c.tags = c.tags.filter((t) => t.tagKey !== key);
    }
  });
  db.tokens = db.tokens.filter((t) => t.tagKey !== key);

  writeDB(db);
  res.status(204).end();
});

// --- Team-Mitglieder ---
app.post("/api/users", (req, res) => {
  const db = readDB();
  const { name, color, avatar } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name ist erforderlich" });
  }
  const newUser = {
    id: nextId(db.users),
    name: name.trim(),
    color: color || USER_COLORS[db.users.length % USER_COLORS.length],
    avatar: avatar || null,
    position: db.users.length,
  };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

app.patch("/api/users/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const user = db.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: "Nutzer nicht gefunden" });
  if (req.body.name !== undefined && req.body.name.trim()) {
    user.name = req.body.name.trim();
  }
  if (req.body.color !== undefined) {
    user.color = req.body.color;
  }
  if (req.body.avatar !== undefined) {
    user.avatar = req.body.avatar;
  }
  writeDB(db);
  res.json(user);
});

app.delete("/api/users/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.users = db.users.filter((u) => u.id !== id);
  db.cards.forEach((c) => {
    if (Array.isArray(c.assignees)) {
      c.assignees = c.assignees.filter((uid) => uid !== id);
    }
  });
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
  writeDB(db);
  res.status(201).json(newList);
});

app.patch("/api/lists/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const list = db.lists.find((l) => l.id === id);
  if (!list) return res.status(404).json({ error: "Liste nicht gefunden" });
  if (req.body.title !== undefined) list.title = req.body.title;
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
  }));
  db.tokens.push(...newTokens);

  writeDB(db);
  res.status(201).json({ card: newCard, tokens: newTokens });
});

app.patch("/api/cards/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const card = db.cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ error: "Karte nicht gefunden" });

  const { title, description, listId, position, tags, assignees, targetDate } = req.body;
  if (title !== undefined) card.title = title;
  if (description !== undefined) card.description = description;
  if (listId !== undefined) card.listId = listId;
  if (position !== undefined) card.position = position;
  if (assignees !== undefined) card.assignees = normalizeAssignees(assignees, db);
  // startDate wird bewusst nie hier gesetzt - das ist immer der Erstellungszeitpunkt.
  if (targetDate !== undefined) card.targetDate = targetDate || null;

  let newTokens = [];
  if (tags !== undefined) {
    const cleanTags = normalizeTags(tags);
    const existingKeys = new Set((card.tags || []).map((t) => t.tagKey));
    const addedTags = cleanTags.filter((t) => !existingKeys.has(t.tagKey));
    card.tags = cleanTags;

    if (addedTags.length) {
      const targetListId = nextListId(db, card.listId);
      newTokens = addedTags.map((tag, i) => ({
        id: nextId(db.tokens) + i,
        cardId: card.id,
        tagKey: tag.tagKey,
        tagLabel: tag.tagLabel,
        listId: targetListId,
        position: itemCountInList(db, targetListId) + i,
      }));
      db.tokens.push(...newTokens);
    }
  }

  writeDB(db);
  res.json({ card, tokens: newTokens });
});

app.delete("/api/cards/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.attachments
    .filter((a) => a.cardId === id && a.type === "file")
    .forEach((a) => deleteUploadedFile(a.url));
  db.cards = db.cards.filter((c) => c.id !== id);
  db.tokens = db.tokens.filter((t) => t.cardId !== id);
  db.attachments = db.attachments.filter((a) => a.cardId !== id);
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
  };
  db.archivedProjects.push(archived);

  // Karte und Tags aus dem aktiven Board entfernen. Anhaenge (Dateien/Links)
  // bleiben erhalten - sie wandern mit ins Archiv statt geloescht zu werden.
  db.cards = db.cards.filter((c) => c.id !== id);
  db.tokens = db.tokens.filter((t) => t.cardId !== id);
  db.attachments = db.attachments.filter((a) => a.cardId !== id);

  writeDB(db);
  res.status(201).json(archived);
});

// Ein archiviertes Projekt wieder auf dem Board anlegen - in der Ausgangslage,
// so wie ein frisch neu erstelltes Projekt: ganz in der "Projekte"-Liste,
// die Tags starten wieder in der ersten Arbeits-Spalte, neues Start-Datum,
// kein Ziel-Datum. Titel, Tags, Zustaendige, Beschreibung und Anhaenge bleiben erhalten.
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

  writeDB(db);
  res.status(201).json({ card: newCard, tokens: newTokens, attachments: newAttachments });
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
  writeDB(db);
  res.status(204).end();
});

// --- Tag-Tokens (einzelne, verschiebbare Tags auf dem Board) ---
app.patch("/api/tokens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const token = db.tokens.find((t) => t.id === id);
  if (!token) return res.status(404).json({ error: "Token nicht gefunden" });

  const { listId, position } = req.body;
  if (listId !== undefined) token.listId = listId;
  if (position !== undefined) token.position = position;

  writeDB(db);
  res.json(token);
});

app.delete("/api/tokens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.tokens = db.tokens.filter((t) => t.id !== id);
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
  const authOn = Boolean(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS);
  console.log(`Kanban-Backend laeuft auf http://localhost:${PORT}`);
  console.log(`Passwortschutz: ${authOn ? "aktiv" : "aus (lokale Entwicklung)"}`);
});
