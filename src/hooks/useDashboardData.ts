import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { normalizePhone } from '@/lib/phone'

interface DietData {
  calorias_diarias: string
  proteina_gramas: string
  carboidrato_gramas: string
  gordura_gramas: string
  gasto_basal: number
  neat: number
  saldo_hoje: string
  meta_alvo: number
}

interface MealRecord {
  nome_alimento: string
  calorias: string
  proteinas: string
  carboidratos: string
  gorduras: string
  hora_consumo: string
  tipo_refeicao: string
  data_consumo: string
}

interface ConsumedTotals {
  calorias: number
  proteinas: number
  carboidratos: number
  gorduras: number
}

export const useDashboardData = (userPhone: string) => {
  const phone = normalizePhone(userPhone)
  // Fetch diet goals
  const { 
    data: dietData, 
    isLoading: isDietLoading, 
    isError: isDietError 
  } = useQuery({
    queryKey: ['dietData', phone],
    queryFn: async (): Promise<DietData | null> => {
      const { data, error } = await supabase
        .from('dietas')
        .select('calorias_diarias, proteina_gramas, carboidrato_gramas, gordura_gramas, gasto_basal, neat, saldo_hoje, meta_alvo')
        .eq('usuario_telefone', phone)
        .maybeSingle()
      if (error) {
        console.error('Error fetching diet data:', error)
        throw error
      }
      return data
    },
    enabled: !!phone,
  })

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Fetch today's meals
  const { 
    data: todaysMeals, 
    isLoading: isMealsLoading, 
    isError: isMealsError 
  } = useQuery({
    queryKey: ['todaysMeals', phone, today],
    queryFn: async (): Promise<MealRecord[]> => {
      const { data, error } = await supabase
        .from('registros_alimentares')
        .select('nome_alimento, calorias, proteinas, carboidratos, gorduras, hora_consumo, tipo_refeicao, data_consumo')
        .eq('usuario_telefone', phone)
        .eq('data_consumo', today)
        .order('hora_consumo', { ascending: true })
      if (error) {
        console.error('Error fetching meals data:', error)
        throw error
      }
      return data || []
    },
    enabled: !!phone,
  })

  // Calculate consumed totals
  const consumedTotals: ConsumedTotals = {
    calorias: 0,
    proteinas: 0,
    carboidratos: 0,
    gorduras: 0
  }

  if (todaysMeals && todaysMeals.length > 0) {
    todaysMeals.forEach(meal => {
      consumedTotals.calorias += parseFloat(meal.calorias) || 0
      consumedTotals.proteinas += parseFloat(meal.proteinas) || 0
      consumedTotals.carboidratos += parseFloat(meal.carboidratos) || 0
      consumedTotals.gorduras += parseFloat(meal.gorduras) || 0
    })
  }

  return {
    dietData,
    todaysMeals: todaysMeals || [],
    consumedTotals,
    isLoading: isDietLoading || isMealsLoading,
    isError: isDietError || isMealsError,
  }
}