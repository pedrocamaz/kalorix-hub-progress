-- Fix: Criar função RPC para signup de nutricionista
-- Esta função roda com SECURITY DEFINER, permitindo criar o perfil sem problemas de RLS

-- Remove a policy que não está funcionando
DROP POLICY IF EXISTS "nutritionists_can_insert_own_profile" ON public.nutritionists;

-- Cria função para signup de nutricionista
CREATE OR REPLACE FUNCTION create_nutritionist_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_crn TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_specialization TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verifica se já existe
    IF EXISTS (SELECT 1 FROM public.nutritionists WHERE user_id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Perfil já existe'
        );
    END IF;
    
    -- Cria o perfil
    INSERT INTO public.nutritionists (
        user_id,
        email,
        full_name,
        crn,
        phone,
        specialization
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_crn,
        p_phone,
        p_specialization
    );
    
    -- Retorna sucesso
    SELECT json_build_object(
        'success', true,
        'nutritionist', json_build_object(
            'user_id', n.user_id,
            'email', n.email,
            'full_name', n.full_name
        )
    ) INTO v_result
    FROM public.nutritionists n
    WHERE n.user_id = p_user_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permite que usuários autenticados chamem esta função
GRANT EXECUTE ON FUNCTION create_nutritionist_profile TO authenticated;

-- Adiciona comentário
COMMENT ON FUNCTION create_nutritionist_profile IS 'Cria perfil de nutricionista durante signup (bypass RLS)';
