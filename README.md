# Founder Arcade

Neon-Taskmanagement für Gründer: Quests, XP, Levels, persönliche Tagesrekorde, Erfolge und ein pausierbarer 15-Minuten-Fokus-Timer. Oberfläche auf Deutsch, mit einer generierten Pixel-Neonstadt, lokaler Arcade-Schrift und sechs generierten 16×16-Quest-Icons. Fortschritt wird in Cloudflare D1 gespeichert; keine Browser-Speicherung als Datenbank.

## Lokal starten

Node.js 22 oder neuer:

```sh
npm install
npm run build
npm run db:local
npm run dev
```

Die App ist dann unter http://localhost:3000 erreichbar. Die lokale Datenbank bleibt in `.wrangler/` erhalten. Tagesrekorde verwenden Europe/Berlin. Pro 300 XP steigt der Level. Wiederöffnen einer Quest nimmt ihre XP zurück; wiederholtes Abschließen vergibt keine doppelten XP.

## Struktur

- `public/index.html`: responsive Oberfläche und Interaktionen
- `src/worker.js`: Worker und validierte Quest-API
- `db/schema.ts`, `drizzle/`: Schema und generierte Migrationen
- `.openai/hosting.json`: Sites-Bindings

Diese erste Version ist eine persönliche Kampagne in einer privaten Site. Vor einer öffentlichen Mehrnutzer-Version braucht die API eine Benutzerzuordnung und Anmeldung. Ein Timer-Ende allein vergibt keine XP.

## Belohnungsfeedback

Nach einem bestätigten Abschluss: kurzer metallischer Tsching-Sound mit tiefem Impuls, XP-Pop-up und Pixel-Partikel. Levelaufstiege bekommen einen längeren metallischen Nachklang. Der Sound lässt sich oben abschalten; nur diese Gerätepräferenz wird im Browser gespeichert. Die Partikel respektieren `prefers-reduced-motion`. Audio wird beim Klick freigeschaltet und läuft ohne externe Dienste.

Die sechs Icons visualisieren Idee, Gespräch, Recherche, Angebot, Prototyp und Feedback. Neue Quests erhalten anhand des Titels oder Kapitels das passende Motiv aus diesem Set; es gibt keine kostenpflichtige Bildgenerierung bei jedem Anlegen.

## Prüfung

`npm test` prüft Speicherung, idempotente Abschlüsse, XP, Wiederöffnen, die öffentliche Origin hinter dem Sites-Proxy, Ablehnung fremder Origins, Asset-Formate und 16×16-Auflösung. Ein DOM-Test prüft außerdem: kein Sound/keine Animation bei Fehlern, bestätigte Belohnungen, Stummschaltung, reduzierte Bewegung und Levelaufstieg. Die DOM-Tests ersetzen keine visuelle Prüfung in einem echten Browser.

Die öffentliche Origin steht explizit in `src/config.js`. Ein Proxy darf seine interne Worker-URL verwenden; der Browser sendet weiter die öffentliche Origin. Beliebige Forwarded-Host-Header werden nicht als Vertrauensquelle verwendet.

## Wiederherstellung bei Speicherfehlern

Abschlüsse werden über `POST /api/quests/:id/status` mit dem gewünschten Zustand gespeichert. Der ältere PATCH-Endpunkt bleibt kompatibel. Bei vorübergehenden Transportfehlern prüft die Oberfläche zuerst den gespeicherten Zustand und versucht den Zugriff höchstens dreimal. Neue Quests verwenden eine eindeutige Anfrage-ID, damit eine wiederholte Anfrage keinen zweiten Datensatz erzeugt. Erfolgreiches Neuladen entfernt veraltete Fehlermeldungen; verbleibende HTTP-Fehler zeigen ihren Statuscode. Tests simulieren verlorene Antworten nach einem erfolgreichen Schreibzugriff und vorübergehende Gateway-Ausfälle.
