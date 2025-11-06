import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Stethoscope } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNutritionistAuth } from '@/hooks/useNutritionistAuth';

export default function NutritionistLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useNutritionistAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
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
              Hub de Nutricionistas
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o progresso dos seus clientes
            </p>
          </div>
        </div>

        {/* Card de Login */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Login Profissional</CardTitle>
            <CardDescription>
              Acesse sua conta com email e senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Botão de Login */}
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700" 
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Link para Cadastro */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link 
                to="/nutritionist/signup" 
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Cadastre-se
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

        {/* Info Box */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>💡 Dica:</strong> Esta é a área exclusiva para nutricionistas. 
              Clientes devem usar o login via WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
