import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// Adicione (se ainda não tiver) os tipos auxiliares
type SupabaseUserRow = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  share_code: string | null;
  peso: number | null;
  altura: number | null;
  imc: number | null;
  idade: number | null;
  sexo: string | null;
  objetivo: string | null;
};

type RelationshipRow = {
  id: string;
  client_id: string;
  added_at: string;
  notes: string | null;
  tags: string[] | null;
  is_active: boolean;
  last_viewed_at: string | null;
  users: SupabaseUserRow | SupabaseUserRow[];
};

interface SupabaseUser {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  share_code: string;
  peso: number;
  altura: number;
  imc: number;
  idade: number;
  sexo: string;
  objetivo: string;
}

interface NutritionistClientRelationship {
  id: string;
  client_id: string;
  added_at: string;
  notes: string;
  tags: string[];
  is_active: boolean;
  last_viewed_at: string;
  users: SupabaseUser | SupabaseUser[]; // Could be array or single object
}

export interface ClientDetail {
  client_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  share_code: string;
  current_weight: number;
  height: number;
  imc: number;
  age: number;
  gender: string;
  goal: string;
  added_at: string;
  notes: string;
  tags: string[];
  is_active: boolean;
  last_viewed_at: string;
  last_meal_date: string;
  meals_last_7_days: number;
  avg_calories_last_7_days: number;
  // NOVOS CAMPOS
  days_with_meals_7d: number;
  adherence_percent_7d: number;
}

export interface DashboardSummary {
  nutritionist_id: string;
  nutritionist_name: string;
  active_clients_count: number;
  total_clients_count: number;
  total_meals_week: number;
  avg_calories_week: number;
}

// Add new types for client creation and diet update
export interface CreateClientData {
  name: string;
  phone: string;
  email?: string;
  peso: number;
  altura: number;
  idade: number;
  sexo: 'M' | 'F';
  goal?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nivel_atividade?: number;
  dieta_dinamica?: boolean;
}

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dieta_dinamica?: boolean;
}

/**
 * Hook para gerenciar clientes do nutricionista - CORRIGIDO para isolamento
 */
