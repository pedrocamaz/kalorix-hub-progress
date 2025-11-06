-- Fix: Add INSERT policy for nutritionists table during signup
-- Execute este SQL no Supabase SQL Editor

-- Adiciona policy para permitir INSERT na tabela nutritionists durante o signup
-- Qualquer usuário autenticado pode criar seu perfil de nutricionista
CREATE POLICY "nutritionists_can_insert_own_profile" 
ON public.nutritionists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Verifica se a policy foi criada
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'nutritionists';
