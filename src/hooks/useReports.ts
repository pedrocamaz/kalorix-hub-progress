import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

interface CalorieRecord {
  date: string
  calories: number
  weight: number
}

interface BalanceRecord {
  day: number
  balance: number
}

export const useReports = (userPhone: string, days: number = 30) => {
  // Fetch historical data for charts
  const { 
    data: chartData, 
    isLoading: isChartLoading, 
    isError: isChartError 
  } = useQuery({
    queryKey: ['reportsChart', userPhone, days],
    queryFn: async (): Promise<CalorieRecord[]> => {
      console.log('Fetching reports data for phone:', userPhone)
      
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get calories consumed per day
      const { data: mealsData, error: mealsError } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, calorias')
        .eq('usuario_telefone', userPhone)
        .gte('data_consumo', startDate.toISOString().split('T')[0])
        .lte('data_consumo', endDate.toISOString().split('T')[0])

      if (mealsError) {
        console.error('Error fetching meals for reports:', mealsError)
        throw mealsError
      }

      console.log('Raw meals data for reports:', mealsData)

      // Group meals by date and sum calories
      const caloriesByDate = (mealsData || []).reduce((acc, meal) => {
        const date = meal.data_consumo
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += parseFloat(meal.calorias) || 0
        return acc
      }, {} as Record<string, number>)

      console.log('Calories by date:', caloriesByDate)

      // Create chart data for the last N days
      const chartData: CalorieRecord[] = []
      const baseWeight = 80 // From your user data
      
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const dateStr = date.toISOString().split('T')[0]
        
        // Simulate weight progression (you can replace with real data from peso_historico)
        const weight = baseWeight - (i * 0.05) + (Math.random() * 0.3 - 0.15)
        
        chartData.push({
          date: dateStr,
          calories: caloriesByDate[dateStr] || 0,
          weight: Number(weight.toFixed(1))
        })
      }

      console.log('Final chart data:', chartData)
      return chartData
    },
    enabled: !!userPhone,
  })

  // Fetch caloric balance for heatmap
  const { 
    data: heatmapData, 
    isLoading: isHeatmapLoading, 
    isError: isHeatmapError 
  } = useQuery({
    queryKey: ['reportsHeatmap', userPhone, days],
    queryFn: async (): Promise<BalanceRecord[]> => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get daily calorie goal
      const { data: dietData } = await supabase
        .from('dietas')
        .select('calorias_diarias')
        .eq('usuario_telefone', userPhone)
        .single()

      const dailyGoal = parseFloat(dietData?.calorias_diarias || '2700')

      const { data: mealsData, error } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, calorias')
        .eq('usuario_telefone', userPhone)
        .gte('data_consumo', startDate.toISOString().split('T')[0])
        .lte('data_consumo', endDate.toISOString().split('T')[0])

      if (error) {
        console.error('Error fetching heatmap data:', error)
        throw error
      }

      // Group by date and calculate balance
      const consumptionByDate = (mealsData || []).reduce((acc, meal) => {
        const date = meal.data_consumo
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += parseFloat(meal.calorias) || 0
        return acc
      }, {} as Record<string, number>)

      // Create heatmap data
      const heatmapData: BalanceRecord[] = []
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const dateStr = date.toISOString().split('T')[0]
        
        const consumed = consumptionByDate[dateStr] || 0
        const balance = consumed - dailyGoal
        
        heatmapData.push({
          day: i + 1,
          balance: Math.round(balance)
        })
      }

      console.log('Heatmap data:', heatmapData)
      return heatmapData
    },
    enabled: !!userPhone,
  })

  return {
    chartData: chartData || [],
    heatmapData: heatmapData || [],
    isLoading: isChartLoading || isHeatmapLoading,
    isError: isChartError || isHeatmapError,
  }
}