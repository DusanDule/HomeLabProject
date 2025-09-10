const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Database = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = new Database();
let isDbReady = false;

// Initialize database and migrate data
const initializeDatabase = async () => {
  try {
    await db.init();
    await db.migrateFromJSON();
    
    // Create default admin user if no users exist
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      await db.run(
        'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [config.ADMIN_USERNAME, bcrypt.hashSync(config.ADMIN_PASSWORD, 10), 'admin@example.com', 'admin', new Date()]
      );
    }
    
    // Create default room if no rooms exist
    const roomCount = await db.get('SELECT COUNT(*) as count FROM rooms');
    if (roomCount.count === 0) {
      await db.run(
        'INSERT INTO rooms (name, description, created_at, created_by) VALUES (?, ?, ?, ?)',
        ['Allgemein', 'Standard-Raum für alle Items', new Date(), 1]
      );
    }
    
    // Set default invitation code if not set
    const invitationCode = await db.get('SELECT value FROM settings WHERE key = ?', ['invitation_code']);
    if (!invitationCode) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        ['invitation_code', 'Dule-1212']
      );
    }
    
    isDbReady = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

// Initialize database on startup
initializeDatabase();

// Middleware to check if database is ready
const checkDbReady = (req, res, next) => {
  if (!isDbReady) {
    return res.status(503).json({ message: 'Database not ready' });
  }
  next();
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Routes
app.post('/api/login', checkDbReady, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Login successful',
    user: req.user
  });
});

