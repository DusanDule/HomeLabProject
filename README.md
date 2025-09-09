###### Admin Web App

Eine einfache Web-Anwendung mit Login-Funktionalität, die als Docker Container deployt werden kann.

## Features

- 🔐 Admin Login mit JWT-Authentifizierung
- 🎨 Modernes, responsives Design
- 🐳 Docker Container Support
- ⚡ Express.js Backend
- ⚛️ React Frontend
- 🔒 Sichere Passwort-Hashierung

## Standard Login-Daten

- **Benutzername:** `admin`
- **Passwort:** `admin123`

⚠️ **Wichtig:** Ändere diese Standard-Daten in der Produktion!

## Lokale Entwicklung

### Voraussetzungen

- Node.js (Version 18 oder höher)
- npm

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd admin-webapp
```

2. Dependencies installieren:
```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

3. Entwicklungsserver starten:
```bash
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Docker Deployment

### Mit Docker Compose (Empfohlen)

1. Container bauen und starten:
```bash
docker-compose up -d
```

2. Anwendung aufrufen:
```
http://localhost:3000
```

3. Container stoppen:
```bash
docker-compose down
```

### Mit Docker direkt

1. Image bauen:
```bash
docker build -t admin-webapp .
```

2. Container starten:
```bash
docker run -p 3000:5000 \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-password \
  admin-webapp
```

## Umgebungsvariablen

Du kannst folgende Umgebungsvariablen setzen:

- `JWT_SECRET`: Geheimer Schlüssel für JWT-Tokens (Standard: `your-super-secret-jwt-key-change-this-in-production`)
- `ADMIN_USERNAME`: Admin-Benutzername (Standard: `admin`)
- `ADMIN_PASSWORD`: Admin-Passwort (Standard: `admin123`)
- `PORT`: Server-Port (Standard: `5000`)

## API Endpoints

- `POST /api/login` - Benutzer anmelden
- `GET /api/protected` - Geschützte Route (erfordert JWT Token)
- `GET /api/health` - Health Check

## Projekt-Struktur

```
admin-webapp/
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   └── package.json
├── server/                 # Express.js Backend
│   ├── index.js
│   ├── config.js
│   └── package.json
├── docker-compose.yml      # Docker Compose Konfiguration
├── Dockerfile             # Docker Image Definition
└── package.json           # Root Package.json
```

## Sicherheitshinweise

- Ändere das JWT_SECRET in der Produktion
- Verwende starke Passwörter
- Setze HTTPS in der Produktion ein
- Implementiere Rate Limiting für Login-Versuche
- Verwende eine echte Datenbank statt In-Memory Storage

## Nächste Schritte

Diese App ist als Basis konzipiert. Du kannst sie erweitern um:

- Echte Datenbank-Integration (PostgreSQL, MongoDB)
- Benutzer-Management
- Rollen und Berechtigungen
- Weitere Admin-Funktionen
- Logging und Monitoring
- HTTPS/SSL Support

## Support

Bei Fragen oder Problemen, erstelle ein Issue im Repository.
