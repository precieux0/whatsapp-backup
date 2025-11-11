const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ==================== ROUTES D'AUTHENTIFICATION ====================

// Vérifier l'admin WhatsApp
app.post('/whatsapp-auth/verify-admin', async (req, res) => {
  try {
    const { phoneNumber, whatsappData } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Numéro requis' });
    }

    // Vérifier si c'est le numéro admin autorisé
    const isAdmin = phoneNumber === process.env.ADMIN_PHONE_NUMBER;

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: 'Numéro non autorisé comme administrateur' 
      });
    }

    // Vérifier ou créer l'admin dans la base
    const { data: admin, error } = await supabase
      .from('whatsapp_admins')
      .upsert([
        {
          phone_number: phoneNumber,
          whatsapp_data: whatsappData,
          is_verified: true,
          last_verification: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Générer un token de session
    const sessionToken = CryptoJS.AES.encrypt(
      JSON.stringify({
        phoneNumber: phoneNumber,
        timestamp: Date.now(),
        role: 'admin'
      }), 
      process.env.ENCRYPTION_KEY
    ).toString();

    res.json({
      success: true,
      isAdmin: true,
      phoneNumber: phoneNumber,
      sessionToken: sessionToken,
      message: 'Compte administrateur vérifié avec succès'
    });

  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification' 
    });
  }
});

// Vérifier la session
app.post('/auth/verify-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.json({ valid: false, error: 'Token manquant' });
    }

    const bytes = CryptoJS.AES.decrypt(sessionToken, process.env.ENCRYPTION_KEY);
    const sessionData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // Vérifier l'expiration (24h)
    const isExpired = Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000;

    if (isExpired) {
      return res.json({ valid: false, error: 'Session expirée' });
    }

    res.json({
      valid: true,
      phoneNumber: sessionData.phoneNumber,
      role: sessionData.role
    });

  } catch (error) {
    res.json({ valid: false, error: 'Session invalide' });
  }
});

// ==================== ROUTES DE SAUVEGARDE ====================

