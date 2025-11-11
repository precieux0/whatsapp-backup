// Gestion de l authentification WhatsApp
class WhatsAppAuth {
  constructor() {
    this.detectedPhone = null;
    this.init();
  }

  async init() {
    await this.detectPhoneNumber();
  }

  async detectPhoneNumber() {
    // Simulation de détection - À adapter pour le vrai WhatsApp Web
    setTimeout(() => {
      this.detectedPhone = '+243894697490'; // Numéro simulé
      console.log('📱 Numéro détecté:', this.detectedPhone);
      this.notifyPhoneDetected();
    }, 2000);
  }

  notifyPhoneDetected() {
    chrome.runtime.sendMessage({
      action: 'PHONE_DETECTED',
      data: { phoneNumber: this.detectedPhone }
    });
  }
}

new WhatsAppAuth();
