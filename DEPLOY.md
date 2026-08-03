# Kanban Board online stellen (fuer Kollegen erreichbar machen)

Diese Anleitung bringt das Board von "läuft nur auf meinem Rechner" zu
"überall erreichbar über einen Link, geschützt mit einem gemeinsamen
Passwort". Empfohlene Plattform: **Railway** (railway.app) - einfache
Oberfläche, unterstützt dauerhafte Speicherung (Volumes), kostenpflichtig ab
ein paar Euro im Monat je nach Nutzung. Render.com funktioniert nach dem
gleichen Prinzip als Alternative.

Die folgenden Schritte mit Konto-Erstellung und Bezahlung musst du selbst
machen (das kann ich nicht für dich übernehmen) - alles andere ist bereits
vorbereitet.

## 1. Code auf GitHub bringen

1. Auf [github.com](https://github.com) ein kostenloses Konto anlegen (falls
   noch nicht vorhanden).
2. Ein neues, leeres Repository anlegen (z.B. `baresti-kanban`) - **ohne**
   README/'.gitignore beim Anlegen auswählen, das haben wir schon lokal.
3. Im Terminal, im `Kanban`-Ordner:
   ```
   git remote add origin https://github.com/DEIN-BENUTZERNAME/baresti-kanban.git
   git push -u origin main
   ```
   (Bei der ersten Anmeldung fragt Git nach deinen GitHub-Zugangsdaten bzw.
   einem Zugriffstoken - GitHub führt dich da durch.)

## 2. Railway-Projekt anlegen

1. Auf [railway.app](https://railway.app) registrieren (Login mit GitHub
   geht am schnellsten).
2. "New Project" → "Deploy from GitHub repo" → das eben erstellte Repo
   auswählen.
3. Railway erkennt automatisch `package.json` im Hauptordner und nutzt die
   dort hinterlegten Befehle (`npm run build` zum Bauen, `npm start` zum
   Starten) - dafür ist schon alles vorbereitet, hier ist normalerweise
   nichts weiter einzustellen.

## 3. Dauerhaften Speicher einrichten (wichtig!)

Ohne diesen Schritt gehen alle Projekte/Team-Mitglieder/Anhänge bei jedem
neuen Deploy verloren, weil der Server-Speicher sonst jedes Mal neu
aufgesetzt wird.

1. Im Railway-Service: **Volumes** → neues Volume anlegen, Mount-Pfad z.B.
   `/data`.
2. Unter **Variables** (Umgebungsvariablen) hinzufügen:
   - `DATA_DIR` = `/data`

## 4. Passwortschutz einrichten

Ebenfalls unter **Variables**:

- `BASIC_AUTH_USER` = z.B. `baresti`
- `BASIC_AUTH_PASS` = ein Passwort eurer Wahl (das teilst du deinen
  Kolleg:innen mit)

Ohne diese zwei Variablen läuft das Board ganz ohne Login - lokal beim
Entwickeln ist das so gewollt, online sollten sie aber gesetzt sein.

## 5. Fertig

Railway zeigt dir eine öffentliche URL (z.B. `baresti-kanban.up.railway.app`).
Diesen Link zusammen mit Benutzername/Passwort an deine Kolleg:innen
weitergeben - fertig.

## Spätere Änderungen

Jedes Mal, wenn ich (Claude) hier neue Features einbaue, reicht danach:
```
git add -A
git commit -m "Beschreibung der Aenderung"
git push
```
Railway baut und deployt automatisch neu, sobald auf GitHub gepusht wird.

## Eigene Domain (optional)

Falls ihr später z.B. `kanban.baresti.ch` nutzen wollt: in Railway unter
**Settings → Domains** eine eigene Domain hinterlegen und beim
Domain-Anbieter einen CNAME-Eintrag setzen (Railway zeigt dir dafür die
genauen Werte an).
