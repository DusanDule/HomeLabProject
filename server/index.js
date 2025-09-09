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

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
