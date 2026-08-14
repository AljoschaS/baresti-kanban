# Kanban Board online stellen (fuer Kollegen erreichbar machen)

Diese Anleitung bringt das Board von "läuft nur auf meinem Rechner" zu
"überall erreichbar über einen Link, mit individuellem Login pro Person".
Empfohlene Plattform: **Railway** (railway.app) - einfache Oberfläche,
unterstützt dauerhafte Speicherung (Volumes), kostenpflichtig ab ein paar
Euro im Monat je nach Nutzung. Render.com funktioniert nach dem gleichen
Prinzip als Alternative.

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

## 4. Login-Schlüssel setzen

Jede Person meldet sich künftig mit eigener E-Mail + eigenem Passwort an
(siehe unten). Damit die Anmelde-Sitzungen sicher signiert sind, unter
**Variables** noch hinzufügen:

- `JWT_SECRET` = eine lange, zufällige Zeichenfolge (z.B. mit einem
  Passwort-Generator erzeugt, mind. 32 Zeichen). Ohne diese Variable läuft
  ein unsicherer Standardwert - für echtes Hosting unbedingt setzen.

Falls von einem früheren Setup noch `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`
gesetzt sind: können entfernt werden, sie werden nicht mehr verwendet.

## 5. Zugänge für dich und deine Kolleg:innen anlegen

Solange noch niemand ein Passwort hat, ist das Board nach dem Deploy erstmal
ganz normal ohne Login nutzbar (wie lokal beim Entwickeln) - so lässt sich
in Ruhe alles einrichten:

1. Board öffnen, oben rechts auf **Team** klicken.
2. Bei jeder Person (auch bei dir selbst) **Bearbeiten** → E-Mail und ein
   Passwort eintragen → Speichern.
3. Sobald die erste Person ein Passwort hat, verlangt das Board ab diesem
   Moment für **jede** weitere Aktion einen Login - auch von dir. Falls das
   mitten beim Einrichten passiert (z.B. du hast gerade erst dein eigenes
   Passwort gesetzt und willst als nächstes Kolleg:innen eintragen), zeigt
   das Board automatisch den Login-Bildschirm - einfach mit dem gerade
   gesetzten Zugang anmelden und weiter Personen eintragen.
4. Die fertigen Zugänge (E-Mail + Passwort) an die jeweilige Person
   weitergeben.

## 6. Fertig

Railway zeigt dir eine öffentliche URL (z.B. `baresti-kanban.up.railway.app`).
Diesen Link an deine Kolleg:innen weitergeben, jede Person meldet sich dort
mit der eigenen E-Mail + dem eigenen Passwort an - fertig.

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
