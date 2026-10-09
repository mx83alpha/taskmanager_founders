# Founder Arcade

Neon-Taskmanagement für Gründer: Quests, XP, Levels, persönliche Tagesrekorde, Erfolge und ein pausierbarer 15-Minuten-Fokus-Timer. Oberfläche auf Deutsch. Fortschritt wird in Cloudflare D1 gespeichert; keine Browser-Speicherung als Datenbank.

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
