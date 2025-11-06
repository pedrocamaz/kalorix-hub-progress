import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

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
}

export interface DashboardSummary {
  nutritionist_id: string;
  nutritionist_name: string;
  active_clients_count: number;
  total_clients_count: number;
  total_meals_week: number;
  avg_calories_week: number;
}

/**
 * Hook para gerenciar clientes do nutricionista
 */
export function useNutritionistClients() {
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Busca a lista de clientes do nutricionista
   */
  const fetchClients = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Busca detalhes dos clientes via view
      const { data, error } = await supabase
        .from('nutritionist_client_details')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Busca resumo do dashboard
   */
  const fetchSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nutritionist_dashboard_summary')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      setSummary(data);
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
    updateClientNotes,
    updateClientTags,
    removeClient,
    markClientAsViewed,
    refresh,
  };
}
