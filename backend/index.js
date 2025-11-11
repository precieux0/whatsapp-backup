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

// ✅ AJOUTEZ CETTE ROUTE POUR TESTER SUPABASE
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    // Vérifier si les variables sont configurées
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.json({ 
        status: 'Variables Supabase non configurées',
        supabase_url: process.env.SUPABASE_URL || 'Manquant',
        supabase_key: process.env.SUPABASE_ANON_KEY ? 'Configuré' : 'Manquant',
        admin_phone: process.env.ADMIN_PHONE_NUMBER || 'Manquant'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test simple de connexion
    const { data, error } = await supabase
      .from('whatsapp_admins')
      .select('*')
      .limit(5);

    if (error) {
      return res.status(500).json({
        error: 'Erreur Supabase',
        details: error.message
      });
    }

    res.json({
      supabase: '✅ Connecté avec succès!',
      tables_access: '✅ Tables accessibles',
      data_count: data.length,
      sample_data: data,
      your_admin_number: process.env.ADMIN_PHONE_NUMBER
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erreur de connexion à Supabase',
      details: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// Route API principale
app.get('/api', (req, res) => {
  res.json({
    message: 'Bienvenue sur WhatsApp Migration Assistant API!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      test: '/test',
      api_info: '/api',
      supabase_test: '/api/test-supabase'
    },
    admin: process.env.ADMIN_PHONE_NUMBER || 'À configurer'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    availableRoutes: [
      '/health',
      '/test', 
      '/api',
      '/api/test-supabase'
    ]
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 WhatsApp Backup API démarrée!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
📞 Admin: ${process.env.ADMIN_PHONE_NUMBER || 'Non configuré'}
🔗 Supabase: ${process.env.SUPABASE_URL ? 'Configuré' : 'Non configuré'}
🕒 ${new Date().toLocaleString()}
  `);
});