const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes principales
app.use('/api/auth', require('./routes/auth'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/migration', require('./routes/migration'));
app.use('/api/export', require('./routes/export'));

// Health check avec info migration
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'WhatsApp Migration Assistant',
    version: '2.0.0',
    features: ['backup', 'migration', 'export', 'restore']
  });
});

// Route principale
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Migration Assistant API',
    endpoints: {
      auth: '/api/auth',
      backup: '/api/backup', 
      migration: '/api/migration',
      export: '/api/export',
      health: '/health'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Migration Assistant running on port ${PORT}`);
});