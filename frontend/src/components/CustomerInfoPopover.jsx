import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopoverPosition } from "../usePopoverPosition";

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
// Wird als kleiner Button neben "Link"/"Datei" angezeigt und oeffnet ein
// Popover mit den Eingabefeldern (Positionierung siehe usePopoverPosition).
export default function CustomerInfoPopover({ card, onUpdate }) {
  const { open, openAt, close, triggerRef, panelRef, panelStyle } = usePopoverPosition();
  const [customerNumber, setCustomerNumber] = useState(card.customerNumber || "");
  const [contactName, setContactName] = useState(card.contactName || "");
  const [contactPhone, setContactPhone] = useState(card.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(card.contactEmail || "");

  const hasData = Boolean(
    (card.customerNumber && card.customerNumber.trim()) ||
      (card.contactName && card.contactName.trim()) ||
      (card.contactPhone && card.contactPhone.trim()) ||
      (card.contactEmail && card.contactEmail.trim())
  );

  function openPopover(e) {
    e.stopPropagation();
    if (open) {
      close();
      return;
    }
    setCustomerNumber(card.customerNumber || "");
    setContactName(card.contactName || "");
    setContactPhone(card.contactPhone || "");
    setContactEmail(card.contactEmail || "");
    openAt();
  }

  function save(e) {
    e.preventDefault();
    onUpdate(card.id, {
      customerNumber: customerNumber.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
    });
    close();
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
        panelStyle &&
        createPortal(
          <div
            className="customer-info-panel"
            ref={panelRef}
            style={panelStyle}
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
