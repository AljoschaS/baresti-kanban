import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ContactIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6.3" cy="6.6" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.8 11.2c.3-1.5 1.4-2.3 2.5-2.3s2.2.8 2.5 2.3M9.6 5.8h3M9.6 8.2h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// Kundennummer + Ansprechpartner (Name/Telefon/E-Mail) fuer ein Projekt.
// Wird als kleiner Button neben "+ Link"/"+ Datei" angezeigt und oeffnet ein
// Popover mit den Eingabefeldern. Das Panel wird per Portal direkt in
// document.body gerendert (nicht im normalen DOM-Baum), weil das Board
// mehrere Vorfahren mit overflow:hidden/auto hat (.kanban-frame,
// .swimlane-scroll), die ein normal-positioniertes Popover abschneiden wuerden.
export default function CustomerInfoPopover({ card, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [customerNumber, setCustomerNumber] = useState(card.customerNumber || "");
  const [contactName, setContactName] = useState(card.contactName || "");
  const [contactPhone, setContactPhone] = useState(card.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(card.contactEmail || "");
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const hasData = Boolean(
    (card.customerNumber && card.customerNumber.trim()) ||
      (card.contactName && card.contactName.trim()) ||
      (card.contactPhone && card.contactPhone.trim()) ||
      (card.contactEmail && card.contactEmail.trim())
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        close();
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openPopover(e) {
    e.stopPropagation();
    setCustomerNumber(card.customerNumber || "");
    setContactName(card.contactName || "");
    setContactPhone(card.contactPhone || "");
    setContactEmail(card.contactEmail || "");
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function save(e) {
    e.preventDefault();
    onUpdate(card.id, {
      customerNumber: customerNumber.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={"attachment-add-btn customer-info-btn" + (hasData ? " has-data" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={openPopover}
        title={hasData ? "Kundendaten anzeigen/bearbeiten" : "Kundendaten hinzufuegen"}
      >
        <ContactIcon />
        {hasData ? card.customerNumber || card.contactName || "Kunde" : "+ Kunde"}
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            className="customer-info-panel"
            ref={panelRef}
            style={{ top: coords.top, left: coords.left }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={save}>
              <label>
                <span>Kundennummer</span>
                <input
                  autoFocus
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  placeholder="z.B. 10234"
                />
              </label>
              <label>
                <span>Ansprechpartner</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Name"
                />
              </label>
              <label>
                <span>Telefon</span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+41 ..."
                />
              </label>
              <label>
                <span>E-Mail</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@firma.ch"
                />
              </label>
              <div className="add-card-actions">
                <button type="submit">Speichern</button>
                <button type="button" onClick={close}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
