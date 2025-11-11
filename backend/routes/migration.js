const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Démarrer une migration
router.post('/start', async (req, res) => {
  try {
    const { fromPhone, toPhone, migrationType, options } = req.body;

    // Validation
    if (!fromPhone || !toPhone) {
      return res.status(400).json({ error: 'Numéros source et destination requis' });
    }

    // Vérifier la propriété (simplifié - à renforcer en production)
    const isAuthorized = await verifyMigrationAuthorization(fromPhone, toPhone);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Migration non autorisée entre ces numéros' });
    }

    // Créer la session de migration
    const migrationSession = {
      id: uuidv4(),
      from_phone: fromPhone,
      to_phone: toPhone,
      status: 'preparing',
      migration_type: migrationType || 'full',
      options: options || {},
      created_at: new Date().toISOString(),
      step: 'initial'
    };

    // Sauvegarder en base
    const { data, error } = await supabase
      .from('migration_sessions')
      .insert([migrationSession])
      .select()
      .single();

    if (error) throw error;

    // Démarrer le processus de migration
    startMigrationProcess(migrationSession.id);

    res.json({
      success: true,
      migrationId: migrationSession.id,
      status: 'started',
      estimatedTime: '5-15 minutes',
      nextSteps: [
        'Export des données source',
        'Conversion des formats',
        'Génération des rapports',
        'Préparation des exports'
      ]
    });

  } catch (error) {
    console.error('Erreur démarrage migration:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage de la migration' });
  }
});

// Vérifier le statut d'une migration
router.get('/status/:migrationId', async (req, res) => {
  try {
    const { migrationId } = req.params;

    const { data: migration, error } = await supabase
      .from('migration_sessions')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (error) throw error;

    // Récupérer les détails de progression
    const progress = await getMigrationProgress(migrationId);

    res.json({
      migration: migration,
      progress: progress,
      exports: await getAvailableExports(migrationId)
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération statut' });
  }
});

// Obtenir les données migrées
router.get('/data/:migrationId/:dataType', async (req, res) => {
  try {
    const { migrationId, dataType } = req.params;
    const { format = 'json' } = req.query;

    const migrationData = await getMigrationData(migrationId, dataType, format);

    if (format === 'json') {
      res.json(migrationData);
    } else if (format === 'text') {
      res.set('Content-Type', 'text/plain');
      res.send(migrationData);
    } else if (format === 'vcard') {
      res.set('Content-Type', 'text/vcard');
      res.send(migrationData);
    }

  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération données' });
  }
});

// Fonctions helper
async function verifyMigrationAuthorization(fromPhone, toPhone) {
  // En production, implémentez une vérification forte
  // Pour le POC, on autorise certaines migrations prédéfinies
  const allowedMigrations = JSON.parse(process.env.ALLOWED_MIGRATIONS || '[]');
  
  return allowedMigrations.some(m => 
    m.from === fromPhone && m.to === toPhone
  ) || fromPhone === process.env.ADMIN_PHONE_NUMBER;
}

async function startMigrationProcess(migrationId) {
  // Processus asynchrone de migration
  setTimeout(async () => {
    try {
      await updateMigrationStatus(migrationId, 'exporting');
      
      // Étape 1: Export des données
      const exportResult = await exportSourceData(migrationId);
      await updateMigrationStatus(migrationId, 'converting');
      
      // Étape 2: Conversion
      const conversionResult = await convertDataForTarget(migrationId);
      await updateMigrationStatus(migrationId, 'completed');
      
      console.log(`✅ Migration ${migrationId} terminée avec succès`);
      
    } catch (error) {
      await updateMigrationStatus(migrationId, 'failed');
      console.error(`❌ Migration ${migrationId} échouée:`, error);
    }
  }, 1000);
}

async function exportSourceData(migrationId) {
  // Implémentation de l'export
  return { success: true, exportedItems: 150 };
}

async function convertDataForTarget(migrationId) {
  // Implémentation de la conversion
  return { success: true, convertedItems: 150 };
}

async function updateMigrationStatus(migrationId, status, step = null) {
  const updateData = { status };
  if (step) updateData.step = step;
  
  await supabase
    .from('migration_sessions')
    .update(updateData)
    .eq('id', migrationId);
}

module.exports = router;