// User registration endpoint
app.post('/api/register', checkDbReady, async (req, res) => {
  try {
    const { username, password, email, invitationCode } = req.body;

    if (!username || !password || !email || !invitationCode) {
      return res.status(400).json({ message: 'Username, password, email and invitation code are required' });
    }

    // Get invitation code from database
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['invitation_code']);
    const validInvitationCode = setting ? setting.value : 'Dule-1212';

    if (invitationCode !== validInvitationCode) {
      return res.status(400).json({ message: 'Invalid invitation code' });
    }

    // Check if username already exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user
    const result = await db.run(
      'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [username, bcrypt.hashSync(password, 10), email, 'user', new Date()]
    );

    res.json({
      message: 'Registration successful',
      user: { id: result.id, username, email, role: 'user' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === 1) {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update invitation code (admin only)
app.put('/api/admin/invitation-code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { newCode } = req.body;
    
    if (!newCode || newCode.trim().length < 3) {
      return res.status(400).json({ message: 'Invitation code must be at least 3 characters long' });
    }
    
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['invitation_code', newCode.trim()]
    );
    
    res.json({ 
      message: 'Invitation code updated successfully',
      newCode: newCode.trim()
    });
  } catch (error) {
    console.error('Update invitation code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current invitation code (admin only)
app.get('/api/admin/invitation-code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['invitation_code']);
    res.json({ invitationCode: setting ? setting.value : 'Dule-1212' });
  } catch (error) {
    console.error('Get invitation code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset user password (admin only)
app.put('/api/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update password
    await db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [bcrypt.hashSync(newPassword, 10), userId]
    );
    
    res.json({ 
      message: 'Password reset successfully',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change own password (any logged-in user)
app.put('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    await db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [bcrypt.hashSync(newPassword, 10), req.user.id]
    );
    
    res.json({ 
      message: 'Password changed successfully',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user role (admin only)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newRole } = req.body;
    
    if (!newRole || !['admin', 'user'].includes(newRole)) {
      return res.status(400).json({ message: 'Valid role (admin or user) is required' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent demoting the last admin
    if (user.role === 'admin' && newRole === 'user') {
      const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount.count <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin user' });
      }
    }
    
    // Update role
    await db.run('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);
    
    res.json({ 
      message: 'User role updated successfully',
      user: { id: user.id, username: user.username, email: user.email, role: newRole }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Billing Period Management Endpoints
// Create new billing period (admin only)
app.post('/api/billing-periods', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Name, start date and end date are required' });
    }
    
    // Deactivate all other periods
    await db.run('UPDATE billing_periods SET is_active = 0');
    
    // Create new billing period
    const result = await db.run(
      'INSERT INTO billing_periods (name, start_date, end_date, is_active, created_at, created_by) VALUES (?, ?, ?, 1, ?, ?)',
      [name, startDate, endDate, new Date(), req.user.id]
    );
    
    const newPeriod = await db.get('SELECT * FROM billing_periods WHERE id = ?', [result.id]);
    
    res.json({
      message: 'Billing period created successfully',
      billingPeriod: newPeriod
    });
  } catch (error) {
    console.error('Create billing period error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all billing periods
app.get('/api/billing-periods', authenticateToken, async (req, res) => {
  try {
    const periods = await db.all('SELECT * FROM billing_periods ORDER BY created_at DESC');
    res.json({ billingPeriods: periods });
  } catch (error) {
    console.error('Get billing periods error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get active billing period
app.get('/api/billing-periods/active', authenticateToken, async (req, res) => {
  try {
    const activePeriod = await db.get('SELECT * FROM billing_periods WHERE is_active = 1');
    res.json({ billingPeriod: activePeriod });
  } catch (error) {
    console.error('Get active billing period error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set active billing period (admin only)
app.put('/api/billing-periods/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const periodId = parseInt(req.params.id);
    
    // Deactivate all periods
    await db.run('UPDATE billing_periods SET is_active = 0');
    
    // Activate selected period
    await db.run('UPDATE billing_periods SET is_active = 1 WHERE id = ?', [periodId]);
    
    const period = await db.get('SELECT * FROM billing_periods WHERE id = ?', [periodId]);
    
    res.json({
      message: 'Billing period activated successfully',
      billingPeriod: period
    });
  } catch (error) {
    console.error('Activate billing period error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Item Management Endpoints (Admin only)
// Create new item
app.post('/api/items', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, roomId, price } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    
    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }
    
    // Check if room exists
    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [parseInt(roomId)]);
    if (!room) {
      return res.status(400).json({ message: 'Room not found' });
    }
    
    // Check if item already exists in this room
    const existingItem = await db.get(
      'SELECT * FROM items WHERE LOWER(name) = LOWER(?) AND room_id = ?',
      [name, parseInt(roomId)]
    );
    if (existingItem) {
      return res.status(400).json({ message: 'Item with this name already exists in this room' });
    }
    
    const result = await db.run(
      'INSERT INTO items (name, description, room_id, room_name, price, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), description ? description.trim() : '', parseInt(roomId), room.name, price ? parseFloat(price) : 0, new Date(), req.user.id]
    );
    
    const newItem = await db.get('SELECT * FROM items WHERE id = ?', [result.id]);
    
    res.json({
      message: 'Item created successfully',
      item: newItem
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all items (Admin sees all, Users see only names)
app.get('/api/items', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const { roomId, billingPeriodId } = req.query;
    
    let query = 'SELECT * FROM items';
    let params = [];
    
    if (roomId && roomId !== 'all') {
      query += ' WHERE room_id = ?';
      params.push(parseInt(roomId));
    }
    
    query += ' ORDER BY name';
    
    const items = await db.all(query, params);
    
    if (user.role === 'admin') {
      // Admin sees all items with stroke counts
      const itemsWithStrokes = await Promise.all(items.map(async (item) => {
        let strokeQuery = 'SELECT COUNT(*) as count FROM strokes WHERE item_id = ?';
        let strokeParams = [item.id];
        
        // Filter strokes by billing period if specified
        if (billingPeriodId && billingPeriodId !== 'all') {
          const period = await db.get('SELECT * FROM billing_periods WHERE id = ?', [parseInt(billingPeriodId)]);
          if (period) {
            strokeQuery += ' AND created_at >= ? AND created_at <= ?';
            strokeParams.push(period.start_date, period.end_date);
          }
        }
        
        const strokeCount = await db.get(strokeQuery, strokeParams);
        const lastStroke = await db.get(
          'SELECT created_at FROM strokes WHERE item_id = ? ORDER BY created_at DESC LIMIT 1',
          [item.id]
        );
        
        return {
          ...item,
          strokeCount: strokeCount.count,
          lastStroke: lastStroke ? lastStroke.created_at : null
        };
      }));
      
      res.json({ items: itemsWithStrokes });
    } else {
      // Users see only item names and IDs
      const userItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        roomName: item.room_name
      }));
      res.json({ items: userItems });
    }
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update item (Admin only)
app.put('/api/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { name, description, roomId, price } = req.body;
    
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    if (name && name.trim().length > 0) {
      // Check if new name already exists in the same room
      const existingItem = await db.get(
        'SELECT * FROM items WHERE id != ? AND LOWER(name) = LOWER(?) AND room_id = ?',
        [itemId, name, roomId ? parseInt(roomId) : item.room_id]
      );
      if (existingItem) {
        return res.status(400).json({ message: 'Item with this name already exists in this room' });
      }
    }
    
    if (roomId) {
      const room = await db.get('SELECT * FROM rooms WHERE id = ?', [parseInt(roomId)]);
      if (!room) {
        return res.status(400).json({ message: 'Room not found' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name && name.trim().length > 0) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : '');
    }
    
    if (roomId) {
      const room = await db.get('SELECT * FROM rooms WHERE id = ?', [parseInt(roomId)]);
      updates.push('room_id = ?', 'room_name = ?');
      params.push(parseInt(roomId), room.name);
    }
    
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price ? parseFloat(price) : 0);
    }
    
    if (updates.length > 0) {
      params.push(itemId);
      await db.run(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    const updatedItem = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    
    res.json({
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete item (Admin only)
app.delete('/api/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Remove all strokes for this item
    await db.run('DELETE FROM strokes WHERE item_id = ?', [itemId]);
    
    // Remove the item
    await db.run('DELETE FROM items WHERE id = ?', [itemId]);
    
    res.json({ message: 'Item and all associated strokes deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add stroke to item (Any logged-in user)
app.post('/api/items/:id/stroke', authenticateToken, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    // Check if item exists
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const result = await db.run(
      'INSERT INTO strokes (item_id, user_id, username, created_at) VALUES (?, ?, ?, ?)',
      [itemId, req.user.id, req.user.username, new Date()]
    );
    
    const newStroke = await db.get('SELECT * FROM strokes WHERE id = ?', [result.id]);
    
    res.json({
      message: 'Stroke added successfully',
      stroke: {
        id: newStroke.id,
        itemName: item.name,
        createdAt: newStroke.created_at
      }
    });
  } catch (error) {
    console.error('Add stroke error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get item analytics (Admin only)
app.get('/api/items/:id/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { billingPeriodId } = req.query;
    
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    let strokeQuery = 'SELECT * FROM strokes WHERE item_id = ?';
    let strokeParams = [itemId];
    
    // Filter strokes by billing period if specified
    if (billingPeriodId && billingPeriodId !== 'all') {
      const period = await db.get('SELECT * FROM billing_periods WHERE id = ?', [parseInt(billingPeriodId)]);
      if (period) {
        strokeQuery += ' AND created_at >= ? AND created_at <= ?';
        strokeParams.push(period.start_date, period.end_date);
      }
    }
    
    strokeQuery += ' ORDER BY created_at DESC';
    
    const itemStrokes = await db.all(strokeQuery, strokeParams);
    
    // Group strokes by user
    const strokesByUser = {};
    itemStrokes.forEach(stroke => {
      if (!strokesByUser[stroke.username]) {
        strokesByUser[stroke.username] = [];
      }
      strokesByUser[stroke.username].push(stroke);
    });
    
    // Create analytics data
    const analytics = {
      item: {
        id: item.id,
        name: item.name,
        description: item.description
      },
      totalStrokes: itemStrokes.length,
      strokesByUser: Object.keys(strokesByUser).map(username => ({
        username,
        count: strokesByUser[username].length,
        lastStroke: strokesByUser[username][0].created_at
      })),
      recentStrokes: itemStrokes.slice(0, 10).map(stroke => ({
        id: stroke.id,
        username: stroke.username,
        createdAt: stroke.created_at
      }))
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Get item analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset strokes for item (Admin only)
app.put('/api/items/:id/reset-strokes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { billingPeriodId } = req.query;
    
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    let deleteQuery = 'DELETE FROM strokes WHERE item_id = ?';
    let deleteParams = [itemId];
    
    // Filter strokes by billing period if specified
    if (billingPeriodId && billingPeriodId !== 'all') {
      const period = await db.get('SELECT * FROM billing_periods WHERE id = ?', [parseInt(billingPeriodId)]);
      if (period) {
        deleteQuery += ' AND created_at >= ? AND created_at <= ?';
        deleteParams.push(period.start_date, period.end_date);
      }
    }
    
    const result = await db.run(deleteQuery, deleteParams);
    
    res.json({
      message: `All strokes for "${item.name}" have been reset`,
      removedStrokes: result.changes
    });
  } catch (error) {
    console.error('Reset strokes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Room Management Endpoints (Admin only)
// Create new room
app.post('/api/rooms', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Room name is required' });
    }
    
    // Check if room already exists
    const existingRoom = await db.get('SELECT * FROM rooms WHERE LOWER(name) = LOWER(?)', [name]);
    if (existingRoom) {
      return res.status(400).json({ message: 'Room with this name already exists' });
    }
    
    const result = await db.run(
      'INSERT INTO rooms (name, description, created_at, created_by) VALUES (?, ?, ?, ?)',
      [name.trim(), description ? description.trim() : '', new Date(), req.user.id]
    );
    
    const newRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [result.id]);
    
    res.json({
      message: 'Room created successfully',
      room: newRoom
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all rooms
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.all('SELECT * FROM rooms ORDER BY name');
    
    const roomsWithItemCounts = await Promise.all(rooms.map(async (room) => {
      const itemCount = await db.get('SELECT COUNT(*) as count FROM items WHERE room_id = ?', [room.id]);
      return {
        ...room,
        itemCount: itemCount.count
      };
    }));
    
    res.json({ rooms: roomsWithItemCounts });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update room (Admin only)
app.put('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { name, description } = req.body;
    
    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    if (name && name.trim().length > 0) {
      // Check if new name already exists
      const existingRoom = await db.get('SELECT * FROM rooms WHERE id != ? AND LOWER(name) = LOWER(?)', [roomId, name]);
      if (existingRoom) {
        return res.status(400).json({ message: 'Room with this name already exists' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name && name.trim().length > 0) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : '');
    }
    
    if (updates.length > 0) {
      params.push(roomId);
      await db.run(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`, params);
      
      // Update room name in all items
      if (name && name.trim().length > 0) {
        await db.run('UPDATE items SET room_name = ? WHERE room_id = ?', [name.trim(), roomId]);
      }
    }
    
    const updatedRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
    
    res.json({
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete room (Admin only)
app.delete('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    
    if (roomId === 1) {
      return res.status(400).json({ message: 'Cannot delete the default "Allgemein" room' });
    }
    
    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check if room has items
    const roomItems = await db.get('SELECT COUNT(*) as count FROM items WHERE room_id = ?', [roomId]);
    if (roomItems.count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete room with ${roomItems.count} items. Please move or delete items first.` 
      });
    }
    
    // Remove the room
    await db.run('DELETE FROM rooms WHERE id = ?', [roomId]);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's strokes (User only)
app.get('/api/user/strokes', authenticateToken, async (req, res) => {
  try {
    const { billingPeriodId } = req.query;
    
    let query = 'SELECT item_id, COUNT(*) as count FROM strokes WHERE user_id = ?';
    let params = [req.user.id];
    
    // Filter strokes by billing period if specified
    if (billingPeriodId && billingPeriodId !== 'all') {
      const period = await db.get('SELECT * FROM billing_periods WHERE id = ?', [parseInt(billingPeriodId)]);
      if (period) {
        query += ' AND created_at >= ? AND created_at <= ?';
        params.push(period.start_date, period.end_date);
      }
    }
    
    query += ' GROUP BY item_id';
    
    const userStrokes = await db.all(query, params);
    
    const strokesObj = {};
    userStrokes.forEach(stroke => {
      strokesObj[stroke.item_id] = stroke.count;
    });
    
    res.json(strokesObj);
  } catch (error) {
    console.error('User strokes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
