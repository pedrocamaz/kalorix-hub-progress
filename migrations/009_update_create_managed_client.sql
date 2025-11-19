-- Migration 009: Atualizar RPC create_managed_client para suportar dieta_dinamica
-- Data: 2025-11-19
-- Descrição: Adiciona parâmetro p_dieta_dinamica e calcula meta_base considerando nivel_atividade

-- Drop existing function
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
    p_goal TEXT DEFAULT 'maintenance',
    p_nivel_atividade INTEGER DEFAULT 1,
    p_dieta_dinamica BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
    v_nutritionist_id UUID;
    v_client_id UUID;
    v_normalized_phone TEXT;
    v_result JSON;
    v_imc NUMERIC;
    v_tmb NUMERIC;
    v_neat NUMERIC;
    v_meta_base NUMERIC;
    v_bonus_atividade NUMERIC := 0;
    v_ajuste_objetivo NUMERIC := 0;
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

    -- 🔥 CALCULAR TMB (Mifflin-St Jeor)
    IF p_sexo = 'M' THEN
        v_tmb := (10 * p_peso) + (6.25 * p_altura) - (5 * p_idade) + 5;
    ELSE
        v_tmb := (10 * p_peso) + (6.25 * p_altura) - (5 * p_idade) - 161;
    END IF;
    v_tmb := ROUND(v_tmb);

    -- 🔥 NEAT fixo (gasto autônomo mínimo)
    v_neat := 350;

    -- 🔥 CALCULAR BONUS DE ATIVIDADE (apenas se estático)
    IF NOT p_dieta_dinamica THEN
        v_bonus_atividade := CASE p_nivel_atividade
            WHEN 1 THEN 0      -- Sedentário
            WHEN 2 THEN 200    -- Levemente ativo
            WHEN 3 THEN 400    -- Moderadamente ativo
            WHEN 4 THEN 600    -- Muito ativo
            WHEN 5 THEN 800    -- Extremamente ativo
            ELSE 0
        END;
    END IF;

    -- 🔥 META BASE = TMB + NEAT + bonus (se estático)
    v_meta_base := v_tmb + v_neat + v_bonus_atividade;

    -- 🔥 AJUSTE POR OBJETIVO
    v_ajuste_objetivo := CASE 
        WHEN p_goal IN ('lose', 'emagrecer') THEN -400
        WHEN p_goal IN ('gain', 'ganhar') THEN 400
        ELSE 0
    END;

    -- 🔥 META ALVO = meta_base + ajuste_objetivo
    p_calories := v_meta_base + v_ajuste_objetivo;

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
        p_nivel_atividade,
        true, -- Auto-activate subscription
        'client',
        true -- Mark as completed profile
    )
    RETURNING id INTO v_client_id;

    -- Create diet targets with calculated values
    INSERT INTO public.dietas (
        usuario_telefone,
        usuario_id,
        calorias_diarias,
        proteina_gramas,
        carboidrato_gramas,
        gordura_gramas,
        gasto_basal,
        tbm,
        neat,
        meta_base,
        meta_alvo,
        dieta_dinamica
    ) VALUES (
        v_normalized_phone,
        v_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        v_tmb,
        v_tmb,
        v_neat + v_bonus_atividade, -- NEAT "efetivo" (inclui bonus se estático)
        v_meta_base,
        p_calories,
        p_dieta_dinamica
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
            'nivel_atividade', u.nivel_atividade,
            'dieta_dinamica', d.dieta_dinamica,
            'tmb', d.gasto_basal,
            'meta_base', d.meta_base,
            'meta_alvo', d.meta_alvo
        )
    ) INTO v_result
    FROM public.users u
    LEFT JOIN public.dietas d ON d.usuario_telefone = u.telefone
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
'Creates a new client with custom diet targets. Supports dynamic (exercises add calories) or static (exercises included in base) diets.';
