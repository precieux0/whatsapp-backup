const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Export des conversations en format texte
router.get('/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { format = 'text' } = req.query;

    const conversations = await getConversationsForExport(phoneNumber);
    
    if (format === 'json') {
      res.json(conversations);
    } else {
      // Format texte lisible
      const textExport = generateTextExport(conversations);
      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="whatsapp-conversations-${phoneNumber}.txt"`
      });
      res.send(textExport);
    }

  } catch (error) {
    res.status(500).json({ error: 'Erreur export conversations' });
  }
});

// Export des contacts en vCard
router.get('/contacts/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contacts = await getContactsForExport(phoneNumber);
    const vcardExport = generateVCardExport(contacts);

    res.set({
      'Content-Type': 'text/vcard',
      'Content-Disposition': `attachment; filename="whatsapp-contacts-${phoneNumber}.vcf"`
    });
    res.send(vcardExport);

  } catch (error) {
    res.status(500).json({ error: 'Erreur export contacts' });
  }
});

// Export des médias (liste)
router.get('/media/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const mediaList = await getMediaListForExport(phoneNumber);
    
    res.json({
      success: true,
      media: mediaList,
      instructions: [
        '1. Les fichiers médias sont sauvegardés dans votre stockage',
        '2. Vous pouvez les télécharger manuellement depuis WhatsApp',
        '3. Ou utiliser l\'application mobile pour les récupérer'
      ]
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur export médias' });
  }
});

// Fonctions d'export
async function getConversationsForExport(phoneNumber) {
  const { data: backups } = await supabase
    .from('whatsapp_backups')
    .select('encrypted_data')
    .eq('admin_phone', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!backups || backups.length === 0) {
    return [];
  }

  // Déchiffrer et formater pour l'export
  return formatConversationsForExport(backups[0].encrypted_data);
}

function generateTextExport(conversations) {
  let exportText = `EXPORT WHATSAPP - ${new Date().toLocaleDateString()}\n`;
  exportText += '='.repeat(50) + '\n\n';

  conversations.forEach((conv, index) => {
    exportText += `CONVERSATION ${index + 1}: ${conv.name}\n`;
    exportText += '-'.repeat(30) + '\n';
    
    conv.messages.forEach(msg => {
      exportText += `[${msg.time}] ${msg.sender}: ${msg.text}\n`;
    });
    
    exportText += '\n';
  });

  return exportText;
}

function generateVCardExport(contacts) {
  let vcard = '';
  
  contacts.forEach(contact => {
    vcard += 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += `FN:${contact.name}\n`;
    vcard += `TEL:${contact.phone}\n`;
    vcard += `NOTE:Contact WhatsApp migré\n`;
    vcard += 'END:VCARD\n';
  });
  
  return vcard;
}

module.exports = router;