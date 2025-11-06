import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Phone, Stethoscope, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNutritionistAuth } from '@/hooks/useNutritionistAuth';

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
  
  const { signUp, loading } = useNutritionistAuth();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    const success = await signUp({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      crn: formData.crn || undefined,
      phone: formData.phone || undefined,
      specialization: formData.specialization || undefined,
    });

    if (success) {
      // Limpa o formulário
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        crn: '',
        phone: '',
        specialization: '',
      });
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
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-9"
                      value={formData.email}
                      onChange={handleChange('email')}
                      required
                      autoComplete="email"
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
                      required
                      minLength={6}
                      autoComplete="new-password"
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
                      placeholder="Digite a senha novamente"
                      className="pl-9"
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      required
                      minLength={6}
                      autoComplete="new-password"
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
