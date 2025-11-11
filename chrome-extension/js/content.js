// Content Script pour WhatsApp Web
console.log('🔧 WhatsApp Migration Assistant - Content Script chargé');

class WhatsAppContent {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    // Attendre que WhatsApp Web soit chargé
    if (document.querySelector('#app')) {
      this.injectMigrationUI();
    } else {
      setTimeout(() => this.init(), 1000);
    }
  }

  injectMigrationUI() {
    if (this.isInitialized) return;
    
    console.log('🎯 Injection de l interface dans WhatsApp Web...');
    
    // Créer le bouton flottant
    const floatingButton = document.createElement('div');
    floatingButton.innerHTML = `
      <div style="
        position: fixed; 
        top: 10px; 
        right: 10px; 
        z-index: 10000; 
        background: #25D366; 
        color: white; 
        padding: 10px 15px; 
        border-radius: 20px; 
        cursor: pointer;
        font-size: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        <span>🔄</span>
        <span>WhatsApp Backup</span>
      </div>
    `;
    
    floatingButton.onclick = () => this.openMigrationPanel();
    document.body.appendChild(floatingButton);
    
    this.isInitialized = true;
    console.log('✅ Interface injectée avec succès');
  }

  openMigrationPanel() {
    // Envoyer un message au background pour ouvrir le popup
    chrome.runtime.sendMessage({
      action: 'OPEN_MIGRATION_PANEL'
    });
  }

  // Écouter les messages du background
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'BACKGROUND_NOTIFICATION') {
        this.handleBackgroundNotification(request.event, request.data);
      }
      sendResponse({ received: true });
    });
  }

  handleBackgroundNotification(event, data) {
    console.log('📢 Notification reçue:', event, data);
    
    switch (event) {
      case 'BACKUP_STARTED':
        this.showNotification('Sauvegarde démarrée!');
        break;
      case 'MIGRATION_STARTED':
        this.showNotification('Migration démarrée!');
        break;
      case 'USER_LOGGED_OUT':
        this.showNotification('Déconnexion réussie');
        break;
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: #25D366;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

// Démarrer le content script
new WhatsAppContent().setupMessageListener();
