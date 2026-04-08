# ToDo Pro 🚀

[![MIT License](https://img.shields.io/badge/License-MIT-white.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848f.svg)](https://www.electronjs.org/)

**ToDo Pro** ist eine hochperformante, ästhetische Kanban-Anwendung für den Desktop. Sie kombiniert modernes **High-Tech Design** mit maximaler Benutzerfreiheit und lokaler Datensouveränität.

![ToDo Pro Preview](https://via.placeholder.com/1200x800/000000/FFFFFF?text=ToDo+Pro+Kanban+Board)

## ✨ Features

- **High-Tech UI/UX**: Immersives Glassmorphism-Design mit Pure-Black Hintergründen und Cyber-Farbakzenten.
- **Unbegrenztes Panning**: Verschiebe das gesamte Board intuitiv per Drag & Drop (Grab-to-Scroll).
- **Deep Hierarchy**: Organisiere dich in Projekten -> Boards -> Spalten -> Karten.
- **Rich Task Details**: Karten mit detaillierten Beschreibungen, Farb-Codierung, Fälligkeitsdaten und Kommentar-System.
- **Lokale Datenbank**: Alle Daten werden in einer lokalen `db.json` Datei gespeichert. Keine Cloud, kein Tracking.
- **Sidebar Auto-Hide**: Eine intelligente Sidebar, die sich automatisch minimiert und nur bei Bedarf (Maus-Hover) erscheint.
- **Export & Import**: Erstelle Backups deiner gesamten Datenbank als JSON oder stelle sie wieder her.
- **Cross-Platform**: Verfügbar als native Desktop-App für macOS und Windows.

## 🛠 Tech Stack

- **Frontend**: Vue 3 (Composition API) + Vite
- **Styling**: Tailwind CSS + shadcn-vue
- **State**: Pinia
- **Desktop**: Electron
- **Drag & Drop**: vuedraggable (Sortable.js)
- **Icons**: Lucide Vue Next

## 🚀 Installation & Entwicklung

### Voraussetzungen
- Node.js (v18 oder höher)
- npm

### Lokale Entwicklung
1. Repository klonen:
   ```bash
   git clone https://github.com/DEIN_USERNAME/todo-pro.git
   cd todo-pro
   ```
2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
3. Entwicklungsmodus starten (startet Frontend + Backend-Server + Electron):
   ```bash
   npm run dev
   ```

### Desktop Build erstellen
Erstellt eine ausführbare Datei im `release/` Ordner:
```bash
npm run build
```

## 📂 Datenstruktur
Die App verwendet eine lokale JSON-Datenbank. Im Entwicklungsmodus befindet sie sich im Projekt-Root als `db.json`. In der installierten App wird sie im `userData`-Verzeichnis deines Betriebssystems sicher abgelegt.

## 🤝 Contributing
Beiträge sind herzlich willkommen! Da dies ein Open-Source-Projekt ist, kannst du gerne Issues eröffnen oder Pull-Requests einreichen.

## 📄 Lizenz
Dieses Projekt ist unter der **MIT-Lizenz** lizenziert. Siehe [LICENSE](LICENSE) Datei für Details.

---
*Entwickelt für Effizienz und Ästhetik.*
