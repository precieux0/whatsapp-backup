// Script pour le popup de l extension
document.addEventListener('DOMContentLoaded', async function() {
  await loadUserStatus();
  setupEventListeners();
});

async function loadUserStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_USER_STATUS'
    });
    
    if (response.success) {
      updateUI(response.data);
    }
  } catch (error) {
    showError('Erreur de connexion');
  }
}

function updateUI(status) {
  const statusDiv = document.getElementById('status');
  const authSection = document.getElementById('auth-section');
  const migrationSection = document.getElementById('migration-section');
  
  if (status.isAuthenticated) {
    statusDiv.innerHTML = `<div class="status connected">✅ Connecté: ${status.currentUser}</div>`;
    authSection.style.display = 'none';
    migrationSection.style.display = 'block';
  } else {
    statusDiv.innerHTML = '<div class="status disconnected">❌ Non connecté</div>';
    authSection.style.display = 'block';
    migrationSection.style.display = 'none';
  }
}

function setupEventListeners() {
  // Bouton de vérification
  document.getElementById('verifyBtn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('phoneNumber').value;
    if (!phoneNumber) {
      showError('Veuillez entrer votre numéro');
      return;
    }
    
    await authenticateUser(phoneNumber);
  });
  
  // Bouton sauvegarde
  document.getElementById('startBackup').addEventListener('click', async () => {
    await startBackup();
  });
  
  // Bouton migration
  document.getElementById('startMigration').addEventListener('click', async () => {
    await startMigration();
  });
  
  // Bouton export
  document.getElementById('exportData').addEventListener('click', async () => {
    await exportData();
  });
}

async function authenticateUser(phoneNumber) {
  try {
    showLoading('Vérification en cours...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'AUTHENTICATE_USER',
      data: {
        phoneNumber: phoneNumber,
        whatsappData: { userAgent: navigator.userAgent }
      }
    });
    
    if (response.success && response.data.success) {
      showSuccess('Authentification réussie!');
      await loadUserStatus();
    } else {
      showError('Erreur d authentification: ' + (response.data.error || 'Inconnu'));
    }
  } catch (error) {
    showError('Erreur: ' + error.message);
  }
}

async function startBackup() {
  try {
    showLoading('Sauvegarde en cours...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'START_BACKUP',
      data: {
        type: 'full',
        includeMedia: true
      }
    });
    
    if (response.success) {
      showSuccess('Sauvegarde démarrée!');
    } else {
      showError('Erreur sauvegarde: ' + response.error);
    }
  } catch (error) {
    showError('Erreur: ' + error.message);
  }
}

async function startMigration() {
  const targetPhone = prompt('Numéro de destination:');
  if (!targetPhone) return;
  
  try {
    showLoading('Migration en cours...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'START_MIGRATION',
      data: {
        toPhone: targetPhone,
        migrationType: 'full'
      }
    });
    
    if (response.success) {
      showSuccess('Migration démarrée!');
    } else {
      showError('Erreur migration: ' + response.error);
    }
  } catch (error) {
    showError('Erreur: ' + error.message);
  }
}

async function exportData() {
  alert('Export des données...');
  // Implémentation à venir
}

function showLoading(message) {
  document.getElementById('status').innerHTML = 
    `<div class="status">⏳ ${message}</div>`;
}

function showSuccess(message) {
  document.getElementById('status').innerHTML = 
    `<div class="status connected">✅ ${message}</div>`;
}

function showError(message) {
  document.getElementById('status').innerHTML = 
    `<div class="status disconnected">❌ ${message}</div>`;
}
