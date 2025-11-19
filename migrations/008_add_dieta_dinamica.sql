-- Migration 008: Adicionar suporte para Dieta Dinâmica vs Estática
-- Data: 2025-11-19
-- Descrição: Permite que nutricionista/cliente escolha entre:
--   - DINÂMICA: Meta base (TMB+350±400), treinos SOMAM calorias ao dia
--   - ESTÁTICA: Meta base + bonus de atividade, treinos NÃO somam (só controle)

-- 1. Adicionar coluna dieta_dinamica na tabela dietas
ALTER TABLE dietas 
  ADD COLUMN IF NOT EXISTS dieta_dinamica BOOLEAN DEFAULT TRUE;

-- 2. Comentário explicativo
COMMENT ON COLUMN dietas.dieta_dinamica IS 
  'TRUE: Meta base (TMB+350), treinos adicionam calorias. FALSE: Meta inclui bonus de atividade, treinos não somam.';

-- 3. Atualizar registros existentes (todos começam como dinâmicos, comportamento atual)
UPDATE dietas SET dieta_dinamica = TRUE WHERE dieta_dinamica IS NULL;

-- 4. Verificação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dietas' AND column_name = 'dieta_dinamica'
  ) THEN
    RAISE EXCEPTION 'Falha ao adicionar coluna dieta_dinamica';
  END IF;
  
  RAISE NOTICE 'Migration 008 concluída com sucesso!';
END $$;
