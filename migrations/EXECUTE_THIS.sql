-- ============================================
-- MIGRAÇÃO CONSOLIDADA - CORREÇÃO NUTRICIONISTAS
-- Execute este SQL completo no Supabase SQL Editor
-- ============================================
-- NOTA: Mantém a tabela users intacta, apenas ajusta policies
-- ============================================

-- PARTE 1: Corrigir policies de nutritionists
-- ============================================

DROP POLICY IF EXISTS "nutritionists_insert_own_profile" ON public.nutritionists;
DROP POLICY IF EXISTS "allow_authenticated_insert_nutritionists" ON public.nutritionists;

CREATE POLICY "allow_authenticated_insert_nutritionists"
ON public.nutritionists
FOR INSERT
TO authenticated
WITH CHECK (true);

-- PARTE 2: Atualizar função add_client_by_share_code
-- ============================================

CREATE OR REPLACE FUNCTION add_client_by_share_code(
    p_nutritionist_user_id UUID,
    p_share_code TEXT
)
RETURNS JSON AS $$
DECLARE
    v_nutritionist_id UUID;
    v_client_id UUID;
    v_result JSON;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    -- Busca o ID do nutricionista
    SELECT id INTO v_nutritionist_id
    FROM public.nutritionists
    WHERE user_id = p_nutritionist_user_id;
    
    -- Se não encontrou, tenta criar o perfil automaticamente
    IF v_nutritionist_id IS NULL THEN
        -- Busca dados do usuário na tabela users
        SELECT email, nome INTO v_user_email, v_user_name
        FROM public.users
        WHERE id = p_nutritionist_user_id
        AND user_type = 'nutritionist';
        
        IF v_user_email IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Usuário nutricionista não encontrado'
            );
        END IF;
        
        -- Cria o perfil do nutricionista
        INSERT INTO public.nutritionists (
            user_id,
            email,
            full_name
        ) VALUES (
            p_nutritionist_user_id,
            v_user_email,
            v_user_name
        )
        RETURNING id INTO v_nutritionist_id;
        
        -- Log para debug
        RAISE NOTICE 'Perfil de nutricionista criado automaticamente: %', v_nutritionist_id;
    END IF;
    
    -- Busca o cliente pelo share_code
    SELECT id INTO v_client_id
    FROM public.users
    WHERE share_code = p_share_code
    AND user_type = 'client';
    
    IF v_client_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Código inválido ou cliente não encontrado'
        );
    END IF;
    
    -- Verifica se já existe o relacionamento
    IF EXISTS (
        SELECT 1 FROM public.nutritionist_clients
        WHERE nutritionist_id = v_nutritionist_id
        AND client_id = v_client_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cliente já está na sua lista'
        );
    END IF;
    
    -- Adiciona o cliente
    INSERT INTO public.nutritionist_clients (nutritionist_id, client_id)
    VALUES (v_nutritionist_id, v_client_id);
    
    -- Retorna sucesso com dados do cliente
    SELECT json_build_object(
        'success', true,
        'client', json_build_object(
            'id', u.id,
            'name', u.nome,
            'email', u.email,
            'phone', u.telefone,
            'share_code', u.share_code
        )
    ) INTO v_result
    FROM public.users u
    WHERE u.id = v_client_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_client_by_share_code TO authenticated;

-- PARTE 3: Comentários
-- ============================================

COMMENT ON POLICY "allow_authenticated_insert_nutritionists" ON public.nutritionists 
IS 'Permite que usuários autenticados criem perfis de nutricionista';

COMMENT ON FUNCTION add_client_by_share_code IS 'Adiciona cliente à lista do nutricionista usando share code. Cria perfil do nutricionista se necessário.';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- Verificar se tudo está OK:
SELECT 'Migração executada com sucesso!' as status;
