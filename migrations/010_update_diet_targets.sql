-- Migration 010: Atualizar RPC update_client_diet_targets para suportar dieta_dinamica
-- Data: 2025-11-19
-- Descrição: Permite nutricionista alterar modo da dieta e recalcular meta_base automaticamente

-- Drop existing function
DROP FUNCTION IF EXISTS update_client_diet_targets CASCADE;

CREATE OR REPLACE FUNCTION update_client_diet_targets(
    p_nutritionist_user_id UUID,
    p_client_id UUID,
    p_calories INTEGER,
    p_protein NUMERIC,
    p_carbs NUMERIC,
    p_fat NUMERIC,
    p_dieta_dinamica BOOLEAN DEFAULT NULL -- Se NULL, mantém valor atual
)
RETURNS JSON AS $$
DECLARE
    v_nutritionist_id UUID;
    v_client_phone TEXT;
    v_result JSON;
    v_peso NUMERIC;
    v_altura INTEGER;
    v_idade INTEGER;
    v_sexo TEXT;
    v_nivel_atividade INTEGER;
    v_objetivo TEXT;
    v_tmb NUMERIC;
    v_neat NUMERIC;
    v_meta_base NUMERIC;
    v_bonus_atividade NUMERIC := 0;
    v_ajuste_objetivo NUMERIC := 0;
    v_current_dieta_dinamica BOOLEAN;
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

    -- Get client data
    SELECT u.telefone, u.peso, u.altura, u.idade, u.sexo, u.nivel_atividade, u.objetivo,
           d.dieta_dinamica
    INTO v_client_phone, v_peso, v_altura, v_idade, v_sexo, v_nivel_atividade, v_objetivo,
         v_current_dieta_dinamica
    FROM public.users u
    LEFT JOIN public.dietas d ON d.usuario_telefone = u.telefone
    WHERE u.id = p_client_id;

    IF v_client_phone IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cliente não encontrado'
        );
    END IF;

    -- Se p_dieta_dinamica é NULL, mantém valor atual
    IF p_dieta_dinamica IS NULL THEN
        p_dieta_dinamica := COALESCE(v_current_dieta_dinamica, TRUE);
    END IF;

    -- 🔥 RECALCULAR TMB (Mifflin-St Jeor)
    IF v_sexo = 'M' THEN
        v_tmb := (10 * v_peso) + (6.25 * v_altura) - (5 * v_idade) + 5;
    ELSE
        v_tmb := (10 * v_peso) + (6.25 * v_altura) - (5 * v_idade) - 161;
    END IF;
    v_tmb := ROUND(v_tmb);

    -- 🔥 NEAT fixo
    v_neat := 350;

    -- 🔥 CALCULAR BONUS DE ATIVIDADE (apenas se estático)
    IF NOT p_dieta_dinamica THEN
        v_bonus_atividade := CASE COALESCE(v_nivel_atividade, 1)
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
        WHEN v_objetivo IN ('lose', 'emagrecer') THEN -400
        WHEN v_objetivo IN ('gain', 'ganhar') THEN 400
        ELSE 0
    END;

    -- 🔥 META ALVO = meta_base + ajuste_objetivo (ou usa p_calories se fornecido)
    IF p_calories IS NULL OR p_calories = 0 THEN
        p_calories := v_meta_base + v_ajuste_objetivo;
    END IF;

    -- Update or insert diet targets
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
        v_client_phone,
        p_client_id,
        p_calories,
        p_protein,
        p_carbs,
        p_fat,
        v_tmb,
        v_tmb,
        v_neat + v_bonus_atividade, -- NEAT "efetivo"
        v_meta_base,
        p_calories,
        p_dieta_dinamica
    )
    ON CONFLICT (usuario_telefone) 
    DO UPDATE SET
        calorias_diarias = EXCLUDED.calorias_diarias,
        proteina_gramas = EXCLUDED.proteina_gramas,
        carboidrato_gramas = EXCLUDED.carboidrato_gramas,
        gordura_gramas = EXCLUDED.gordura_gramas,
        gasto_basal = EXCLUDED.gasto_basal,
        tbm = EXCLUDED.tbm,
        neat = EXCLUDED.neat,
        meta_base = EXCLUDED.meta_base,
        meta_alvo = EXCLUDED.meta_alvo,
        dieta_dinamica = EXCLUDED.dieta_dinamica,
        data_criacao = NOW();

    RETURN json_build_object(
        'success', true,
        'message', 'Dieta atualizada com sucesso',
        'diet', json_build_object(
            'calories', p_calories,
            'protein', p_protein,
            'carbs', p_carbs,
            'fat', p_fat,
            'dieta_dinamica', p_dieta_dinamica,
            'tmb', v_tmb,
            'meta_base', v_meta_base,
            'meta_alvo', p_calories
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
'Updates client diet targets. Can switch between dynamic/static modes and automatically recalculates base values.';
