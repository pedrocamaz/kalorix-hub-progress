-- ============================================
-- MIGRATION 007: Fix Diet Calculations - Add BMR, TDEE, NEAT
-- ============================================
-- Corrige funções para calcular e preencher campos que o N8N precisa:
-- gasto_basal, tbm, neat, meta_base

-- Drop existing function
DROP FUNCTION IF EXISTS create_managed_client CASCADE;

-- Recreate with BMR/TDEE/NEAT calculations
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
    v_bmr NUMERIC;
    v_activity_multiplier NUMERIC := 1.55; -- Padrão: atividade moderada
    v_tdee NUMERIC;
    v_neat NUMERIC;
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

    -- Calculate IMC
    v_imc := ROUND(p_peso / POWER((p_altura::NUMERIC / 100.0), 2), 2);

    -- CALCULATE BMR (Mifflin-St Jeor Equation)
    IF p_sexo = 'M' THEN
        v_bmr := (10 * p_peso) + (6.25 * p_altura) - (5 * p_idade) + 5;
    ELSE
        v_bmr := (10 * p_peso) + (6.25 * p_altura) - (5 * p_idade) - 161;
    END IF;

    -- CALCULATE TDEE (Total Daily Energy Expenditure)
    v_tdee := v_bmr * v_activity_multiplier;

    -- CALCULATE NEAT (Non-Exercise Activity Thermogenesis)
    v_neat := v_tdee - v_bmr;

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
        nivel_atividade,
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
        '3', -- Nível 3 = atividade moderada (padrão)
        true, -- Auto-activate subscription
        'client',
        true -- Mark as completed profile
    )
    RETURNING id INTO v_client_id;

    -- CREATE DIET TARGETS WITH ALL REQUIRED FIELDS (including BMR, TDEE, NEAT)
    INSERT INTO public.dietas (
        usuario_telefone,
        usuario_id,
        calorias_diarias,
        proteina_gramas,
        carboidrato_gramas,
        gordura_gramas,
        meta_alvo,
        gasto_basal,
        tbm,
        neat,
        meta_base
    ) VALUES (
        v_normalized_phone,
        v_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        p_calories,
        ROUND(v_bmr),
        ROUND(v_bmr),
        ROUND(v_neat),
        ROUND(v_tdee)
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
            'imc', u.imc,
            'bmr', ROUND(v_bmr),
            'tdee', ROUND(v_tdee),
            'neat', ROUND(v_neat)
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
'Creates a new client directly by nutritionist with custom diet targets and physical data. Auto-activates subscription and calculates BMR, TDEE, NEAT automatically.';


-- ============================================
-- UPDATE CLIENT DIET TARGETS - With calculations
-- ============================================

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
    v_client_peso NUMERIC;
    v_client_altura INTEGER;
    v_client_idade INTEGER;
    v_client_sexo TEXT;
    v_client_nivel_atividade TEXT;
    v_result JSON;
    v_bmr NUMERIC;
    v_activity_multiplier NUMERIC;
    v_tdee NUMERIC;
    v_neat NUMERIC;
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

    -- Verify ownership
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

    -- Get client data for calculations
    SELECT 
        telefone, 
        peso, 
        altura, 
        idade, 
        sexo,
        COALESCE(nivel_atividade, '3')
    INTO 
        v_client_phone,
        v_client_peso,
        v_client_altura,
        v_client_idade,
        v_client_sexo,
        v_client_nivel_atividade
    FROM public.users
    WHERE id = p_client_id;

    IF v_client_phone IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cliente não encontrado'
        );
    END IF;

    -- CALCULATE BMR if we have the data
    IF v_client_peso IS NOT NULL AND v_client_altura IS NOT NULL 
       AND v_client_idade IS NOT NULL AND v_client_sexo IS NOT NULL THEN
        
        IF v_client_sexo = 'M' THEN
            v_bmr := (10 * v_client_peso) + (6.25 * v_client_altura) - (5 * v_client_idade) + 5;
        ELSE
            v_bmr := (10 * v_client_peso) + (6.25 * v_client_altura) - (5 * v_client_idade) - 161;
        END IF;

        -- Activity multipliers
        v_activity_multiplier := CASE v_client_nivel_atividade
            WHEN '1' THEN 1.2
            WHEN '2' THEN 1.375
            WHEN '3' THEN 1.55
            WHEN '4' THEN 1.725
            WHEN '5' THEN 1.9
            ELSE 1.55
        END;

        v_tdee := v_bmr * v_activity_multiplier;
        v_neat := v_tdee - v_bmr;
    ELSE
        v_bmr := NULL;
        v_tdee := NULL;
        v_neat := NULL;
    END IF;

    -- Update or insert diet targets WITH calculated fields
    INSERT INTO public.dietas (
        usuario_telefone,
        usuario_id,
        calorias_diarias,
        proteina_gramas,
        carboidrato_gramas,
        gordura_gramas,
        meta_alvo,
        gasto_basal,
        tbm,
        neat,
        meta_base
    ) VALUES (
        v_client_phone,
        p_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        p_calories,
        ROUND(v_bmr),
        ROUND(v_bmr),
        ROUND(v_neat),
        ROUND(v_tdee)
    )
    ON CONFLICT (usuario_telefone) 
    DO UPDATE SET
        calorias_diarias = EXCLUDED.calorias_diarias,
        proteina_gramas = EXCLUDED.proteina_gramas,
        carboidrato_gramas = EXCLUDED.carboidrato_gramas,
        gordura_gramas = EXCLUDED.gordura_gramas,
        meta_alvo = EXCLUDED.meta_alvo,
        gasto_basal = EXCLUDED.gasto_basal,
        tbm = EXCLUDED.tbm,
        neat = EXCLUDED.neat,
        meta_base = EXCLUDED.meta_base,
        data_criacao = NOW();

    RETURN json_build_object(
        'success', true,
        'message', 'Dieta atualizada com sucesso',
        'diet', json_build_object(
            'calories', p_calories,
            'protein', p_protein,
            'carbs', p_carbs,
            'fat', p_fat,
            'bmr', ROUND(v_bmr),
            'tdee', ROUND(v_tdee),
            'neat', ROUND(v_neat)
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
'Updates diet macro targets for a client with automatic BMR/TDEE/NEAT calculation. Only the owning nutritionist can update.';


SELECT 'Migration 007 completed successfully! BMR, TDEE, NEAT calculations added.' as status;
