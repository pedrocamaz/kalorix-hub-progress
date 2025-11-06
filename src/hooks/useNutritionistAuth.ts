import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  signUpNutritionist, 
  signInNutritionist, 
  getUserRole,
  type NutritionistSignupData 
} from '@/lib/auth';

/**
 * Hook para gerenciar autenticação de nutricionistas
 */
export function useNutritionistAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Cadastra um novo nutricionista
   */
  const signUp = async (data: NutritionistSignupData) => {
    setLoading(true);
    try {
      await signUpNutritionist(data);
      toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
      return true;
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Mensagens de erro personalizadas
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado.');
      } else if (error.message?.includes('Invalid email')) {
        toast.error('Email inválido.');
      } else if (error.message?.includes('Password')) {
        toast.error('A senha deve ter no mínimo 6 caracteres.');
      } else {
        toast.error(error.message || 'Erro ao criar conta. Tente novamente.');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Faz login de nutricionista
   */
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInNutritionist(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/nutritionist/dashboard');
      return true;
    } catch (error: any) {
      console.error('SignIn error:', error);
      
      // Mensagens de erro personalizadas
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos.');
      } else if (error.message?.includes('não é de um nutricionista')) {
        toast.error(error.message);
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Confirme seu email antes de fazer login.');
      } else {
        toast.error(error.message || 'Erro ao fazer login. Tente novamente.');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica se o usuário atual é um nutricionista
   */
  const checkRole = async (): Promise<'client' | 'nutritionist' | null> => {
    try {
      return await getUserRole();
    } catch (error) {
      console.error('Error checking role:', error);
      return null;
    }
  };

  return {
    signUp,
    signIn,
    checkRole,
    loading,
  };
}
