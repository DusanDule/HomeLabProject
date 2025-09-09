# Server Setup für Admin Web App

## Voraussetzungen auf dem Server

### 1. Docker installieren
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Nach der Installation: Logout und wieder einloggen
```

### 2. Git installieren
```bash
sudo apt install git
```

## Projekt auf Server klonen

```bash
# In dein gewünschtes Verzeichnis wechseln
cd /home/username  # oder /var/www

# Repository klonen
git clone https://github.com/DEIN-USERNAME/admin-webapp.git
cd admin-webapp
```

## App starten

```bash
# Mit Docker Compose
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# App stoppen
docker-compose down
```

## Entwicklung auf dem Server

### 1. Code bearbeiten
```bash
# Mit nano (einfach)
nano client/src/App.js

# Mit vim (fortgeschritten)
vim client/src/App.js

# Mit VS Code über SSH (empfohlen)
# Installiere die "Remote - SSH" Extension in VS Code
```

### 2. Änderungen testen
```bash
# Container neu bauen nach Änderungen
docker-compose down
docker-compose build
docker-compose up -d
```

### 3. Git Workflow
```bash
# Änderungen committen
git add .
git commit -m "Beschreibung der Änderung"
git push origin main

# Updates vom Repository holen
git pull origin main
```

## Nginx Reverse Proxy (Optional)

Für bessere Performance und SSL:

```bash
# Nginx installieren
sudo apt install nginx

# Konfiguration erstellen
sudo nano /etc/nginx/sites-available/admin-webapp
```

Nginx Konfiguration:
```nginx
server {
    listen 80;
    server_name deine-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Site aktivieren
sudo ln -s /etc/nginx/sites-available/admin-webapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL mit Let's Encrypt (Optional)

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d deine-domain.com
```

## Monitoring und Logs

```bash
# Container Status
docker-compose ps

# Logs anzeigen
docker-compose logs -f admin-webapp

# System Ressourcen
htop
df -h
```

## Backup

```bash
# Code Backup
tar -czf admin-webapp-backup-$(date +%Y%m%d).tar.gz admin-webapp/

# Docker Images Backup
docker save admin-webapp_admin-webapp:latest | gzip > admin-webapp-image-$(date +%Y%m%d).tar.gz
```