// Sauvegarder les données
app.post('/backup/save', async (req, res) => {
  try {
    const { userId, sessionToken, encryptedData, backupType = 'full' } = req.body;

    if (!userId || !encryptedData) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // Vérifier la session
    const sessionResponse = await verifySession(sessionToken);
    if (!sessionResponse.valid) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    const { data, error } = await supabase
      .from('whatsapp_backups')
      .insert([
        {
          admin_phone: userId,
          encrypted_data: encryptedData,
          backup_type: backupType,
          backup_name: `Sauvegarde ${new Date().toLocaleDateString()}`,
          conversation_count: 0,
          contact_count: 0,
          media_count: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.json({ 
      success: true, 
      backupId: data[0].id,
      message: 'Sauvegarde réussie'
    });

  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// Obtenir le statut d'une sauvegarde
app.get('/backup/status/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;

    const { data, error } = await supabase
      .from('whatsapp_backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (error) throw error;

    res.json({
      backup: data,
      status: 'completed',
      progress: 100
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération statut' });
  }
});

// ==================== ROUTES DE MIGRATION ====================

// Démarrer une migration
app.post('/migration/start', async (req, res) => {
  try {
    const { fromPhone, toPhone, sessionToken, migrationType = 'full', options = {} } = req.body;

    if (!fromPhone || !toPhone) {
      return res.status(400).json({ error: 'Numéros source et destination requis' });
    }

    // Vérifier la session
    const sessionResponse = await verifySession(sessionToken);
    if (!sessionResponse.valid) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    // Vérifier que la migration est autorisée
    const isAuthorized = await verifyMigrationAuthorization(fromPhone, toPhone);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Migration non autorisée entre ces numéros' });
    }

    // Créer la session de migration
    const migrationSession = {
      from_phone: fromPhone,
      to_phone: toPhone,
      status: 'preparing',
      migration_type: migrationType,
      options: options,
      progress: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('migration_sessions')
      .insert([migrationSession])
      .select()
      .single();

    if (error) throw error;

    // Simuler le processus de migration
    simulateMigrationProcess(data.id);

    res.json({
      success: true,
      migrationId: data.id,
      status: 'started',
      estimatedTime: '5-15 minutes',
      message: 'Migration démarrée avec succès'
    });

  } catch (error) {
    console.error('Erreur démarrage migration:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage de la migration' });
  }
});

// Obtenir le statut d'une migration
app.get('/migration/status/:migrationId', async (req, res) => {
  try {
    const { migrationId } = req.params;

    const { data: migration, error } = await supabase
      .from('migration_sessions')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (error) throw error;

    res.json({
      migration: migration,
      progress: {
        percentage: migration.progress,
        message: getProgressMessage(migration.status),
        step: migration.status
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération statut' });
  }
});

// ==================== ROUTES D'EXPORT ====================

// Exporter les conversations
app.get('/export/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { format = 'json' } = req.query;

    // Récupérer les sauvegardes
    const { data: backups, error } = await supabase
      .from('whatsapp_backups')
      .select('encrypted_data, created_at')
      .eq('admin_phone', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!backups || backups.length === 0) {
      return res.json({ 
        success: false, 
        message: 'Aucune sauvegarde trouvée' 
      });
    }

    const conversations = formatConversationsForExport(backups[0].encrypted_data);

    if (format === 'text') {
      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="whatsapp-conversations-${phoneNumber}.txt"`
      });
      res.send(generateTextExport(conversations));
    } else {
      res.json({
        success: true,
        conversations: conversations,
        export_date: new Date().toISOString(),
        total: conversations.length
      });
    }

  } catch (error) {
    res.status(500).json({ error: 'Erreur export conversations' });
  }
});

// ==================== ROUTES DE SANTÉ ET TEST ====================

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'WhatsApp Backup API',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// Test Supabase
app.get('/api/test-supabase', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.json({ 
        status: 'Variables manquantes',
        supabase_url: process.env.SUPABASE_URL ? '✅' : '❌',
        supabase_key: process.env.SUPABASE_ANON_KEY ? '✅' : '❌',
        admin_phone: process.env.ADMIN_PHONE_NUMBER ? '✅' : '❌'
      });
    }

    // Test de connexion
    const { data, error } = await supabase
      .from('whatsapp_admins')
      .select('*')
      .limit(5);

    if (error) throw error;

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
      details: error.message
    });
  }
});

// Route API principale
app.get('/api', (req, res) => {
  res.json({
    message: 'Bienvenue sur WhatsApp Migration Assistant API!',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      auth: '/whatsapp-auth/verify-admin',
      backup: '/backup/save',
      migration: '/migration/start',
      export: '/export/conversations/:phone',
      test: '/api/test-supabase'
    },
    admin: process.env.ADMIN_PHONE_NUMBER || 'À configurer'
  });
});

// ==================== FONCTIONS HELPER ====================

async function verifySession(sessionToken) {
  try {
    if (!sessionToken) return { valid: false };
    
    const bytes = CryptoJS.AES.decrypt(sessionToken, process.env.ENCRYPTION_KEY);
    const sessionData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    const isExpired = Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000;
    return { valid: !isExpired, phoneNumber: sessionData.phoneNumber };
  } catch (error) {
    return { valid: false };
  }
}

async function verifyMigrationAuthorization(fromPhone, toPhone) {
  // Pour le moment, autoriser seulement l'admin principal
  return fromPhone === process.env.ADMIN_PHONE_NUMBER;
}

function simulateMigrationProcess(migrationId) {
  // Simulation du processus de migration
  setTimeout(async () => {
    const steps = ['preparing', 'exporting', 'converting', 'completed'];
    let progress = 0;
    
    for (const step of steps) {
      progress += 25;
      await supabase
        .from('migration_sessions')
        .update({ status: step, progress: progress, updated_at: new Date().toISOString() })
        .eq('id', migrationId);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }, 1000);
}

function getProgressMessage(status) {
  const messages = {
    'preparing': 'Préparation des données...',
    'exporting': 'Export des conversations...',
    'converting': 'Conversion des formats...',
    'completed': 'Migration terminée!'
  };
  return messages[status] || 'En cours...';
}

function formatConversationsForExport(encryptedData) {
  // Simulation - À implémenter avec le vrai déchiffrement
  return [
    {
      name: 'Contact 1',
      last_message: 'Dernier message...',
      message_count: 15,
      last_active: new Date().toISOString()
    },
    {
      name: 'Contact 2', 
      last_message: 'Bonjour!',
      message_count: 8,
      last_active: new Date().toISOString()
    }
  ];
}

function generateTextExport(conversations) {
  let text = `EXPORT WHATSAPP - ${new Date().toLocaleDateString()}\n`;
  text += '='.repeat(50) + '\n\n';
  
  conversations.forEach((conv, index) => {
    text += `CONVERSATION ${index + 1}: ${conv.name}\n`;
    text += `Dernier message: ${conv.last_message}\n`;
    text += `Nombre de messages: ${conv.message_count}\n`;
    text += `Dernière activité: ${new Date(conv.last_active).toLocaleDateString()}\n`;
    text += '-'.repeat(30) + '\n\n';
  });
  
  return text;
}

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    availableRoutes: [
      '/health',
      '/api',
      '/api/test-supabase',
      '/whatsapp-auth/verify-admin',
      '/backup/save', 
      '/migration/start',
      '/export/conversations/:phone'
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
🔗 Supabase: ${process.env.SUPABASE_URL ? '✅ Configuré' : '❌ Non configuré'}
🕒 ${new Date().toLocaleString()}
  `);
});