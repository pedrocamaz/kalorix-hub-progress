import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { normalizePhone } from '@/lib/phone'

interface CalorieRecord {
  date: string
  calories: number
  weight: number
}

interface DayData {
  date: string
  calories: number
  balance: number
  hasData: boolean
}

export const useReports = (userPhone: string, year: number, month: number) => {
  const phone = normalizePhone(userPhone)
  // Trend (last 6 months)
  const { 
    data: chartData, 
    isLoading: isChartLoading, 
    isError: isChartError 
  } = useQuery({
    queryKey: ['reportsChart', phone, year, month],
    queryFn: async (): Promise<CalorieRecord[]> => {
      console.log('Fetching reports data for phone:', phone)
      
      // Get data for the last 6 months for trend chart
      const endDate = new Date(year, month, 0) // Last day of selected month
      const startDate = new Date(year, month - 6, 1) // 6 months before

      const { data: mealsData, error: mealsError } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, calorias')
        .eq('usuario_telefone', phone)
        .gte('data_consumo', startDate.toISOString().split('T')[0])
        .lte('data_consumo', endDate.toISOString().split('T')[0])

      if (mealsError) {
        console.error('Error fetching meals for reports:', mealsError)
        throw mealsError
      }

      // Group meals by date and sum calories
      const caloriesByDate = (mealsData || []).reduce((acc, meal) => {
        const date = meal.data_consumo
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += parseFloat(meal.calorias) || 0
        return acc
      }, {} as Record<string, number>)

      // Create chart data for the last 6 months
      const chartData: CalorieRecord[] = []
      const baseWeight = 80 // From your user data
      
      const monthsToShow = 6 * 30 // Approximate days in 6 months
      for (let i = 0; i < monthsToShow; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        if (date > endDate) break
        
        const dateStr = date.toISOString().split('T')[0]
        
        // Simulate weight progression
        const weight = baseWeight - (i * 0.01) + (Math.random() * 0.3 - 0.15)
        
        chartData.push({
          date: dateStr,
          calories: caloriesByDate[dateStr] || 0,
          weight: Number(weight.toFixed(1))
        })
      }

      return chartData
    },
    enabled: !!phone,
  })

  // Calendar month
  const { 
    data: calendarData, 
    isLoading: isCalendarLoading, 
    isError: isCalendarError 
  } = useQuery({
    queryKey: ['reportsCalendar', phone, year, month],
    queryFn: async (): Promise<DayData[]> => {
      // Get first and last day of the month
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)

      // Get daily calorie goal
      const { data: dietData } = await supabase
        .from('dietas')
        .select('calorias_diarias')
        .eq('usuario_telefone', phone)
        .single()

      const dailyGoal = parseFloat(dietData?.calorias_diarias || '2700')

      const { data: mealsData, error } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, calorias')
        .eq('usuario_telefone', phone)
        .gte('data_consumo', firstDay.toISOString().split('T')[0])
        .lte('data_consumo', lastDay.toISOString().split('T')[0])

      if (error) {
        console.error('Error fetching calendar data:', error)
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

      // Create calendar data for each day of the month
      const calendarData: DayData[] = []
      const daysInMonth = lastDay.getDate()
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day)
        const dateStr = date.toISOString().split('T')[0]
        
        const consumed = consumptionByDate[dateStr] || 0
        const balance = consumed - dailyGoal
        
        calendarData.push({
          date: dateStr,
          calories: consumed,
          balance: Math.round(balance),
          hasData: consumed > 0
        })
      }

      return calendarData
    },
    enabled: !!phone,
  })

  return {
    chartData: chartData || [],
    calendarData: calendarData || [],
    isLoading: isChartLoading || isCalendarLoading,
    isError: isChartError || isCalendarError,
  }
}