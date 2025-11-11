import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Phone, Stethoscope, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// URL pública para redirecionar confirmação de email
const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  import.meta.env.VITE_APP_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://kalorix-hub-progress.vercel.app');

export default function NutritionistSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    crn: '',
    phone: '',
    specialization: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<number>(0);
  const navigate = useNavigate();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting protection
    const now = Date.now();
    if (now - lastSubmit < 5000) { // 5 segundos entre submissões
      toast.error('Aguarde alguns segundos antes de tentar novamente.');
      return;
    }
    setLastSubmit(now);
    
    setLoading(true);

    try {
      // Validações
      if (formData.password !== formData.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      if (formData.password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }

      if (!formData.fullName.trim() || !formData.email.trim()) {
        toast.error('Nome completo e email são obrigatórios');
        return;
      }

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${PUBLIC_SITE_URL}/auth/callback`,
          data: {
            user_type: 'nutritionist',
            full_name: formData.fullName.trim(),
          }
        }
      });

      if (authError) {
        console.error("Erro no signup do Supabase Auth:", authError);
        
        // Mensagens de erro personalizadas
        if (authError.message?.includes('already registered')) {
          toast.error('Este email já está cadastrado.');
        } else if (authError.message?.includes('Invalid email')) {
          toast.error('Email inválido.');
        } else if (authError.message?.includes('Password')) {
          toast.error('A senha deve ter no mínimo 6 caracteres.');
        } else {
          toast.error(authError.message || 'Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      // 2. Verificar se o usuário foi criado
      if (!authData.user) {
        toast.error('Falha ao criar usuário. Tente novamente.');
        return;
      }

      console.log('Usuário criado no Auth:', authData.user.id);

      // 3. Criar registro completo (users + nutritionists)
      try {
        console.log('Criando perfil completo de nutricionista...');
        
        // Gerar telefone único para nutricionista
        const nutriTelefone = formData.phone?.trim() || `NUTR${authData.user.id.substring(0, 8)}`;
        
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('create_nutritionist_complete_profile', {
            p_user_id: authData.user.id,
            p_email: formData.email.trim(),
            p_full_name: formData.fullName.trim(),
            p_telefone: nutriTelefone,
            p_crn: formData.crn.trim() || null,
            p_phone: formData.phone.trim() || null,
            p_specialization: formData.specialization.trim() || null,
          });

        if (rpcError) {
          console.error("Erro ao criar perfil completo:", rpcError);
          throw rpcError;
        }

        const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
        
        if (!result.success) {
          throw new Error(result.error);
        }

        console.log('Perfil completo criado:', result);

        // 4. Sucesso total
        toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
        
        // 5. Limpar formulário
        setFormData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: '',
          crn: '',
          phone: '',
          specialization: '',
        });

        // 6. Redirecionar para login após delay
        setTimeout(() => {
          navigate('/nutritionist/login');
        }, 2000);

      } catch (profileError) {
        console.error("Erro inesperado ao criar perfil:", profileError);
        toast.error('Erro inesperado ao criar perfil. Contate o suporte.');
        
        // Tentar fazer logout para limpar sessão órfã
        await supabase.auth.signOut();
      }

    } catch (error: any) {
      console.error("Erro geral no signup:", error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo e Título */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg">
              <Stethoscope className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <div>
            <Logo className="justify-center mb-2" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cadastro de Nutricionista
            </h1>
            <p className="text-muted-foreground mt-2">
              Crie sua conta e comece a acompanhar seus clientes
            </p>
          </div>
        </div>

        {/* Card de Cadastro */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Dados do Profissional</CardTitle>
            <CardDescription>
              Preencha as informações abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grid de campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-9"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Profissional *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-9"
                      value={formData.email}
                      onChange={handleChange('email')}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      className="pl-9"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* CRN */}
                <div className="space-y-2">
                  <Label htmlFor="crn">CRN (Registro Profissional)</Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="crn"
                      type="text"
                      placeholder="Ex: CRN-3 12345/P"
                      className="pl-9"
                      value={formData.crn}
                      onChange={handleChange('crn')}
                    />
                  </div>
                </div>

                {/* Especialização */}
                <div className="space-y-2">
                  <Label htmlFor="specialization">Especialização</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="specialization"
                      type="text"
                      placeholder="Ex: Nutrição Esportiva"
                      className="pl-9"
                      value={formData.specialization}
                      onChange={handleChange('specialization')}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-9"
                      value={formData.password}
                      onChange={handleChange('password')}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme sua senha"
                      className="pl-9"
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Termos */}
              <p className="text-xs text-muted-foreground">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link to="/terms" className="text-green-600 hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link to="/privacy" className="text-green-600 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>

              {/* Botão de Cadastro */}
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700" 
                disabled={loading}
                size="lg"
              >
                {loading ? 'Criando conta...' : 'Criar Conta Profissional'}
              </Button>
            </form>

            {/* Link para Login */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link 
                to="/nutritionist/login" 
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Link para voltar */}
        <div className="text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
