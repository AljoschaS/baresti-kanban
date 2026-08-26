import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Gemeinsame Logik fuer die kleinen Dropdowns/Popover an einer Projektkarte
// (Kundendaten, Links, Dateien):
//
// - Das Panel wird per Portal in document.body gerendert und mit
//   position:fixed platziert, weil das Board mehrere Vorfahren mit
//   overflow:hidden/auto hat (.kanban-frame, .swimlane-scroll), die ein
//   normal verschachteltes Popover abschneiden wuerden.
// - Nach dem Oeffnen wird die tatsaechliche Panel-Groesse gemessen und die
//   Position bei Bedarf korrigiert (nach oben aufklappen bzw. horizontal
//   einruecken), damit nichts ausserhalb des sichtbaren Fensters landet -
//   z.B. auf einem 13-Zoll-Laptop mit weit unten liegender Karte.
// - Schliesst bei Klick ausserhalb und bei Escape.
export function usePopoverPosition() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  function openAt() {
    const rect = triggerRef.current.getBoundingClientRect();
    // Erste, optimistische Platzierung unterhalb des Buttons - wird direkt
    // im Anschluss vom Layout-Effect korrigiert.
    setCoords({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !triggerRef.current) return;
    const margin = 10;
    const trigger = triggerRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current.offsetHeight;
    const panelWidth = panelRef.current.offsetWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - trigger.bottom - margin;
    const spaceAbove = trigger.top - margin;
    let top;
    if (panelHeight <= spaceBelow || spaceBelow >= spaceAbove) {
      top = trigger.bottom + 6;
    } else {
      top = trigger.top - panelHeight - 6;
    }
    top = Math.max(margin, Math.min(top, vh - margin - Math.min(panelHeight, vh - 2 * margin)));

    let left = trigger.left;
    if (left + panelWidth > vw - margin) left = vw - margin - panelWidth;
    if (left < margin) left = margin;

    const maxHeight = vh - 2 * margin;

    setCoords((prev) =>
      prev && prev.top === top && prev.left === left && prev.maxHeight === maxHeight
        ? prev
        : { top, left, maxHeight }
    );
  }, [open]);

  const panelStyle = coords
    ? { top: coords.top, left: coords.left, maxHeight: coords.maxHeight }
    : null;

  return { open, openAt, close, triggerRef, panelRef, panelStyle };
}
