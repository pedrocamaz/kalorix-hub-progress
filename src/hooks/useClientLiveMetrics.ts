import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { normalizePhone } from '@/lib/phone';

type Diet = {
  caloriesGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};

type MealToday = {
  id: number;
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export function useClientLiveMetrics(clientId: string | undefined, clientPhone: string | undefined) {
  const queryClient = useQueryClient();
  const phone = clientPhone ? normalizePhone(clientPhone) : '';
  const today = new Date().toISOString().split('T')[0];

  const {
    data: diet,
    isLoading: isDietLoading,
    isError: isDietError,
  } = useQuery({
    queryKey: ['clientDiet', phone],
    queryFn: async (): Promise<Diet | null> => {
      const { data, error } = await supabase
        .from('dietas')
        .select('calorias_diarias, proteina_gramas, carboidrato_gramas, gordura_gramas')
        .eq('usuario_telefone', phone)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        caloriesGoal: Number(data.calorias_diarias || 0),
        proteinGoal: Number(data.proteina_gramas || 0),
        carbGoal: Number(data.carboidrato_gramas || 0),
        fatGoal: Number(data.gordura_gramas || 0),
      };
    },
    enabled: !!phone,
    staleTime: 60_000,
  });

  const {
    data: mealsToday,
    isLoading: isMealsLoading,
    isError: isMealsError,
    refetch: refetchMeals,
  } = useQuery({
    queryKey: ['clientMealsToday', clientId, today],
    queryFn: async (): Promise<MealToday[]> => {
      const { data, error } = await supabase
        .from('registros_alimentares')
        .select('id, data_consumo, hora_consumo, nome_alimento, calorias, proteinas, carboidratos, gorduras, usuario_id')
        .eq('usuario_id', clientId)
        .eq('data_consumo', today)
        .order('hora_consumo', { ascending: true });

      if (error) throw error;

      return (data || []).map(m => ({
        id: Number(m.id),
        time: m.hora_consumo ? String(m.hora_consumo).substring(0, 5) : '',
        name: m.nome_alimento,
        calories: Number(m.calorias || 0),
        protein: Number(m.proteinas || 0),
        carbs: Number(m.carboidratos || 0),
        fats: Number(m.gorduras || 0),
      }));
    },
    enabled: !!clientId,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`client-meals-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registros_alimentares', filter: `usuario_id=eq.${clientId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clientMealsToday', clientId, today] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient, today]);

  const totals = useMemo(() => {
    const base = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    if (!mealsToday) return base;
    return mealsToday.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fats: acc.fats + (m.fats || 0),
      }),
      base
    );
  }, [mealsToday]);

  const remaining = useMemo(() => {
    if (!diet) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return {
      calories: Math.max(diet.caloriesGoal - totals.calories, 0),
      protein: Math.max(diet.proteinGoal - totals.protein, 0),
      carbs: Math.max(diet.carbGoal - totals.carbs, 0),
      fats: Math.max(diet.fatGoal - totals.fats, 0),
    };
  }, [diet, totals]);

  return {
    diet,
    todaysMeals: mealsToday || [],
    totals,
    remaining,
    isLoading: isDietLoading || isMealsLoading,
    isError: isDietError || isMealsError,
    refetchMeals,
  };
}