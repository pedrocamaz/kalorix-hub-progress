import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export interface Meal {
  id: number
  date: string
  time: string
  type: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export const useMealDiary = (userPhone: string) => {
  const queryClient = useQueryClient()

  // Fetch all meals for the user
  const { 
    data: meals, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['mealDiary', userPhone],
    queryFn: async (): Promise<Meal[]> => {
      console.log('=== DEBUGGING MEAL DIARY ===')
      console.log('1. Fetching meals for phone:', userPhone)
      console.log('2. Phone type:', typeof userPhone)
      console.log('3. Phone length:', userPhone.length)
      
      // Primeiro, teste uma query simples para ver se há dados
      const { data: testData, error: testError } = await supabase
        .from('registros_alimentares')
        .select('usuario_telefone')
        .limit(10)

      console.log('4. Test query - all phones in table:', testData?.map(d => d.usuario_telefone))
      console.log('5. Test error:', testError)

      // Agora teste com diferentes variações do telefone
      const phoneVariations = [
        userPhone,
        userPhone.replace(/\D/g, ''), // Remove non-digits
        '+' + userPhone,
        userPhone.replace('+', ''),
      ]

      console.log('6. Testing phone variations:', phoneVariations)

      for (const phone of phoneVariations) {
        const { data: testVariation, error: errorVariation } = await supabase
          .from('registros_alimentares')
          .select('usuario_telefone, nome_alimento')
          .eq('usuario_telefone', phone)
          .limit(5)

        console.log(`7. Results for phone "${phone}":`, testVariation)
        if (errorVariation) console.log(`7. Error for phone "${phone}":`, errorVariation)
      }

      // Query principal
      const { data, error } = await supabase
        .from('registros_alimentares')
        .select(`
          id,
          data_consumo,
          hora_consumo,
          tipo_refeicao,
          nome_alimento,
          calorias,
          proteinas,
          carboidratos,
          gorduras,
          usuario_telefone
        `)
        .eq('usuario_telefone', userPhone)
        .order('data_consumo', { ascending: false })
        .order('hora_consumo', { ascending: false })

      console.log('8. Main query result:', data)
      console.log('9. Main query error:', error)

      if (error) {
        console.error('Error fetching meal diary:', error)
        throw error
      }

      const mappedData = (data || []).map(meal => {
        console.log('10. Mapping meal:', meal)
        return {
          id: meal.id,
          date: meal.data_consumo,
          time: meal.hora_consumo ? meal.hora_consumo.substring(0, 5) : '',
          type: meal.tipo_refeicao,
          name: meal.nome_alimento,
          calories: parseFloat(meal.calorias) || 0,
          protein: parseFloat(meal.proteinas) || 0,
          carbs: parseFloat(meal.carboidratos) || 0,
          fats: parseFloat(meal.gorduras) || 0
        }
      })

      console.log('11. Final mapped data:', mappedData)
      console.log('=== END DEBUGGING ===')

      return mappedData
    },
    enabled: !!userPhone,
  })

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: number) => {
      const { error } = await supabase
        .from('registros_alimentares')
        .delete()
        .eq('id', mealId)
        .eq('usuario_telefone', userPhone)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealDiary', userPhone] })
      queryClient.invalidateQueries({ queryKey: ['todaysMeals', userPhone] })
      toast.success('Refeição removida com sucesso!')
    },
    onError: (error) => {
      console.error('Error deleting meal:', error)
      toast.error('Erro ao remover refeição')
    }
  })

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: async (updated: Partial<Meal> & { id: number }) => {
      const payload: Record<string, any> = {}
      if (updated.name !== undefined) payload.nome_alimento = updated.name
      if (updated.calories !== undefined) payload.calorias = updated.calories
      if (updated.protein !== undefined) payload.proteinas = updated.protein
      if (updated.carbs !== undefined) payload.carboidratos = updated.carbs
      if (updated.fats !== undefined) payload.gorduras = updated.fats

      const { error } = await supabase
        .from('registros_alimentares')
        .update(payload)
        .eq('id', updated.id)
        .eq('usuario_telefone', userPhone)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealDiary', userPhone] })
      queryClient.invalidateQueries({ queryKey: ['todaysMeals', userPhone] })
      toast.success('Refeição atualizada!')
    },
    onError: (error: any) => {
      console.error('Error updating meal:', error)
      toast.error('Erro ao atualizar refeição')
    },
  })

  return {
    meals: meals || [],
    isLoading,
    isError,
    deleteMeal: deleteMealMutation.mutate,
    isDeleting: deleteMealMutation.isPending,
    updateMeal: updateMealMutation.mutate,
    isUpdating: updateMealMutation.isPending,
  }
}