import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { normalizePhone } from '@/lib/phone';

/**
 * Interface que corresponde ao retorno da RPC get_dashboard_data_today_brt
 */
interface DashboardData {
  // Dados das refeições de hoje
  refeicoes_hoje: Array<{
    id: number;
    nome_alimento: string;
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    hora_consumo: string;
    tipo_refeicao: string;
  }>;

  // Metas diárias
  meta_calorias: number;
  meta_proteinas: number;
  meta_carboidratos: number;
  meta_gorduras: number;
  
  // Totais consumidos hoje
  calorias_consumidas: number;
  proteinas_consumidas: number;
  carboidratos_consumidos: number;
  gorduras_consumidas: number;
  
  // Dados da dieta
  gasto_basal: number;  // ✅ Já era number (BIGINT = number no JS)
  neat: number;         // ✅ Já era number
  meta_alvo: number;    // ✅ Já era number
  
  // Calorias queimadas em exercícios hoje
  calorias_exercicios: number;
}

/**
 * Hook personalizado para buscar dados do dashboard usando a RPC do Supabase
 * que corrige o problema de fuso horário (forçando America/Sao_Paulo)
 */
export const useDashboardData = () => {
  // 🔥 FIX: Clientes usam telefone, não auth.uid()
  const userPhone = localStorage.getItem('sessionPhone') || '';
  const normalizedPhone = normalizePhone(userPhone);

  /**
   * Query que chama a RPC get_dashboard_data_today_brt
   */
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboardData', normalizedPhone],
    queryFn: async (): Promise<DashboardData | null> => {
      console.log('🔄 Fetching dashboard data via RPC (BRT timezone) for phone:', normalizedPhone);
      
      // 🔥 NOVO: Passa telefone como parâmetro
      const { data, error } = await supabase.rpc('get_dashboard_data_today_brt', {
        p_telefone: normalizedPhone
      });

      if (error) {
        console.error('❌ Error calling RPC get_dashboard_data_today_brt:', error);
        throw error;
      }

      // A RPC retorna um array. Pegamos o primeiro item ou null
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      console.log('✅ Dashboard data received:', result);
      
      return result;
    },
    enabled: !!normalizedPhone, // 🔥 FIX: Habilita apenas se tiver telefone
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Calcula valores derivados
  const caloriesConsumed = dashboardData?.calorias_consumidas || 0;
  const caloriesGoal = dashboardData?.meta_calorias || 0;
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesConsumed);
  const progressPercent = caloriesGoal > 0 ? (caloriesConsumed / caloriesGoal) * 100 : 0;

  // Calorias ajustadas (meta + exercícios)
  const exerciseCalories = dashboardData?.calorias_exercicios || 0;
  const adjustedCaloriesGoal = caloriesGoal + exerciseCalories;
  const adjustedRemaining = Math.max(0, adjustedCaloriesGoal - caloriesConsumed);

  // Totais de macros consumidos
  const consumedTotals = {
    calorias: caloriesConsumed,
    proteinas: dashboardData?.proteinas_consumidas || 0,
    carboidratos: dashboardData?.carboidratos_consumidos || 0,
    gorduras: dashboardData?.gorduras_consumidas || 0,
  };

  // Refeições de hoje
  const todaysMeals = dashboardData?.refeicoes_hoje || [];

  return {
    // Dados brutos
    dashboardData,
    
    // Status da query
    isLoading,
    isError,
    error,
    
    // Valores calculados
    caloriesConsumed,
    caloriesGoal,
    caloriesRemaining,
    progressPercent,
    
    // Calorias ajustadas (com exercícios)
    exerciseCalories,
    adjustedCaloriesGoal,
    adjustedRemaining,
    
    // Totais de macros
    consumedTotals,
    
    // Refeições de hoje
    todaysMeals,
    
    // Dados da dieta
    dietData: dashboardData ? {
      calorias_diarias: String(dashboardData.meta_calorias),
      proteina_gramas: String(dashboardData.meta_proteinas),
      carboidrato_gramas: String(dashboardData.meta_carboidratos),
      gordura_gramas: String(dashboardData.meta_gorduras),
      gasto_basal: dashboardData.gasto_basal,
      neat: dashboardData.neat,
      meta_alvo: dashboardData.meta_alvo,
      saldo_hoje: String(adjustedRemaining),
    } : null,
    
    // Função para forçar atualização
    refetch,
  };
};