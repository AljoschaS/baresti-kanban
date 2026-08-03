// Mehrfachauswahl der Team-Mitglieder, die einem Projekt zugeordnet sind.
// "selectedIds" ist ein Array von Nutzer-IDs.
export default function UserPicker({ users, selectedIds, onChange }) {
  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (!users.length) {
    return <div className="user-picker-empty">Noch keine Team-Mitglieder angelegt (links in der Team-Spalte).</div>;
  }

  return (
    <div className="user-picker">
      {users.map((user) => {
        const selected = selectedIds.includes(user.id);
        return (
          <button
            type="button"
            key={user.id}
            className={"user-picker-option" + (selected ? " selected" : "")}
            style={{
              borderColor: user.color,
              background: selected ? user.color : "transparent",
              color: selected ? "#fff" : "#42526e",
            }}
            onClick={() => toggle(user.id)}
          >
            {user.avatar ? (
              <img className="avatar" src={user.avatar} width={16} height={16} style={{ border: "2px solid #fff" }} alt="" />
            ) : (
              <span className="user-dot" style={{ background: selected ? "#fff" : user.color }} />
            )}
            {user.name}
          </button>
        );
      })}
    </div>
  );
}
