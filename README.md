# Baresti GmbH – Kanban Board

Ein einfaches, selbst gehostetes Kanban Board. Besteht aus zwei Teilen:

- `backend/` – kleiner Node/Express-Server, speichert Boards/Listen/Karten aktuell in einer JSON-Datei (`backend/db.json`). Leicht spaeter gegen eine echte Datenbank (z.B. PostgreSQL) austauschbar.
- `frontend/` – React-App (Vite), zeigt das Board an, Drag & Drop mit `@dnd-kit`.

Soll das Board fuer Kollegen online erreichbar gemacht werden? Siehe **[DEPLOY.md](./DEPLOY.md)**.

## Lokal starten

Du brauchst zwei Terminal-Fenster (beide Server laufen parallel).

**Terminal 1 – Backend:**
```
cd backend
npm install
npm start
```
Laeuft danach unter http://localhost:4000

**Terminal 2 – Frontend:**
```
cd frontend
npm install
npm run dev
```
Vite zeigt dir eine lokale Adresse an, meist http://localhost:5173 – die im Browser oeffnen.

## Was schon geht

- Seitenlayout: volle Breite fuer den Inhalt, oben eine Topbar mit Suchfeldern, Team-/Tags-Dropdowns und Seiten-Menue
- Menuepunkt "Kanban" zeigt das Board, "Archiv" zeigt alle archivierten Projekte, "Journal" zeigt eine Aktivitaets-Historie (wer hat wann was gemacht: Projekte/Tags/Team/Spalten anlegen, bearbeiten, loeschen; Tags zwischen Spalten verschieben oder zuweisen; An-/Abmelden). Reine Positions-/Umsortierungs-Aenderungen per Drag&Drop werden bewusst nicht geloggt, um das Journal nicht zuzuspammen
- Das Journal laesst sich filtern: Zeitraum (Von/Bis mit Datum+Uhrzeit), Person und Projektname - auch kombinierbar, filtert serverseitig auch in weiter zurueckliegenden Eintraegen
- Sobald alle Tags eines Projekts in der Spalte "Umgesetzt" liegen, erscheint dort unten ein roter "Archivieren"-Button; ein Klick speichert Titel, Start-/Ziel-Datum, Archivierungsdatum, Tags, Zustaendige, Beschreibung/Bemerkungen und alle Anhaenge (Dateien/Links) im Archiv und entfernt das Projekt vom Board
- Im Archiv kann jedes Projekt per "Wiederherstellen"-Button zurueck aufs Board geholt werden: es landet frisch in der "Projekte"-Liste (neues Start-Datum, kein Ziel-Datum), die Tags starten wieder in der ersten Arbeits-Spalte - Titel, Zustaendige, Beschreibung und Anhaenge bleiben erhalten
- Archivierte Projekte lassen sich per Muelltonnen-Icon (mit Sicherheitsabfrage) endgueltig loeschen, inklusive hochgeladener Anhaenge
- Ueber der Tabelle (Kanban und Archiv) gibt es eine Filterleiste: Suche nach Projektname, nach Hauptverantwortlichem (erster Zugewiesener) und nach Beteiligten (alle weiteren Zugewiesenen); alle drei Felder lassen sich kombinieren
- Zeilen-Ansicht: jedes Projekt ist eine eigene Zeile, klar durch eine Linie von den anderen getrennt
- Projekt-Zeilen lassen sich ueber einen Griff (⠿) ganz links per Drag & Drop neu sortieren; beim Ziehen bleibt eine Vorschau am Mauszeiger sichtbar (wie bei Tags/Spalten)
- Ganz links in jeder Zeile: Projektname, Team-Bild/Initiale, zugewiesene Personen, feste Tag-Uebersicht
- Rechts daneben die Arbeits-Spalten als Kopfzeile: Warte auf Kunden, In Bearbeitung, on Hold, Fertig
- Tags eines Projekts lassen sich per Drag & Drop nur innerhalb der eigenen Zeile zwischen den Spalten verschieben (ein Tag kann nicht versehentlich einem anderen Projekt zugeordnet werden)
- Neues Projekt anlegen ueber "+ Projekt" unten in der Zeilen-Ansicht, mit Titel, Tags und zugewiesenen Personen
- Jedem Projekt koennen mehrere Tags gleichzeitig zugewiesen werden; "Sonstiges" erlaubt zusaetzlich einen frei eingebbaren Text pro Zuweisung
- Jedem einzelnen Tag laesst sich oben links eine Person zuweisen (Auswahl beschraenkt auf Haupt- und Nebenverantwortliche des Projekts); wird eine Person vom Projekt entfernt oder ganz geloescht, verliert der Tag automatisch diese Zuweisung
- Jeder einzelne Tag kann zusaetzlich eine freie Notiz/Bemerkung bekommen: kleines Symbol unten rechts am Tag oeffnet ein kleines Notizfeld; ist eine Notiz hinterlegt, wird das Symbol hervorgehoben und zeigt beim Ueberfahren den Text als Tooltip
- Team und Tags sind als Dropdown-Menues oben rechts in der Topbar erreichbar (mit Anzahl-Badge): Nutzer bzw. Tags anzeigen, hinzufuegen, umbenennen, Farbe aendern. Loeschen eines Tags entfernt ihn ueberall (von allen Projekten und offenen Tag-Karten auf dem Board)
- Karten bearbeiten (Titel, Beschreibung, Tags, Personen nachtraeglich aendern/ergaenzen)
- Oben rechts an jeder Projektkarte kann man sie ueber ein kleines Muelltonnen-Icon (mit Sicherheitsabfrage) endgueltig loeschen
- Arbeits-Spalten anlegen; per Griff (⠿) in der Kopfzeile lassen sich Spalten neu anordnen
- Ganz rechts steht immer fixiert die Spalte "Umgesetzt": nicht loeschbar und bleibt immer die letzte Spalte, egal wie viele andere Spalten dazwischen hinzugefuegt oder umsortiert werden
- Im Team-Dropdown (Topbar) Personen hinzufuegen, umbenennen, entfernen; optional mit E-Mail + Passwort fuer den individuellen Login (Passwort bei Bearbeiten leer lassen = unveraendert). Ueber "Zufaellig generieren" laesst sich dort auch ein neues Passwort erzeugen (z.B. bei "Passwort vergessen") - wird kurz zum Kopieren angezeigt und muss der Person persoenlich mitgeteilt werden
- Individueller Login: sobald mindestens eine Person ein Passwort hat, verlangt das Board eine Anmeldung mit E-Mail + Passwort; Sitzung bleibt 30 Tage gueltig (Cookie), Abmelden-Button oben rechts neben dem Team-Namen. Solange noch niemand ein Passwort gesetzt hat, bleibt das Board offen (Einrichtungsphase)
- Jede Person kann ein Profilbild bekommen: hochladen, per Drag verschieben und mit einem Regler zoomen, wird automatisch rund zugeschnitten und komprimiert gespeichert
- Die Rahmenfarbe des Profilbilds (bzw. der Punkt ohne Bild) ist frei waehlbar
- Jede Karte kann Anhaenge bekommen: Web-Links oder hochgeladene Dateien (Bilder, PDFs etc.), direkt unter der Beschreibung, ohne extra in den Bearbeiten-Modus zu muessen
- Hochgeladene Dateien landen unter `backend/uploads/`; ueber die JSON-Anfrage aktuell max. ca. 6-7 MB pro Datei
- Links vom Projektnamen zeigt eine schmale Spalte Start- und Ziel-Datum: Start wird beim Anlegen automatisch gesetzt und ist nicht mehr aenderbar, das Ziel-Datum kann jederzeit ueber "Bearbeiten" gesetzt/geaendert werden
- Beim Ziehen eines Tags/einer Spalte bleibt eine Kopie sichtbar am Mauszeiger (DragOverlay), statt erst beim Loslassen zu erscheinen
- Alle Aenderungen werden ueber die API gespeichert (backend/db.json)
- Fertig vorbereitet fuers Hosting: individueller Login je Person, ein Server liefert Frontend+API zusammen aus, dauerhafte Datenablage konfigurierbar (siehe [DEPLOY.md](./DEPLOY.md))
- Dark/Light-Modus: Sonne/Mond-Button ganz oben rechts in der Topbar schaltet um; die Wahl wird gemerkt (auch nach Neuladen), startet sonst nach der Systemeinstellung