export function useNutritionistClients() {
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Busca a lista de clientes APENAS do nutricionista logado
   */
  const fetchClients = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: nutritionistData, error: nutritionistError } = await supabase
        .from('nutritionists')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (nutritionistError || !nutritionistData) {
        console.error('Nutricionista não encontrado:', nutritionistError);
        setClients([]);
        return;
      }

      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('nutritionist_clients')
        .select(`
          id,
          client_id,
          added_at,
          notes,
          tags,
          is_active,
          last_viewed_at,
          users!inner (
            id,
            nome,
            telefone,
            email,
            share_code,
            peso,
            altura,
            imc,
            idade,
            sexo,
            objetivo
          )
        `)
        .eq('nutritionist_id', nutritionistData.id)
        .eq('is_active', true);

      if (relationshipsError) throw relationshipsError;

      const clientDetails = await Promise.all(
        relationshipsData.map(async (relationship) => {
          const client = Array.isArray(relationship.users) ? relationship.users[0] : relationship.users;
          if (!client) return null;

          const { data: mealsData } = await supabase
            .from('registros_alimentares')
            .select('calorias, data_consumo')
            .eq('usuario_id', client.id)
            .gte('data_consumo', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('data_consumo', { ascending: false });

          const { data: lastMeal } = await supabase
            .from('registros_alimentares')
            .select('data_consumo')
            .eq('usuario_id', client.id)
            .order('data_consumo', { ascending: false })
            .limit(1)
            .maybeSingle();

          const startDate = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
          const { data: mealsWeek } = await supabase
            .from('registros_alimentares')
            .select('data_consumo, calorias')
            .eq('usuario_id', relationship.client_id)
            .gte('data_consumo', startDate);

          const totalMeals = (mealsWeek || []).length;
          const uniqueDays7d = new Set((mealsWeek || []).map(m => m.data_consumo)).size;
          const adherencePercent7d = Math.round((Math.min(uniqueDays7d, 7) / 7) * 100);
          const avgCalories = totalMeals
            ? (mealsWeek || []).reduce((s, m) => s + Number(m.calorias || 0), 0) / totalMeals
            : 0;

          return {
            client_id: client.id,
            client_name: client.nome || 'Nome não informado',
            client_phone: client.telefone || '',
            client_email: client.email || '',
            share_code: client.share_code || '',
            current_weight: client.peso || 0,
            height: client.altura || 0,
            imc: client.imc || 0,
            age: client.idade || 0,
            gender: client.sexo || '',
            goal: client.objetivo || '',
            added_at: relationship.added_at,
            notes: relationship.notes || '',
            tags: relationship.tags || [],
            is_active: relationship.is_active,
            last_viewed_at: relationship.last_viewed_at || '',
            last_meal_date: lastMeal?.data_consumo || '',
            meals_last_7_days: totalMeals,
            avg_calories_last_7_days: avgCalories,
            // novos retornos usados no dashboard
            days_with_meals_7d: uniqueDays7d,
            adherence_percent_7d: adherencePercent7d,
          };
        })
      );

      setClients((clientDetails || []).filter(Boolean) as any[]);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar lista de clientes');
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Busca resumo do dashboard APENAS do nutricionista logado
   */
  const fetchSummary = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // 1. Busca dados do nutricionista
      const { data: nutritionistData } = await supabase
        .from('nutritionists')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (!nutritionistData) return;

      // 2. Busca clientes ativos deste nutricionista
      const { data: activeClients } = await supabase
        .from('nutritionist_clients')
        .select('client_id, users!inner(id)')
        .eq('nutritionist_id', nutritionistData.id)
        .eq('is_active', true);

      const clientIds = activeClients?.map(rel => rel.client_id) || [];

      if (clientIds.length === 0) {
        setSummary({
          nutritionist_id: nutritionistData.id,
          nutritionist_name: nutritionistData.full_name,
          active_clients_count: 0,
          total_clients_count: 0,
          total_meals_week: 0,
          avg_calories_week: 0,
        });
        return;
      }

      // 3. Busca métricas dos últimos 7 dias APENAS dos clientes deste nutricionista
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: mealsData } = await supabase
        .from('registros_alimentares')
        .select('calorias')
        .in('usuario_id', clientIds)
        .gte('data_consumo', weekAgo);

      const totalMealsWeek = mealsData?.length || 0;
      const totalCaloriesWeek = mealsData?.reduce((sum, meal) => sum + (meal.calorias || 0), 0) || 0;
      const avgCaloriesWeek = totalMealsWeek > 0 ? totalCaloriesWeek / totalMealsWeek : 0;

      setSummary({
        nutritionist_id: nutritionistData.id,
        nutritionist_name: nutritionistData.full_name,
        active_clients_count: clientIds.length,
        total_clients_count: clientIds.length,
        total_meals_week: totalMealsWeek,
        avg_calories_week: Math.round(avgCaloriesWeek),
      });

    } catch (error: any) {
      console.error('Error fetching summary:', error);
    }
  }, []);

  /**
   * Adiciona um cliente através do share code
   */
  const addClientByCode = async (shareCode: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Chama a função RPC do Supabase
      const { data, error } = await supabase
        .rpc('add_client_by_share_code', {
          p_nutritionist_user_id: user.id,
          p_share_code: shareCode.trim().toUpperCase()
        });

      if (error) throw error;

      // Verifica o retorno
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao adicionar cliente');
        return false;
      }

      toast.success(`Cliente ${result.client.name} adicionado com sucesso!`);
      
      // Recarrega a lista
      await fetchClients();
      await fetchSummary();
      
      return true;
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error(error.message || 'Erro ao adicionar cliente');
      return false;
    }
  };

  /**
   * Cria um novo cliente gerenciado pelo nutricionista
   * UPDATED: Now includes peso, altura, idade, sexo
   */
  const createClient = async (data: CreateClientData): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Call RPC function to create client with physical data
      const { data: rpcData, error } = await supabase.rpc('create_managed_client', {
        p_nutritionist_user_id: user.id,
        p_name: data.name,
        p_phone: data.phone,
        p_email: data.email || null,
        p_peso: data.peso,
        p_altura: data.altura,
        p_idade: data.idade,
        p_sexo: data.sexo,
        p_goal: data.goal || 'maintenance',
        p_calories: data.calories,
        p_protein: data.protein,
        p_carbs: data.carbs,
        p_fat: data.fat,
      });

      if (error) throw error;

      // Parse result
      const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao criar cliente');
        return false;
      }

      toast.success(`Cliente ${result.client.name} criado com sucesso! 🎉`, {
        description: `IMC: ${result.client.imc} | Peso: ${result.client.peso}kg`,
      });
      
      // Reload clients list
      await fetchClients();
      await fetchSummary();
      
      return true;
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Erro ao criar cliente');
      return false;
    }
  };

  /**
   * Atualiza as metas de dieta de um cliente
   */
  const updateDiet = async (clientId: string, macros: MacroData): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Call RPC function to update diet
      const { data: rpcData, error } = await supabase.rpc('update_client_diet_targets', {
        p_nutritionist_user_id: user.id,
        p_client_id: clientId,
        p_calories: macros.calories,
        p_protein: macros.protein,
        p_carbs: macros.carbs,
        p_fat: macros.fat,
        p_dieta_dinamica: macros.dieta_dinamica,
      });

      if (error) throw error;

      // Parse result
      const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao atualizar dieta');
        return false;
      }

      toast.success('Dieta atualizada com sucesso! ✨');
      
      // Reload clients list to reflect changes
      await fetchClients();
      
      return true;
    } catch (error: any) {
      console.error('Error updating diet:', error);
      toast.error(error.message || 'Erro ao atualizar dieta');
      return false;
    }
  };

  /**
   * Atualiza notas de um cliente
   */
  const updateClientNotes = async (clientId: string, notes: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Busca o nutritionist_id
      const { data: nutritionist } = await supabase
        .from('nutritionists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!nutritionist) {
        throw new Error('Nutricionista não encontrado');
      }

      const { error } = await supabase
        .from('nutritionist_clients')
        .update({ notes })
        .eq('nutritionist_id', nutritionist.id)
        .eq('client_id', clientId);

      if (error) throw error;

      toast.success('Notas atualizadas!');
      await fetchClients();
      
      return true;
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast.error('Erro ao atualizar notas');
      return false;
    }
  };

  /**
   * Atualiza tags de um cliente
   */
  const updateClientTags = async (clientId: string, tags: string[]): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Busca o nutritionist_id
      const { data: nutritionist } = await supabase
        .from('nutritionists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!nutritionist) {
        throw new Error('Nutricionista não encontrado');
      }

      const { error } = await supabase
        .from('nutritionist_clients')
        .update({ tags })
        .eq('nutritionist_id', nutritionist.id)
        .eq('client_id', clientId);

      if (error) throw error;

      toast.success('Tags atualizadas!');
      await fetchClients();
      
      return true;
    } catch (error: any) {
      console.error('Error updating tags:', error);
      toast.error('Erro ao atualizar tags');
      return false;
    }
  };

  /**
   * Remove um cliente (desativa o relacionamento)
   */
  const removeClient = async (clientId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Busca o nutritionist_id
      const { data: nutritionist } = await supabase
        .from('nutritionists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!nutritionist) {
        throw new Error('Nutricionista não encontrado');
      }

      const { error } = await supabase
        .from('nutritionist_clients')
        .update({ is_active: false })
        .eq('nutritionist_id', nutritionist.id)
        .eq('client_id', clientId);

      if (error) throw error;

      toast.success('Cliente removido da lista');
      await fetchClients();
      await fetchSummary();
      
      return true;
    } catch (error: any) {
      console.error('Error removing client:', error);
      toast.error('Erro ao remover cliente');
      return false;
    }
  };

  /**
   * Atualiza last_viewed_at quando acessar detalhes do cliente
   */
  const markClientAsViewed = async (clientId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: nutritionist } = await supabase
        .from('nutritionists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!nutritionist) return;

      await supabase
        .from('nutritionist_clients')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('nutritionist_id', nutritionist.id)
        .eq('client_id', clientId);
    } catch (error) {
      console.error('Error marking client as viewed:', error);
    }
  };

  /**
   * Força atualização dos dados
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchClients(), fetchSummary()]);
  }, [fetchClients, fetchSummary]);

  // Carrega dados iniciais
  useEffect(() => {
    fetchClients();
    fetchSummary();
  }, [fetchClients, fetchSummary]);

  return {
    clients,
    summary,
    loading,
    refreshing,
    addClientByCode,
    createClient, // UPDATED
    updateDiet,
    updateClientNotes,
    updateClientTags,
    removeClient,
    markClientAsViewed,
    refresh,
  };
}
