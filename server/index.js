const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory user storage (in production, use a database)
const users = [
  {
    id: 1,
    username: config.ADMIN_USERNAME,
    password: bcrypt.hashSync(config.ADMIN_PASSWORD, 10),
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date()
  }
];

// Configurable invitation code (starts with default)
let INVITATION_CODE = 'Dule-1212';

// In-memory items storage (in production, use a database)
const items = [];

// In-memory strokes storage (in production, use a database)
const strokes = [];

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
const requireAdmin = (req, res, next) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = users.find(u => u.username === username);
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
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email, invitationCode } = req.body;

    if (!username || !password || !email || !invitationCode) {
      return res.status(400).json({ message: 'Username, password, email and invitation code are required' });
    }

    if (invitationCode !== INVITATION_CODE) {
      return res.status(400).json({ message: 'Invalid invitation code' });
    }

    // Check if username already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user
    const newUser = {
      id: users.length + 1,
      username,
      password: bcrypt.hashSync(password, 10),
      email,
      role: 'user',
      createdAt: new Date()
    };

    users.push(newUser);

    res.json({
      message: 'Registration successful',
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));
    res.json({ users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === 1) {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    users.splice(userIndex, 1);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update invitation code (admin only)
app.put('/api/admin/invitation-code', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { newCode } = req.body;
    
    if (!newCode || newCode.trim().length < 3) {
      return res.status(400).json({ message: 'Invitation code must be at least 3 characters long' });
    }
    
    INVITATION_CODE = newCode.trim();
    res.json({ 
      message: 'Invitation code updated successfully',
      newCode: INVITATION_CODE
    });
  } catch (error) {
    console.error('Update invitation code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current invitation code (admin only)
app.get('/api/admin/invitation-code', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json({ invitationCode: INVITATION_CODE });
  } catch (error) {
    console.error('Get invitation code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset user password (admin only)
app.put('/api/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update password
    user.password = bcrypt.hashSync(newPassword, 10);
    
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
    
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = bcrypt.hashSync(newPassword, 10);
    
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
app.put('/api/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newRole } = req.body;
    
    if (!newRole || !['admin', 'user'].includes(newRole)) {
      return res.status(400).json({ message: 'Valid role (admin or user) is required' });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent demoting the last admin
    if (user.role === 'admin' && newRole === 'user') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin user' });
      }
    }
    
    // Update role
    user.role = newRole;
    
    res.json({ 
      message: 'User role updated successfully',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Item Management Endpoints (Admin only)
// Create new item
app.post('/api/items', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    
    // Check if item already exists
    const existingItem = items.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existingItem) {
      return res.status(400).json({ message: 'Item with this name already exists' });
    }
    
    const newItem = {
      id: items.length + 1,
      name: name.trim(),
      description: description ? description.trim() : '',
      createdAt: new Date(),
      createdBy: req.user.id
    };
    
    items.push(newItem);
    
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
app.get('/api/items', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    
    if (user.role === 'admin') {
      // Admin sees all items with stroke counts
      const itemsWithStrokes = items.map(item => {
        const itemStrokes = strokes.filter(stroke => stroke.itemId === item.id);
        return {
          ...item,
          strokeCount: itemStrokes.length,
          lastStroke: itemStrokes.length > 0 ? itemStrokes[itemStrokes.length - 1].createdAt : null
        };
      });
      res.json({ items: itemsWithStrokes });
    } else {
      // Users see only item names and IDs
      const userItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description
      }));
      res.json({ items: userItems });
    }
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete item (Admin only)
app.delete('/api/items/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Remove all strokes for this item
    const strokeIndices = [];
    strokes.forEach((stroke, index) => {
      if (stroke.itemId === itemId) {
        strokeIndices.push(index);
      }
    });
    
    // Remove strokes in reverse order to maintain indices
    strokeIndices.reverse().forEach(index => {
      strokes.splice(index, 1);
    });
    
    // Remove the item
    items.splice(itemIndex, 1);
    
    res.json({ message: 'Item and all associated strokes deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add stroke to item (Any logged-in user)
app.post('/api/items/:id/stroke', authenticateToken, (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    // Check if item exists
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const newStroke = {
      id: strokes.length + 1,
      itemId: itemId,
      userId: req.user.id,
      username: req.user.username,
      createdAt: new Date()
    };
    
    strokes.push(newStroke);
    
    res.json({
      message: 'Stroke added successfully',
      stroke: {
        id: newStroke.id,
        itemName: item.name,
        createdAt: newStroke.createdAt
      }
    });
  } catch (error) {
    console.error('Add stroke error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get item analytics (Admin only)
app.get('/api/items/:id/analytics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const itemStrokes = strokes.filter(stroke => stroke.itemId === itemId);
    
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
        strokeCount: strokesByUser[username].length,
        lastStroke: strokesByUser[username][strokesByUser[username].length - 1].createdAt
      })),
      recentStrokes: itemStrokes
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(stroke => ({
          id: stroke.id,
          username: stroke.username,
          createdAt: stroke.createdAt
        }))
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Get item analytics error:', error);
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
