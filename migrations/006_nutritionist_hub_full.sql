-- ============================================
-- MIGRATION 006: Full Nutritionist Control
-- ============================================
-- Adds RPC functions for nutritionists to create and manage clients
-- with complete control over diet targets and subscription status

-- ============================================
-- 1. CREATE MANAGED CLIENT
-- ============================================
-- Allows nutritionists to create new clients directly with diet targets
-- FIXED: All required params first, then optional params with defaults

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS create_managed_client CASCADE;

CREATE OR REPLACE FUNCTION create_managed_client(
    p_nutritionist_user_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_peso NUMERIC,
    p_altura INTEGER,
    p_idade INTEGER,
    p_sexo TEXT,
    p_calories INTEGER,
    p_protein NUMERIC,
    p_carbs NUMERIC,
    p_fat NUMERIC,
    p_email TEXT DEFAULT NULL,
    p_goal TEXT DEFAULT 'maintenance'
)
RETURNS JSON AS $$
DECLARE
    v_nutritionist_id UUID;
    v_client_id UUID;
    v_normalized_phone TEXT;
    v_result JSON;
    v_imc NUMERIC;
BEGIN
    -- Normalize phone number (remove all non-digits and ensure BR format)
    v_normalized_phone := regexp_replace(p_phone, '\D', '', 'g');
    
    -- Ensure Brazilian country code
    IF length(v_normalized_phone) = 11 THEN
        v_normalized_phone := '55' || v_normalized_phone;
    END IF;

    -- Get nutritionist ID
    SELECT id INTO v_nutritionist_id
    FROM public.nutritionists
    WHERE user_id = p_nutritionist_user_id;

    IF v_nutritionist_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Nutricionista não encontrado'
        );
    END IF;

    -- Validate required fields
    IF p_peso IS NULL OR p_peso <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Peso é obrigatório e deve ser maior que zero'
        );
    END IF;

    IF p_altura IS NULL OR p_altura <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Altura é obrigatória e deve ser maior que zero'
        );
    END IF;

    IF p_idade IS NULL OR p_idade <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Idade é obrigatória e deve ser maior que zero'
        );
    END IF;

    IF p_sexo IS NULL OR (p_sexo NOT IN ('M', 'F')) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Sexo deve ser M ou F'
        );
    END IF;

    -- Check if user already exists
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE telefone = v_normalized_phone
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cliente já existe com este telefone. Use a opção "Adicionar Cliente" para vincular um cliente existente.'
        );
    END IF;

    -- Calculate IMC (will be done automatically by generated column, but we validate)
    v_imc := ROUND(p_peso / POWER((p_altura::NUMERIC / 100.0), 2), 2);

    -- Create user with active subscription
    INSERT INTO public.users (
        telefone,
        nome,
        email,
        objetivo,
        peso,
        altura,
        idade,
        sexo,
        assinatura_ativa,
        user_type,
        preenchido
    ) VALUES (
        v_normalized_phone,
        p_name,
        p_email,
        p_goal,
        p_peso,
        p_altura,
        p_idade,
        p_sexo,
        true, -- Auto-activate subscription
        'client',
        true -- Mark as completed profile
    )
    RETURNING id INTO v_client_id;

    -- Create diet targets
    INSERT INTO public.dietas (
        usuario_telefone,
        usuario_id,
        calorias_diarias,
        proteina_gramas,
        carboidrato_gramas,
        gordura_gramas,
        meta_alvo
    ) VALUES (
        v_normalized_phone,
        v_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        p_calories
    );

    -- Link to nutritionist
    INSERT INTO public.nutritionist_clients (
        nutritionist_id,
        client_id,
        is_active
    ) VALUES (
        v_nutritionist_id,
        v_client_id,
        true
    );

    -- Generate share code if not exists
    UPDATE public.users
    SET share_code = generate_share_code(v_client_id)
    WHERE id = v_client_id
    AND share_code IS NULL;

    -- Return success with client data
    SELECT json_build_object(
        'success', true,
        'client', json_build_object(
            'id', u.id,
            'name', u.nome,
            'phone', u.telefone,
            'email', u.email,
            'share_code', u.share_code,
            'goal', u.objetivo,
            'peso', u.peso,
            'altura', u.altura,
            'idade', u.idade,
            'sexo', u.sexo,
            'imc', u.imc
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

GRANT EXECUTE ON FUNCTION create_managed_client TO authenticated;

COMMENT ON FUNCTION create_managed_client IS 
'Creates a new client directly by nutritionist with custom diet targets and physical data. Auto-activates subscription.';


-- ============================================
-- 2. UPDATE CLIENT DIET TARGETS
-- ============================================
-- Allows nutritionists to update diet macros for their clients

CREATE OR REPLACE FUNCTION update_client_diet_targets(
    p_nutritionist_user_id UUID,
    p_client_id UUID,
    p_calories INTEGER,
    p_protein NUMERIC,
    p_carbs NUMERIC,
    p_fat NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_nutritionist_id UUID;
    v_client_phone TEXT;
    v_result JSON;
BEGIN
    -- Get nutritionist ID
    SELECT id INTO v_nutritionist_id
    FROM public.nutritionists
    WHERE user_id = p_nutritionist_user_id;

    IF v_nutritionist_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Nutricionista não encontrado'
        );
    END IF;

    -- Verify ownership (nutritionist has access to this client)
    IF NOT EXISTS (
        SELECT 1 FROM public.nutritionist_clients
        WHERE nutritionist_id = v_nutritionist_id
        AND client_id = p_client_id
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Você não tem permissão para editar este cliente'
        );
    END IF;

    -- Get client phone
    SELECT telefone INTO v_client_phone
    FROM public.users
    WHERE id = p_client_id;

    IF v_client_phone IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cliente não encontrado'
        );
    END IF;

    -- Update or insert diet targets
    INSERT INTO public.dietas (
        usuario_telefone,
        usuario_id,
        calorias_diarias,
        proteina_gramas,
        carboidrato_gramas,
        gordura_gramas,
        meta_alvo
    ) VALUES (
        v_client_phone,
        p_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        p_calories
    )
    ON CONFLICT (usuario_telefone) 
    DO UPDATE SET
        calorias_diarias = EXCLUDED.calorias_diarias,
        proteina_gramas = EXCLUDED.proteina_gramas,
        carboidrato_gramas = EXCLUDED.carboidrato_gramas,
        gordura_gramas = EXCLUDED.gordura_gramas,
        meta_alvo = EXCLUDED.meta_alvo,
        data_criacao = NOW();

    RETURN json_build_object(
        'success', true,
        'message', 'Dieta atualizada com sucesso',
        'diet', json_build_object(
            'calories', p_calories,
            'protein', p_protein,
            'carbs', p_carbs,
            'fat', p_fat
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_client_diet_targets TO authenticated;

COMMENT ON FUNCTION update_client_diet_targets IS 
'Updates diet macro targets for a client. Only the owning nutritionist can update.';


-- ============================================
-- 3. UPDATE ADD_CLIENT_BY_SHARE_CODE
-- ============================================
-- Modify existing function to auto-activate subscription

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
    -- Get nutritionist ID
    SELECT id INTO v_nutritionist_id
    FROM public.nutritionists
    WHERE user_id = p_nutritionist_user_id;
    
    -- If not found, try to create profile automatically
    IF v_nutritionist_id IS NULL THEN
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
        
        RAISE NOTICE 'Perfil de nutricionista criado automaticamente: %', v_nutritionist_id;
    END IF;
    
    -- Get client by share_code
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
    
    -- Check if relationship already exists
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
    
    -- AUTO-ACTIVATE SUBSCRIPTION (NEW FEATURE)
    UPDATE public.users
    SET assinatura_ativa = true
    WHERE id = v_client_id;
    
    -- Link client to nutritionist
    INSERT INTO public.nutritionist_clients (nutritionist_id, client_id)
    VALUES (v_nutritionist_id, v_client_id);
    
    -- Return success with client data
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

COMMENT ON FUNCTION add_client_by_share_code IS 
'Adds client to nutritionist list by share code. Auto-creates nutritionist profile if needed. Auto-activates client subscription.';


-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration 006 completed successfully!' as status;
