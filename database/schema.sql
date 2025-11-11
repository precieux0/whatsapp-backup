-- Table des sessions de migration
CREATE TABLE migration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing',
  migration_type TEXT DEFAULT 'full',
  options JSONB DEFAULT '{}',
  step TEXT DEFAULT 'initial',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des exports de migration
CREATE TABLE migration_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID REFERENCES migration_sessions(id),
  export_type TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des sauvegardes WhatsApp
CREATE TABLE whatsapp_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_phone TEXT NOT NULL,
  encrypted_data TEXT,
  backup_type TEXT,
  conversation_count INTEGER DEFAULT 0,
  contact_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_migration_sessions_phone ON migration_sessions(from_phone, to_phone);
CREATE INDEX idx_migration_sessions_status ON migration_sessions(status);
CREATE INDEX idx_whatsapp_backups_phone ON whatsapp_backups(admin_phone);

-- RLS (Row Level Security)
ALTER TABLE migration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_backups ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
CREATE POLICY "Users can manage their migrations" ON migration_sessions
  FOR ALL USING (from_phone = current_user);

CREATE POLICY "Users can access their exports" ON migration_exports
  FOR ALL USING (migration_id IN (
    SELECT id FROM migration_sessions WHERE from_phone = current_user
  ));

CREATE POLICY "Users can access their backups" ON whatsapp_backups
  FOR ALL USING (admin_phone = current_user);