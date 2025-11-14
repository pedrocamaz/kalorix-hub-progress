import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { normalizePhone } from '@/lib/phone';

interface WeightRecord {
  id: string;
  user_telefone: string; // 🔥 Alterado de user_id
  peso: number;
  created_at: string;
}

export function useWeightHistory() {
  return useQuery({
    queryKey: ['weightHistory'],
    queryFn: async (): Promise<WeightRecord[]> => {
      // 🔥 CORRIGIDO: Usar telefone diretamente
      const userPhone = localStorage.getItem('sessionPhone');
      
      if (!userPhone) {
        throw new Error('Sessão inválida');
      }

      const phone = normalizePhone(userPhone);

      // Busca histórico de peso usando telefone
      const { data, error } = await supabase
        .from('registros_peso')
        .select('*')
        .eq('user_telefone', phone) // 🔥 Agora usa telefone
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    // Desabilita a query se não houver sessão
    enabled: !!localStorage.getItem('sessionPhone'),
    staleTime: 30_000,
  });
}