import { useEffect, useRef, useState } from "react";

// Generischer Dropdown-Knopf fuer die Topbar (z.B. "Team", "Tags"): zeigt
// beim Klick ein Panel mit beliebigem Inhalt darunter an, schliesst sich
// automatisch bei Klick ausserhalb oder mit Escape.
export default function TopBarDropdown({ label, count, children }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="topbar-dropdown" ref={wrapperRef}>
      <button
        type="button"
        className={"site-menu-item topbar-dropdown-trigger" + (open ? " active" : "")}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {typeof count === "number" && <span className="topbar-dropdown-count">{count}</span>}
      </button>
      {open && <div className="topbar-dropdown-panel">{children}</div>}
    </div>
  );
}
