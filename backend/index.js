const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'WhatsApp Backup API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route de test
app.get('/test', (req, res) => {
  res.json({
    message: 'API WhatsApp Backup fonctionne!',
    endpoints: ['/health', '/test'],
    admin: process.env.ADMIN_PHONE_NUMBER || 'Non configuré'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    availableRoutes: ['/health', '/test']
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 WhatsApp Backup API démarrée!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
🕒 ${new Date().toLocaleString()}
  `);
});
