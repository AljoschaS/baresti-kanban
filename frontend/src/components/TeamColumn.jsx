import { useState } from "react";
import AvatarCropper from "./AvatarCropper";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Fuer "Passwort vergessen": statt E-Mail-Versand kann jede eingeloggte
// Person hier ein starkes Zufallspasswort erzeugen und es der betroffenen
// Person persoenlich (Slack/WhatsApp/etc.) weitergeben.
function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// Fixierte Spalte ganz links: Team-Mitglieder verwalten (hinzufuegen,
// umbenennen, entfernen, Profilbild + Farbe festlegen).
export default function TeamColumn({ users, onAddUser, onUpdateUser, onDeleteUser }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0052CC");
  const [newAvatar, setNewAvatar] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [addError, setAddError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#0052CC");
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [editingPasswordVisible, setEditingPasswordVisible] = useState(false);
  const [editError, setEditError] = useState(null);

  // cropTarget: "new" oder eine Nutzer-ID, damit der Cropper weiss,
  // wessen Avatar-State er nach dem Zuschneiden befuellen soll.
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);

  async function handleFileSelected(e, target) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setCropSrc(dataUrl);
    setCropTarget(target);
  }

  function handleCropConfirm(dataUrl) {
    if (cropTarget === "new") setNewAvatar(dataUrl);
    else setEditingAvatar(dataUrl);
    setCropSrc(null);
    setCropTarget(null);
  }

  async function submitNewUser(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddError(null);
    try {
      await onAddUser(newName.trim(), {
        color: newColor,
        avatar: newAvatar,
        email: newEmail.trim(),
        password: newPassword,
      });
      setNewName("");
      setNewColor("#0052CC");
      setNewAvatar(null);
      setNewEmail("");
      setNewPassword("");
      setNewPasswordVisible(false);
      setAdding(false);
    } catch (err) {
      setAddError(err.message);
    }
  }

  function startEdit(user) {
    setEditingId(user.id);
    setEditingName(user.name);
    setEditingColor(user.color || "#0052CC");
    setEditingAvatar(user.avatar || null);
    setEditingEmail(user.email || "");
    setEditingPassword("");
    setEditingPasswordVisible(false);
    setEditError(null);
  }

  function handleGeneratePassword() {
    setEditingPassword(generatePassword());
    setEditingPasswordVisible(true);
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editingName.trim()) return;
    setEditError(null);
    try {
      await onUpdateUser(editingId, {
        name: editingName.trim(),
        color: editingColor,
        avatar: editingAvatar,
        email: editingEmail.trim(),
        password: editingPassword,
      });
      setEditingId(null);
    } catch (err) {
      setEditError(err.message);
    }
  }

  return (
    <div className="list team-column">
      <div className="list-header">
        <h3>Team</h3>
      </div>

      <div className="list-cards">
        {users.map((user) =>
          editingId === user.id ? (
            <form key={user.id} className="add-card-form" onSubmit={submitEdit}>
              <div className="avatar-picker-row">
                {editingAvatar ? (
                  <img
                    className="avatar"
                    src={editingAvatar}
                    width={40}
                    height={40}
                    style={{ border: `2px solid ${editingColor}` }}
                    alt=""
                  />
                ) : (
                  <span className="user-dot" style={{ background: editingColor, width: 20, height: 20 }} />
                )}
                <label className="avatar-upload-btn">
                  Bild waehlen
                  <input type="file" accept="image/*" onChange={(e) => handleFileSelected(e, user.id)} hidden />
                </label>
              </div>
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
              <div className="color-picker-row">
                <label>Farbe</label>
                <input
                  type="color"
                  value={editingColor}
                  onChange={(e) => setEditingColor(e.target.value)}
                />
              </div>
              <input
                type="email"
                value={editingEmail}
                onChange={(e) => setEditingEmail(e.target.value)}
                placeholder="E-Mail (fuer Login)"
              />
              <div className="password-reset-row">
                <input
                  type={editingPasswordVisible ? "text" : "password"}
                  value={editingPassword}
                  onChange={(e) => setEditingPassword(e.target.value)}
                  placeholder="Neues Passwort (leer = unveraendert)"
                  autoComplete="new-password"
                />
                <button type="button" className="password-generate-btn" onClick={handleGeneratePassword}>
                  Zufaellig generieren
                </button>
                {editingPassword && (
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setEditingPasswordVisible((v) => !v)}
                    aria-label={editingPasswordVisible ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {editingPasswordVisible ? "Verbergen" : "Anzeigen"}
                  </button>
                )}
              </div>
              {editingPasswordVisible && editingPassword && (
                <div className="password-reset-hint">
                  Bitte jetzt notieren/kopieren und der Person persoenlich mitteilen - nach dem Speichern
                  ist es nicht mehr einsehbar.
                </div>
              )}
              {editError && <div className="login-error">{editError}</div>}
              <div className="add-card-actions">
                <button type="submit">Speichern</button>
                <button type="button" onClick={() => setEditingId(null)}>
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div key={user.id} className="user-card">
              {user.avatar ? (
                <img
                  className="avatar"
                  src={user.avatar}
                  width={24}
                  height={24}
                  style={{ border: `2px solid ${user.color}` }}
                  alt=""
                />
              ) : (
                <span className="user-dot" style={{ background: user.color }} />
              )}
              <span className="user-name">{user.name}</span>
              <div className="user-card-actions">
                <button onClick={() => startEdit(user)} aria-label="Umbenennen">
                  Bearbeiten
                </button>
                <button onClick={() => onDeleteUser(user.id)} aria-label="Entfernen">
                  x
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {adding ? (
        <form className="add-card-form" onSubmit={submitNewUser}>
          <div className="avatar-picker-row">
            {newAvatar ? (
              <img
                className="avatar"
                src={newAvatar}
                width={40}
                height={40}
                style={{ border: `2px solid ${newColor}` }}
                alt=""
              />
            ) : (
              <span className="user-dot" style={{ background: newColor, width: 20, height: 20 }} />
            )}
            <label className="avatar-upload-btn">
              Bild waehlen
              <input type="file" accept="image/*" onChange={(e) => handleFileSelected(e, "new")} hidden />
            </label>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
          />
          <div className="color-picker-row">
            <label>Farbe</label>
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          </div>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="E-Mail (fuer Login, optional)"
          />
          <div className="password-reset-row">
            <input
              type={newPasswordVisible ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Passwort (optional)"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-generate-btn"
              onClick={() => {
                setNewPassword(generatePassword());
                setNewPasswordVisible(true);
              }}
            >
              Zufaellig generieren
            </button>
            {newPassword && (
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setNewPasswordVisible((v) => !v)}
                aria-label={newPasswordVisible ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                {newPasswordVisible ? "Verbergen" : "Anzeigen"}
              </button>
            )}
          </div>
          {addError && <div className="login-error">{addError}</div>}
          <div className="add-card-actions">
            <button type="submit">Hinzufuegen</button>
            <button type="button" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setAdding(true)}>
          + Person
        </button>
      )}

      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setCropSrc(null);
            setCropTarget(null);
          }}
        />
      )}
    </div>
  );
}
