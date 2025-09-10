const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    // Use data directory if it exists, otherwise use current directory
    const dataDir = path.join(__dirname, '..', 'data');
    if (require('fs').existsSync(dataDir)) {
      this.dbPath = path.join(dataDir, 'database.sqlite');
    } else {
      this.dbPath = path.join(__dirname, 'database.sqlite');
    }
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Rooms table
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      
      // Items table
      `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        room_id INTEGER NOT NULL,
        room_name TEXT NOT NULL,
        price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (room_id) REFERENCES rooms (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      
      // Strokes table
      `CREATE TABLE IF NOT EXISTS strokes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Billing periods table
      `CREATE TABLE IF NOT EXISTS billing_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async migrateFromJSON() {
    try {
      const dataFile = path.join(__dirname, 'data.json');
      if (!fs.existsSync(dataFile)) {
        console.log('No data.json file found, skipping migration');
        return;
      }

      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      
      // Check if data already exists
      const userCount = await this.get('SELECT COUNT(*) as count FROM users');
      if (userCount.count > 0) {
        console.log('Database already has data, skipping migration');
        return;
      }

      console.log('Migrating data from JSON to database...');

      // Migrate users
      for (const user of data.users || []) {
        await this.run(
          'INSERT INTO users (id, username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.username, user.password, user.email, user.role, user.createdAt]
        );
      }

      // Migrate rooms
      for (const room of data.rooms || []) {
        await this.run(
          'INSERT INTO rooms (id, name, description, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
          [room.id, room.name, room.description, room.createdAt, room.createdBy]
        );
      }

      // Migrate items
      for (const item of data.items || []) {
        await this.run(
          'INSERT INTO items (id, name, description, room_id, room_name, price, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [item.id, item.name, item.description, item.roomId, item.roomName, item.price, item.createdAt, item.createdBy]
        );
      }

      // Migrate strokes
      for (const stroke of data.strokes || []) {
        await this.run(
          'INSERT INTO strokes (id, item_id, user_id, username, created_at) VALUES (?, ?, ?, ?, ?)',
          [stroke.id, stroke.itemId, stroke.userId, stroke.username, stroke.createdAt]
        );
      }

      // Set invitation code
      if (data.invitationCode) {
        await this.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['invitation_code', data.invitationCode]
        );
      }

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
