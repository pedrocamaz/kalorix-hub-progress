import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { normalizePhone } from '@/lib/phone'

interface UserProfile {
  id: string
  nome: string
  email: string | null
  telefone: string
  peso: string
  altura: number
  idade: number
  sexo: string
  nivel_atividade: string
  objetivo: string
  assinatura_ativa: boolean
  share_code?: string | null
  user_type?: string | null
}

// Tipos de objetivos disponíveis
export type GoalType = 'lose_aggressive' | 'lose_moderate' | 'maintenance' | 'gain_lean' | 'gain_aggressive'

// Configuração de cada objetivo
export const GOAL_CONFIGS = {
  lose_aggressive: {
    label: 'Secar Tudo',
    description: 'Déficit de 750 kcal/dia',
    calorieAdjustment: -750,
    proteinMultiplier: 2.2,
    icon: 'Flame',
    color: 'text-red-500',
    borderColor: 'ring-red-500'
  },
  lose_moderate: {
    label: 'Emagrecer Saudável',
    description: 'Déficit de 500 kcal/dia',
    calorieAdjustment: -500,
    proteinMultiplier: 2.0,
    icon: 'Target',
    color: 'text-orange-500',
    borderColor: 'ring-orange-500'
  },
  maintenance: {
    label: 'Manter Peso',
    description: 'Sem alteração calórica',
    calorieAdjustment: 0,
    proteinMultiplier: 1.8,
    icon: 'Scale',
    color: 'text-blue-500',
    borderColor: 'ring-blue-500'
  },
  gain_lean: {
    label: 'Ganho Limpo',
    description: 'Superávit de 300 kcal/dia',
    calorieAdjustment: 300,
    proteinMultiplier: 2.4,
    icon: 'TrendingUp',
    color: 'text-green-500',
    borderColor: 'ring-green-500'
  },
  gain_aggressive: {
    label: 'Hipertrofia Total',
    description: 'Superávit de 500 kcal/dia',
    calorieAdjustment: 500,
    proteinMultiplier: 2.4,
    icon: 'Zap',
    color: 'text-purple-500',
    borderColor: 'ring-purple-500'
  }
} as const

