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
  share_code?: string | null  // Código de compartilhamento para nutricionistas
  user_type?: string | null    // Tipo de usuário (client/nutritionist)
}

export const useProfile = (userPhone: string) => {
  const queryClient = useQueryClient()

  // Fetch user profile - CORRIGIDO: usando 'users' ao invés de 'usuarios'
  const { 
    data: profile, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['userProfile', userPhone],
    queryFn: async (): Promise<UserProfile | null> => {
      console.log('Fetching profile for phone:', userPhone)
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
      toast.success('Perfil atualizado com sucesso!')
    },
    onError: (error) => {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    }
  })

  const recalculateDiet = async (profileData: Partial<UserProfile>) => {
    const currentProfile = profile
    if (!currentProfile) return

    // Get updated values
    const peso = parseFloat(profileData.peso || currentProfile.peso)
    const altura = profileData.altura || currentProfile.altura
    const idade = profileData.idade || currentProfile.idade
    const sexo = profileData.sexo || currentProfile.sexo
    const nivelAtividade = parseInt(profileData.nivel_atividade || currentProfile.nivel_atividade)
    const objetivo = parseInt(profileData.objetivo || currentProfile.objetivo)

    // Calculate BMR using Harris-Benedict equation
    let bmr: number
    if (sexo === 'M') {
      bmr = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * idade)
    } else {
      bmr = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * idade)
    }

    // Activity level multipliers
    const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9]
    const neat = bmr * (activityMultipliers[nivelAtividade - 1] - 1)
    const metaBase = bmr + neat

    // Goal adjustments
    let metaAlvo = metaBase
    if (objetivo === 1) { // Emagrecer
      metaAlvo = metaBase - 500
    } else if (objetivo === 3) { // Ganhar peso
      metaAlvo = metaBase + 300
    }

    // Macro calculations
    const proteinGrams = peso * 2.2 // 2.2g per kg
    const fatGrams = (metaAlvo * 0.25) / 9 // 25% of calories from fat
    const carbGrams = (metaAlvo - (proteinGrams * 4) - (fatGrams * 9)) / 4

    // Update diet table
    await supabase
      .from('dietas')
      .upsert({
        usuario_telefone: normalizePhone(userPhone),
        calorias_diarias: Math.round(metaAlvo).toString(),
        proteina_gramas: Math.round(proteinGrams).toString(),
        carboidrato_gramas: Math.round(carbGrams).toString(),
        gordura_gramas: Math.round(fatGrams).toString(),
        gasto_basal: Math.round(bmr),
        neat: Math.round(neat),
        meta_alvo: Math.round(metaAlvo),
        meta_base: Math.round(metaBase)
      })
  }

  return {
    profile,
    isLoading,
    isError,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending
  }
}