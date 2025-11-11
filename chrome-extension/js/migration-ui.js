class MigrationUI {
  constructor() {
    this.apiUrl = 'https://votre-app.render.com/api';
    this.currentMigration = null;
    this.init();
  }

  async init() {
    this.injectMigrationDashboard();
    this.checkActiveMigrations();
  }

  // Injecter le dashboard de migration dans WhatsApp Web
  injectMigrationDashboard() {
    if (document.getElementById('migration-dashboard')) return;

    const dashboard = document.createElement('div');
    dashboard.id = 'migration-dashboard';
    dashboard.innerHTML = `
      <div style="position: fixed; top: 10px; right: 10px; z-index: 10000; background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 350px;">
        <h4 style="margin: 0 0 10px 0; color: #25D366;">🔄 Migration WhatsApp</h4>
        <div id="migration-status">Prêt pour migration...</div>
        <button onclick="migrationUI.openMigrationWizard()" style="background: #25D366; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
          Ouvrir l'Assistant
        </button>
      </div>
    `;

    document.body.appendChild(dashboard);
  }

  // Ouvrir l'assistant de migration
  openMigrationWizard() {
    const wizard = document.createElement('div');
    wizard.id = 'migration-wizard';
    wizard.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
      background: white; padding: 20px; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); 
      z-index: 10001; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
    `;

    wizard.innerHTML = `
      <h3 style="color: #25D366; margin-top: 0;">🧙‍♂️ Assistant de Migration WhatsApp</h3>
      
      <div class="wizard-step" id="step1">
        <h4>Étape 1: Numéro Source</h4>
        <p>Votre numéro actuel: <strong id="current-phone">Chargement...</strong></p>
      </div>

      <div class="wizard-step" id="step2">
        <h4>Étape 2: Numéro Destination</h4>
        <input type="tel" id="target-phone" placeholder="+33687654321" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
        <small>Le nouveau numéro WhatsApp où migrer les données</small>
      </div>

      <div class="wizard-step" id="step3">
        <h4>Étape 3: Options de Migration</h4>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="opt-conversations" checked> Conversations et messages
        </label>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="opt-contacts" checked> Contacts et groupes
        </label>
        <label style="display: block; margin: 10px 0;">
          <input type="checkbox" id="opt-media"> Fichiers médias
        </label>
      </div>

      <div class="wizard-step" id="step4">
        <h4>Étape 4: Confirmation</h4>
        <div id="migration-summary"></div>
        <button id="start-migration-btn" style="background: #25D366; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 15px;">
          🚀 Démarrer la Migration
        </button>
      </div>

      <div id="migration-progress" style="display: none;">
        <h4>🔄 Migration en Cours</h4>
        <div id="progress-bar" style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 10px 0;">
          <div id="progress-fill" style="background: #25D366; height: 100%; width: 0%; border-radius: 10px; transition: width 0.3s;"></div>
        </div>
        <div id="progress-text">Initialisation...</div>
      </div>

      <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
    `;

    document.body.appendChild(wizard);
    this.attachWizardEvents();
  }

  attachWizardEvents() {
    document.getElementById('start-migration-btn').addEventListener('click', () => {
      this.startMigration();
    });
  }

  async startMigration() {
    const targetPhone = document.getElementById('target-phone').value;
    const options = {
      conversations: document.getElementById('opt-conversations').checked,
      contacts: document.getElementById('opt-contacts').checked,
      media: document.getElementById('opt-media').checked
    };

    try {
      // Cacher le wizard, montrer la progression
      document.getElementById('step4').style.display = 'none';
      document.getElementById('migration-progress').style.display = 'block';

      // Démarrer la migration via l'API
      const response = await fetch(`${this.apiUrl}/migration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPhone: await this.getCurrentPhone(),
          toPhone: targetPhone,
          migrationType: 'full',
          options: options
        })
      });

      const result = await response.json();

      if (result.success) {
        this.currentMigration = result.migrationId;
        this.monitorMigrationProgress();
      } else {
        this.showError('Erreur: ' + result.error);
      }

    } catch (error) {
      this.showError('Erreur lors du démarrage: ' + error.message);
    }
  }

  async monitorMigrationProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${this.apiUrl}/migration/status/${this.currentMigration}`);
        const status = await response.json();

        progressFill.style.width = `${status.progress.percentage || 0}%`;
        progressText.textContent = status.progress.message || 'En cours...';

        if (status.migration.status === 'completed') {
          clearInterval(interval);
          this.showMigrationComplete(status);
        } else if (status.migration.status === 'failed') {
          clearInterval(interval);
          this.showError('Migration échouée');
        }

      } catch (error) {
        console.error('Erreur monitoring:', error);
      }
    }, 2000);
  }

  showMigrationComplete(status) {
    const progressDiv = document.getElementById('migration-progress');
    progressDiv.innerHTML = `
      <h4 style="color: #25D366;">✅ Migration Terminée!</h4>
      <p>Vos données ont été préparées pour le transfert.</p>
      <div style="margin: 15px 0;">
        <button onclick="migrationUI.downloadExport('conversations')" style="background: #1976d2; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 5px;">
            📝 Conversations
        </button>
        <button onclick="migrationUI.downloadExport('contacts')" style="background: #1976d2; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 5px;">
            👥 Contacts
        </button>
        <button onclick="migrationUI.showInstructions()" style="background: #ff9800; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 5px;">
            📋 Instructions
        </button>
      </div>
    `;
  }

  async downloadExport(type) {
    const currentPhone = await this.getCurrentPhone();
    const url = `${this.apiUrl}/export/${type}/${currentPhone}`;
    window.open(url, '_blank');
  }

  showInstructions() {
    alert(`
INSTRUCTIONS DE MIGRATION:

1. SUR L'ANCIEN NUMÉRO:
   - Exportez vos données via les boutons ci-dessus
   - Sauvegardez les fichiers médias importants

2. SUR LE NOUVEAU NUMÉRO:
   - Installez WhatsApp avec le nouveau numéro
   - Importez les contacts via le fichier .vcf
   - Recréez les groupes importants
   - Utilisez l'export texte comme référence

3. COMMUNICATION:
   - Informez vos contacts du changement
   - Partagez votre nouveau numéro
    `);
  }

  async getCurrentPhone() {
    // Implémentation pour détecter le numéro WhatsApp connecté
    return new Promise((resolve) => {
      // Simulation - à adapter avec la vraie détection
      setTimeout(() => resolve('+33612345678'), 100);
    });
  }

  showError(message) {
    const statusDiv = document.getElementById('migration-status');
    if (statusDiv) {
      statusDiv.innerHTML = `<div style="color: red;">❌ ${message}</div>`;
    }
    alert(message);
  }
}

// Initialisation
const migrationUI = new MigrationUI();