- Schreibzugriffe auf `db.json` laufen ueber eine interne Warteschlange und werden strikt nacheinander abgearbeitet, nie parallel – verhindert, dass bei gleichzeitigen Aenderungen mehrerer Personen eine Aenderung durch eine andere ueberschrieben wird ("Lost Update")

## Naechste sinnvolle Schritte

- **Echte Datenbank** statt JSON-Datei (SQLite oder PostgreSQL) – waere fuer richtig hohe Datenmengen/Wachstum langfristig robuster; fuer die aktuelle Groesse reicht die Schreib-Warteschlange oben aber bereits als Absicherung gegen gleichzeitige Aenderungen

## Projektstruktur

```
Kanban/
├── backend/
│   ├── server.js       # Express-Server + REST-API
│   ├── db.json         # Datenspeicher (Listen/Karten)
│   ├── uploads/         # Hochgeladene Anhang-Dateien
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api.js               # Verbindung zum Backend
    │   ├── tags.js              # Tag-Definitionen (Namen/Farben)
    │   ├── App.jsx              # Seitenmenue (Kanban/Archiv), Login-Status + Grundgeruest
    │   └── components/
    │       ├── LoginForm.jsx    # Login-Bildschirm (E-Mail + Passwort)
    │       ├── JournalPage.jsx  # Aktivitaets-Historie (wer hat wann was gemacht)
    │       ├── ArchivPage.jsx   # Liste der archivierten Projekte
    │       ├── Board.jsx        # Zeilen-Layout (Swimlanes) + Drag&Drop-Logik
    │       ├── ProjectRow.jsx   # Eine Projekt-Zeile (per Griff neu sortierbar)
    │       ├── StageHeader.jsx  # Kopfzelle einer Arbeits-Spalte
    │       ├── FixedStageHeader.jsx # Kopfzelle der fixierten "Umgesetzt"-Spalte
    │       ├── StageCell.jsx    # Zelle: Tags eines Projekts in einer Spalte
    │       ├── DateCell.jsx     # Start-/Ziel-Datum links vom Projektnamen
    │       ├── Card.jsx         # Zeilen-Kopf (Projektname, Team, Tags)
    │       ├── TeamColumn.jsx   # Team-Verwaltung (Inhalt des Team-Dropdowns)
    │       ├── TagsColumn.jsx   # Tags-Verwaltung (Inhalt des Tags-Dropdowns)
    │       ├── TopBarDropdown.jsx # Generisches Dropdown-Panel fuer die Topbar
    │       ├── ResponsibleFilterBar.jsx # Filterleiste ueber der Tabelle
    │       └── TagPicker.jsx
    └── package.json
```
