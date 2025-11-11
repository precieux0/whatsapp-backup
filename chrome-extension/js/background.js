// WhatsApp Migration Assistant - Background Script
const API_BASE_URL = 'https://whatsapp-backup.onrender.com/api';

class WhatsAppBackground {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionToken = null;
    this.init();
  }

  async init() {
    console.log('🚀 WhatsApp Migration Assistant initialisé');
    await this.loadSavedSession();
    this.setupMessageListeners();
  }

  async loadSavedSession() {
    try {
      const result = await chrome.storage.local.get(['whatsappSession', 'adminPhone']);
      if (result.whatsappSession && result.adminPhone) {
        this.sessionToken = result.whatsappSession;
        this.currentUser = result.adminPhone;
        this.isAuthenticated = true;
        console.log('✅ Session restaurée pour:', this.currentUser);
      }
    } catch (error) {
      console.error('❌ Erreur chargement session:', error);
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`❌ API Error ${endpoint}:`, error);
      throw error;
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      let response;
      switch (request.action) {
        case 'AUTHENTICATE_USER':
          response = await this.authenticateUser(request.data);
          break;
        case 'START_BACKUP':
          response = await this.startBackup(request.data);
          break;
        case 'START_MIGRATION':
          response = await this.startMigration(request.data);
          break;
        case 'GET_USER_STATUS':
          response = await this.getUserStatus();
          break;
        case 'LOGOUT_USER':
          response = await this.logoutUser();
          break;
        default:
          response = { error: 'Action non reconnue' };
      }
      sendResponse({ success: true, data: response });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async authenticateUser(userData) {
    const response = await this.apiCall('/whatsapp-auth/verify-admin', {
      method: 'POST',
      body: { phoneNumber: userData.phoneNumber, whatsappData: userData.whatsappData }
    });

    if (response.success) {
      this.sessionToken = response.sessionToken;
      this.currentUser = response.phoneNumber;
      this.isAuthenticated = true;
      await chrome.storage.local.set({
        whatsappSession: response.sessionToken,
        adminPhone: response.phoneNumber
      });
      console.log('✅ Utilisateur authentifié:', this.currentUser);
    }
    return response;
  }

  async startBackup(backupData) {
    if (!this.isAuthenticated) throw new Error('Utilisateur non authentifié');
    
    const response = await this.apiCall('/backup/save', {
      method: 'POST',
      body: { ...backupData, userId: this.currentUser, sessionToken: this.sessionToken }
    });
    
    this.notifyTabs('BACKUP_STARTED', response);
    return response;
  }

  async startMigration(migrationData) {
    if (!this.isAuthenticated) throw new Error('Utilisateur non authentifié');
    
    const response = await this.apiCall('/migration/start', {
      method: 'POST',
      body: { ...migrationData, fromPhone: this.currentUser, sessionToken: this.sessionToken }
    });

    this.notifyTabs('MIGRATION_STARTED', response);
    return response;
  }

  async getUserStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser
    };
  }

  async logoutUser() {
    this.isAuthenticated = false;
    this.sessionToken = null;
    this.currentUser = null;
    await chrome.storage.local.remove(['whatsappSession', 'adminPhone']);
    this.notifyTabs('USER_LOGGED_OUT');
    return { success: true, message: 'Déconnexion réussie' };
  }

  notifyTabs(event, data = null) {
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'BACKGROUND_NOTIFICATION',
          event: event,
          data: data
        }).catch(() => {});
      });
    });
  }
}

// Initialisation
const whatsappBackground = new WhatsAppBackground();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

console.log('✅ WhatsApp Migration Assistant - Background script chargé');