export const useProfile = (userPhone: string) => {
  const queryClient = useQueryClient()

  // Fetch user profile
  const { 
    data: profile, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['userProfile', userPhone],
    queryFn: async (): Promise<UserProfile | null> => {
      const phone = normalizePhone(userPhone)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nome,
          email,
          telefone,
          peso,
          altura,
          idade,
          sexo,
          nivel_atividade,
          objetivo,
          assinatura_ativa,
          share_code,
          user_type
        `)
        .eq('telefone', phone)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        throw error
      }
      return data
    },
    enabled: !!userPhone,
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      const phone = normalizePhone(userPhone)
      const { error } = await supabase
        .from('users')
        .update({
          nome: profileData.nome,
          email: profileData.email,
          peso: profileData.peso,
          altura: profileData.altura,
          idade: profileData.idade,
          sexo: profileData.sexo,
          nivel_atividade: profileData.nivel_atividade,
          objetivo: profileData.objetivo
        })
        .eq('telefone', phone)

      if (error) {
        throw error
      }

      // Recalculate diet when profile changes
      if (profileData.peso || profileData.altura || profileData.idade || 
          profileData.sexo || profileData.nivel_atividade || profileData.objetivo) {
        await recalculateDiet(profileData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userPhone] })
      queryClient.invalidateQueries({ queryKey: ['dietData', userPhone] })
      toast.success('🎯 Perfil atualizado! Sua nova dieta está pronta!')
    },
    onError: (error) => {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    }
  })

  /**
   * Calcula BMR usando Mifflin-St Jeor (mais precisa que Harris-Benedict)
   */
  const calculateBMR = (peso: number, altura: number, idade: number, sexo: string): number => {
    if (sexo === 'M') {
      return (10 * peso) + (6.25 * altura) - (5 * idade) + 5
    } else {
      return (10 * peso) + (6.25 * altura) - (5 * idade) - 161
    }
  }

  /**
   * Recalcula a dieta completa baseada no perfil atualizado
   */
  const recalculateDiet = async (profileData: Partial<UserProfile>) => {
    const currentProfile = profile
    if (!currentProfile) return

    // Get updated values
    const peso = parseFloat(profileData.peso || currentProfile.peso)
    const altura = profileData.altura || currentProfile.altura
    const idade = profileData.idade || currentProfile.idade
    const sexo = profileData.sexo || currentProfile.sexo
    const nivelAtividade = parseInt(profileData.nivel_atividade || currentProfile.nivel_atividade)
    const objetivo = (profileData.objetivo || currentProfile.objetivo) as GoalType

    // 🔥 BUSCAR TIPO DE DIETA ATUAL
    const { data: dietaAtual } = await supabase
      .from('dietas')
      .select('dieta_dinamica')
      .eq('usuario_telefone', normalizePhone(userPhone))
      .maybeSingle()
    
    const dietaDinamica = dietaAtual?.dieta_dinamica ?? true // Padrão: dinâmica

    // 1. Calculate BMR using Mifflin-St Jeor
    const bmr = calculateBMR(peso, altura, idade, sexo)

    // 2. 🔥 CALCULAR META BASE BASEADO NO TIPO DE DIETA
    const neat = 350 // NEAT fixo
    let bonusAtividade = 0
    
    // Se ESTÁTICA: adiciona bonus de atividade
    if (!dietaDinamica) {
      const bonusMap = [0, 200, 400, 600, 800]
      bonusAtividade = bonusMap[nivelAtividade - 1] || 0
    }
    
    // META BASE = TMB + NEAT + bonus (se estática)
    const metaBase = bmr + neat + bonusAtividade

    // 3. Apply goal adjustment
    const goalConfig = GOAL_CONFIGS[objetivo] || GOAL_CONFIGS.maintenance
    const metaAlvo = metaBase + goalConfig.calorieAdjustment

    // 4. Macro calculations
    const proteinGrams = peso * goalConfig.proteinMultiplier
    const fatGrams = (metaAlvo * 0.25) / 9 // 25% of calories from fat
    const carbGrams = (metaAlvo - (proteinGrams * 4) - (fatGrams * 9)) / 4

    // 5. Update diet table
    await supabase
      .from('dietas')
      .upsert({
        usuario_telefone: normalizePhone(userPhone),
        calorias_diarias: Math.round(metaAlvo).toString(),
        proteina_gramas: Math.round(proteinGrams).toString(),
        carboidrato_gramas: Math.round(carbGrams).toString(),
        gordura_gramas: Math.round(fatGrams).toString(),
        gasto_basal: Math.round(bmr),
        tbm: Math.round(bmr),
        neat: Math.round(neat + bonusAtividade), // NEAT "efetivo" (inclui bonus se estático)
        meta_alvo: Math.round(metaAlvo),
        meta_base: Math.round(metaBase),
        dieta_dinamica: dietaDinamica // 🔥 Mantém o tipo atual
      })
  }

  /**
   * Simula cálculo de dieta sem salvar (para preview em tempo real)
   * 🔥 NOTA: Esta função assume dieta DINÂMICA por padrão (sem bonus de atividade)
   * Para calcular dieta estática, use a versão completa com dietaDinamica parameter
   */
  const simulateDiet = (
    peso: number,
    altura: number,
    idade: number,
    sexo: string,
    nivelAtividade: number,
    objetivo: GoalType,
    dietaDinamica: boolean = true // 🔥 NOVO PARÂMETRO (padrão: dinâmica)
  ) => {
    const bmr = calculateBMR(peso, altura, idade, sexo)
    
    // 🔥 CALCULAR META BASE BASEADO NO TIPO DE DIETA
    const neat = 350
    let bonusAtividade = 0
    
    if (!dietaDinamica) {
      const bonusMap = [0, 200, 400, 600, 800]
      bonusAtividade = bonusMap[nivelAtividade - 1] || 0
    }
    
    const metaBase = bmr + neat + bonusAtividade
    
    const goalConfig = GOAL_CONFIGS[objetivo] || GOAL_CONFIGS.maintenance
    const metaAlvo = metaBase + goalConfig.calorieAdjustment
    
    const proteinGrams = peso * goalConfig.proteinMultiplier
    const fatGrams = (metaAlvo * 0.25) / 9
    const carbGrams = (metaAlvo - (proteinGrams * 4) - (fatGrams * 9)) / 4

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(metaBase), // 🔥 META BASE (não TDEE tradicional)
      metaAlvo: Math.round(metaAlvo),
      proteina: Math.round(proteinGrams),
      carboidrato: Math.round(carbGrams),
      gordura: Math.round(fatGrams)
    }
  }

  return {
    profile,
    isLoading,
    isError,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    simulateDiet
  }
}