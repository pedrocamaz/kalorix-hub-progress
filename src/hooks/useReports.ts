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

// 🔥 HELPER: Cria data string sem conversão de timezone
function makeDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const useReports = (userPhone: string, year: number, month: number) => {
  const phone = normalizePhone(userPhone)

  // Chart data - Last 6 months
  const { 
    data: chartData, 
    isLoading: isChartLoading, 
    isError: isChartError 
  } = useQuery({
    queryKey: ['reportsChart', phone],
    queryFn: async (): Promise<CalorieRecord[]> => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)

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
      const baseWeight = 80
      const monthsToShow = 6 * 30
      for (let i = 0; i < monthsToShow; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        if (date > endDate) break
        
        const dateStr = date.toISOString().split('T')[0]
        
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

  // Calendar month - 🔥 USA RPC COM TIMEZONE BRT + CORREÇÃO NO FRONTEND
  const { 
    data: calendarData, 
    isLoading: isCalendarLoading, 
    isError: isCalendarError 
  } = useQuery({
    queryKey: ['reportsCalendar', phone, year, month],
    queryFn: async (): Promise<DayData[]> => {
      console.log('🔄 Fetching calendar data (BRT) for:', { phone, year, month });

      // RPC com timezone BRT
      const { data: monthlyData, error } = await supabase.rpc('get_monthly_calories_brt', {
        p_telefone: phone,
        p_year: year,
        p_month: month
      });

      if (error) {
        console.error('❌ Error calling get_monthly_calories_brt:', error);
        throw error;
      }

      console.log('✅ Monthly calories (BRT):', monthlyData);

      // Get daily calorie goal
      const { data: dietData } = await supabase
        .from('dietas')
        .select('calorias_diarias')
        .eq('usuario_telefone', phone)
        .maybeSingle();

      const dailyGoal = parseFloat(dietData?.calorias_diarias || '2700');

      // Converte resultado da RPC em objeto { date: calories }
      const caloriesByDate = (monthlyData || []).reduce((acc, row) => {
        acc[row.data_consumo] = Number(row.total_calorias || 0);
        return acc;
      }, {} as Record<string, number>);

      // 🔥 CORREÇÃO: Cria datas sem conversão de timezone
      const calendarData: DayData[] = [];
      const daysInMonth = new Date(year, month, 0).getDate(); // Último dia do mês
      
      for (let day = 1; day <= daysInMonth; day++) {
        // 🔥 USA HELPER PARA EVITAR CONVERSÃO DE TIMEZONE
        const dateStr = makeDateString(year, month, day);
        
        const consumed = caloriesByDate[dateStr] || 0;
        const balance = consumed - dailyGoal;
        
        calendarData.push({
          date: dateStr,
          calories: consumed,
          balance: Math.round(balance),
          hasData: consumed > 0
        });
      }

      console.log('📅 Calendar data generated (fixed timezone):', calendarData.slice(0, 5));

      return calendarData;
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