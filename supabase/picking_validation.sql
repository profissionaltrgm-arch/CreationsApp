-- ============================================================
-- G300 · SISTEMA DE VALIDAÇÕES UNIVERSAL
-- Execução: Supabase SQL Editor
-- ============================================================
-- Remove tabelas antigas de picking (se existirem)
DROP TABLE IF EXISTS picking_record CASCADE;
DROP TABLE IF EXISTS picking_validation CASCADE;

-- ============================================================
-- TABELA 1: validation_sessions
-- Uma linha por empresa por data/semana.
-- Guarda o total validado; as divergências ficam na tabela 2.
-- ============================================================
CREATE TABLE IF NOT EXISTS validation_sessions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date     DATE    NOT NULL,                     -- data da contagem
  week_number      INT     NOT NULL,                     -- nº da semana ISO
  year             INT     NOT NULL,
  week_start       DATE    NOT NULL,
  week_end         DATE    NOT NULL,
  company          TEXT    NOT NULL,                     -- 'BR' | 'AG' | 'ALL'
  type             TEXT    NOT NULL DEFAULT 'picking',   -- 'picking' | 'inventory' | ...
  validated_count  INT     NOT NULL DEFAULT 0,           -- posições validadas (contadas)
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA 2: divergences
-- Apenas as divergências. Universal (tipo vem do campo type).
-- Referencia session_id quando vinculada a uma sessão.
-- ============================================================
CREATE TABLE IF NOT EXISTS divergences (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID    REFERENCES validation_sessions(id) ON DELETE CASCADE,
  session_date  DATE    NOT NULL,
  position      TEXT    NOT NULL,  -- referência à tabela position
  company       TEXT    NOT NULL,  -- 'BR' | 'AG'
  code          TEXT    NOT NULL,  -- código do produto
  description   TEXT,              -- nome do produto (opcional)
  system_qty    INT     NOT NULL DEFAULT 0,
  physical_qty  INT     NOT NULL DEFAULT 0,
  type          TEXT    NOT NULL DEFAULT 'picking',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vsessions_type    ON validation_sessions(type);
CREATE INDEX IF NOT EXISTS idx_vsessions_company ON validation_sessions(company);
CREATE INDEX IF NOT EXISTS idx_vsessions_week    ON validation_sessions(year, week_number);
CREATE INDEX IF NOT EXISTS idx_divs_session      ON divergences(session_id);
CREATE INDEX IF NOT EXISTS idx_divs_type         ON divergences(type);
CREATE INDEX IF NOT EXISTS idx_divs_company      ON divergences(company);

-- RLS
ALTER TABLE validation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE divergences         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsessions_all" ON validation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "divergences_all" ON divergences       FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS DE EXEMPLO (Semana 21 · 2026)
-- Sessão AG: 102 posições validadas, 6 divergências
-- Sessão BR: 84 posições validadas, 1 divergência
-- ============================================================
INSERT INTO validation_sessions (session_date, week_number, year, week_start, week_end, company, type, validated_count, notes)
VALUES
  ('2026-05-19', 21, 2026, '2026-05-19', '2026-05-23', 'AG', 'picking', 102, 'Validação PK Semana 21 · AG'),
  ('2026-05-19', 21, 2026, '2026-05-19', '2026-05-23', 'BR', 'picking', 84,  'Validação PK Semana 21 · BR');

DO $$
DECLARE
  ag_id UUID;
  br_id UUID;
BEGIN
  SELECT id INTO ag_id FROM validation_sessions WHERE week_number = 21 AND year = 2026 AND company = 'AG' LIMIT 1;
  SELECT id INTO br_id FROM validation_sessions WHERE week_number = 21 AND year = 2026 AND company = 'BR' LIMIT 1;

  -- Divergências AG
  INSERT INTO divergences (session_id, session_date, position, company, code, system_qty, physical_qty, type) VALUES
    (ag_id, '2026-05-19', 'PKCHAO',       'AG', '2401-01',  9,  14, 'picking'),
    (ag_id, '2026-05-19', 'PKCHAO',       'AG', '2501-01',  4,  0,  'picking'),
    (ag_id, '2026-05-19', 'PKCHAO',       'AG', '5617-04',  24, 0,  'picking'),
    (ag_id, '2026-05-19', 'PKCHAO',       'AG', '6301-02',  1,  0,  'picking'),
    (ag_id, '2026-05-19', 'PKCHAO',       'AG', '6312-02',  1,  0,  'picking'),
    (ag_id, '2026-05-19', 'PK30002A0201', 'AG', '4899-01',  39, 0,  'picking'),
    (ag_id, '2026-05-19', 'PK30002A0241', 'AG', '4899-01',  0,  39, 'picking');

  -- Divergências BR
  INSERT INTO divergences (session_id, session_date, position, company, code, system_qty, physical_qty, type) VALUES
    (br_id, '2026-05-19', 'PK30002A0012', 'BR', '3798-01', 1, 0, 'picking');
END $$;
