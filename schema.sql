-- ══════════════════════════════════════════════════════════════════
-- Schema PostgreSQL — Portfolio Thomas Leloup
-- Exécute ce fichier sur neon.tech → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Projets
CREATE TABLE IF NOT EXISTS projects (
  id            VARCHAR(100) PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(500),
  category      VARCHAR(100) DEFAULT 'Case Study',
  year          CHAR(4),
  role          VARCHAR(255),
  duration      VARCHAR(100),
  platform      VARCHAR(255),
  client        VARCHAR(255),
  cover_type    VARCHAR(50) DEFAULT 'cabin',
  context       TEXT,
  problematique TEXT,
  objectifs     JSONB DEFAULT '[]',
  process_steps JSONB DEFAULT '[]',
  metrics       JSONB DEFAULT '[]',
  tools         JSONB DEFAULT '[]',
  plus_values   JSONB DEFAULT '[]',
  featured      BOOLEAN DEFAULT false,
  confidential  BOOLEAN DEFAULT false,
  display_order SMALLINT DEFAULT 99,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id    VARCHAR(100) PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  color CHAR(7)      NOT NULL DEFAULT '#7C3AED'
);

-- Liaison projets ↔ tags
CREATE TABLE IF NOT EXISTS project_tags (
  project_id VARCHAR(100) REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     VARCHAR(100) REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Témoignages
CREATE TABLE IF NOT EXISTS testimonials (
  id            VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  initials      VARCHAR(3),
  role          VARCHAR(255),
  company       VARCHAR(255),
  company_logo  VARCHAR(500),
  content       TEXT NOT NULL,
  display_order SMALLINT DEFAULT 99,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Admin
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id         BIGSERIAL PRIMARY KEY,
  type       VARCHAR(100),
  payload    JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_type    ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- ── Données par défaut ────────────────────────────────────────────

INSERT INTO tags (id, name, color) VALUES
  ('ios',           'iOS',          '#4B7FFA'),
  ('ux-research',   'UX Research',  '#8B5CF6'),
  ('design-system', 'Design System','#06D6A0'),
  ('agile',         'Agile',        '#F59E0B'),
  ('web',           'Web',          '#38BDF8'),
  ('mobile',        'Mobile',       '#EC4899'),
  ('transport',     'Transport',    '#F97316'),
  ('b2e',           'B2E',          '#14B8A6'),
  ('ai',            'IA / ML',      '#A78BFA'),
  ('figma',         'Figma',        '#7C3AED')
ON CONFLICT DO NOTHING;

INSERT INTO testimonials (id, name, initials, role, company, content, display_order) VALUES
  ('t1', 'Frédéric A.', 'FA', 'Responsable UX', 'Air France',
   'Thomas est une personne compétente et appliquée. Des facultés importantes tant dans la maîtrise des outils d''ergonomie, les process de l''agilité. Il a aussi une casquette d''ancien développeur qui permet d''avoir une fluidité lors des échanges avec les équipes IT.',
   1),
  ('t2', 'Bahia B.', 'BB', 'Lead Designer', 'Air France',
   'Je recommande vivement Thomas LELOUP pour tout poste lié à l''UX/UI. Au cours de sa période d''apprentissage chez Air France, il a démontré une grande maîtrise de Figma et une compréhension approfondie des principes de l''UX.',
   2)
ON CONFLICT DO NOTHING;

-- Crée le compte admin (mot de passe à hasher avec bcrypt avant insertion)
-- Lance: node -e "require('bcryptjs').hash('Thom@sllp1112',10).then(console.log)"
-- Puis remplace le hash ci-dessous
INSERT INTO admin_users (username, password_hash) VALUES
  ('thomas', 'REMPLACE_PAR_TON_HASH_BCRYPT')
ON CONFLICT DO NOTHING;
