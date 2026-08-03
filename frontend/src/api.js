// Im lokalen Dev-Betrieb laeuft das Frontend (Vite, Port 5173) getrennt vom
// Backend (Port 4000). Im fertig gebauten Produktions-Build liefert der
// Backend-Server das Frontend selbst mit aus - dann reichen relative URLs
// (gleicher Ursprung), was auch unter einer echten Domain funktioniert.
const API_ORIGIN = import.meta.env.DEV ? "http://localhost:4000" : "";
const API_BASE = `${API_ORIGIN}/api`;

// Hochgeladene Dateien liegen unter /uploads (nicht unter /api) auf dem Server.
export function resolveFileUrl(url) {
  return url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request fehlgeschlagen: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getBoard: () => request("/board"),

  createList: (title) =>
    request("/lists", { method: "POST", body: JSON.stringify({ title }) }),
  updateList: (id, data) =>
    request(`/lists/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteList: (id) => request(`/lists/${id}`, { method: "DELETE" }),

  createCard: (listId, title, extra = {}) =>
    request("/cards", {
      method: "POST",
      body: JSON.stringify({ listId, title, ...extra }),
    }),
  updateCard: (id, data) =>
    request(`/cards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: "DELETE" }),

  updateToken: (id, data) =>
    request(`/tokens/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteToken: (id) => request(`/tokens/${id}`, { method: "DELETE" }),

  createUser: (name, extra = {}) =>
    request("/users", { method: "POST", body: JSON.stringify({ name, ...extra }) }),
  updateUser: (id, data) =>
    request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  addAttachment: (cardId, data) =>
    request(`/cards/${cardId}/attachments`, { method: "POST", body: JSON.stringify(data) }),
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: "DELETE" }),

  archiveCard: (cardId) => request(`/cards/${cardId}/archive`, { method: "POST" }),
  restoreArchivedProject: (archivedId) =>
    request(`/archive/${archivedId}/restore`, { method: "POST" }),

  createTag: (label, color) =>
    request("/tags", { method: "POST", body: JSON.stringify({ label, color }) }),
  updateTag: (key, data) =>
    request(`/tags/${key}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTag: (key) => request(`/tags/${key}`, { method: "DELETE" }),
};
