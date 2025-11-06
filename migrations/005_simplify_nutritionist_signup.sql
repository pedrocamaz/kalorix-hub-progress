-- Fix: Simplificar signup de nutricionista
-- Remove constraints problemáticas e ajusta policies

-- 1. Remove constraint NOT NULL de telefone (nutricionistas não precisam de telefone)
ALTER TABLE public.users ALTER COLUMN telefone DROP NOT NULL;

-- 2. Remove constraint de telefone único (causa conflito entre clientes e nutricionistas)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_telefone_key;

-- 3. Adiciona constraint única apenas para telefones não nulos
DROP INDEX IF EXISTS users_telefone_unique_idx;
CREATE UNIQUE INDEX users_telefone_unique_idx ON public.users (telefone) WHERE telefone IS NOT NULL;

-- 4. Policy para permitir que qualquer autenticado crie registro em nutritionists
-- (será usado pela função add_client_by_share_code também)
DROP POLICY IF EXISTS "nutritionists_insert_own_profile" ON public.nutritionists;
DROP POLICY IF EXISTS "allow_authenticated_insert_nutritionists" ON public.nutritionists;

CREATE POLICY "allow_authenticated_insert_nutritionists"
ON public.nutritionists
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Comentários
COMMENT ON POLICY "allow_authenticated_insert_nutritionists" ON public.nutritionists 
IS 'Permite que usuários autenticados criem perfis de nutricionista';
