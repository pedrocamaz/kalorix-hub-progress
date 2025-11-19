import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/phone';

export function useLogWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoPeso: number) => {
      // 🔥 CORRIGIDO: Usar telefone diretamente
      const userPhone = localStorage.getItem('sessionPhone');
      
      if (!userPhone) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const phone = normalizePhone(userPhone);

      // 🔥 FIX: Buscar usuario_id para poder inserir com relacionamento correto
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('telefone', phone)
        .single();

      if (userError || !userData) {
        throw new Error('Usuário não encontrado');
      }

      // Inserir registro de peso usando telefone E usuario_id
      const { data: weightRecord, error: weightError } = await supabase
        .from('registros_peso')
        .insert({
          user_telefone: phone,
          usuario_id: userData.id, // 🔥 ADD: Relacionamento com users
          peso: novoPeso,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (weightError) throw weightError;

      // Atualizar peso no perfil do usuário
      const { error: profileError } = await supabase
        .from('users')
        .update({ peso: novoPeso })
        .eq('telefone', phone);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Não lançar erro, pois o registro foi salvo
      }

      return weightRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['weightHistory'] });
      toast.success('🔥 Peso registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar peso:', error);
      toast.error(error.message || 'Erro ao registrar peso. Tente novamente.');
    }
  });
}