import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, User, Loader2, Flame, Target, Scale, TrendingUp, Zap, Activity } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useProfile, GOAL_CONFIGS, type GoalType } from "@/hooks/useProfile";
import { toast } from "sonner";
import { supabase, supabaseUrl } from "@/lib/supabaseClient";

const Profile = () => {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  
  const { profile, isLoading, isError, updateProfile, isUpdating, simulateDiet } = useProfile(userPhone);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    peso: "",
    altura: "",
    idade: "",
    sexo: "M",
    nivel_atividade: "3",
    objetivo: "maintenance" as GoalType,
  });

  const [portalLoading, setPortalLoading] = useState(false);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || "",
        email: profile.email || "",
        telefone: profile.telefone,
        peso: profile.peso,
        altura: profile.altura.toString(),
        idade: profile.idade.toString(),
        sexo: profile.sexo,
        nivel_atividade: profile.nivel_atividade,
        objetivo: profile.objetivo as GoalType,
      });
    }
  }, [profile]);

  // Simulação de dieta em tempo real
  const dietPreview = useMemo(() => {
    const peso = parseFloat(formData.peso) || 0;
    const altura = parseInt(formData.altura) || 0;
    const idade = parseInt(formData.idade) || 0;

    if (peso > 0 && altura > 0 && idade > 0) {
      return simulateDiet(
        peso,
        altura,
        idade,
        formData.sexo,
        parseInt(formData.nivel_atividade),
        formData.objetivo
      );
    }
    return null;
  }, [formData, simulateDiet]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erro ao carregar perfil</p>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProfile({
      nome: formData.nome,
      email: formData.email,
      peso: formData.peso,
      altura: parseInt(formData.altura),
      idade: parseInt(formData.idade),
      sexo: formData.sexo,
      nivel_atividade: formData.nivel_atividade,
      objetivo: formData.objetivo,
    });
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const userPhone = localStorage.getItem('sessionPhone') || '';
      if (!userPhone) {
        toast.error("Sessão inválida. Faça login novamente.");
        return;
      }
      const returnUrl = window.location.origin + "/dashboard/profile";

      const { data, error } = await supabase.functions.invoke("billing-portal", {
        body: { phone: userPhone, return_url: returnUrl },
      });

      if (error) {
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/billing-portal`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ phone: userPhone, return_url: returnUrl }),
          });
          const text = await r.text();
          console.error("Fetch direct response:", { status: r.status, text });
          if (!r.ok) {
            throw new Error(`Erro HTTP ${r.status}: ${text}`);
          }
          const parsed = JSON.parse(text);
          if (parsed.url) {
            window.location.href = parsed.url;
            return;
          }
        } catch (fetchErr) {
          console.error("Fetch direct error:", fetchErr);
        }
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Portal não retornou URL válida");
      }
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast.error(error.message || "Erro ao abrir portal de assinatura");
    } finally {
      setPortalLoading(false);
    }
  };

  const getGoalIcon = (goal: GoalType) => {
    const icons = {
      lose_aggressive: Flame,
      lose_moderate: Target,
      maintenance: Scale,
      gain_lean: TrendingUp,
      gain_aggressive: Zap
    };
    const Icon = icons[goal] || Target;
    return <Icon className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configuração do Perfil</h1>
        <p className="text-muted-foreground">Personalize suas metas e dados</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Dados Pessoais
          </CardTitle>
          <CardDescription>Mantenha suas informações atualizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idade">Idade</Label>
                <Input
                  id="idade"
                  type="number"
                  value={formData.idade}
                  onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso">Peso Atual (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={formData.peso}
                  onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input
                  id="altura"
                  type="number"
                  value={formData.altura}
                  onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })}>
                  <SelectTrigger id="sexo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel_atividade">Nível de Atividade</Label>
                <Select value={formData.nivel_atividade} onValueChange={(value) => setFormData({ ...formData, nivel_atividade: value })}>
                  <SelectTrigger id="nivel_atividade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sedentário</SelectItem>
                    <SelectItem value="2">Levemente ativo</SelectItem>
                    <SelectItem value="3">Moderadamente ativo</SelectItem>
                    <SelectItem value="4">Muito ativo</SelectItem>
                    <SelectItem value="5">Extremamente ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gamified Goal Selection */}
            <div className="space-y-4 pt-6 border-t">
              <div className="space-y-2">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Escolha Seu Objetivo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Selecione uma estratégia para moldar sua jornada
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(Object.keys(GOAL_CONFIGS) as GoalType[]).map((goal) => {
                  const config = GOAL_CONFIGS[goal];
                  const isSelected = formData.objetivo === goal;
                  
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setFormData({ ...formData, objetivo: goal })}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all duration-200
                        hover:shadow-lg hover:scale-105 cursor-pointer
                        ${isSelected 
                          ? `${config.borderColor} ring-4 ring-offset-2 bg-secondary/50` 
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="space-y-3">
                        <div className={`${config.color} flex justify-center`}>
                          {getGoalIcon(goal)}
                        </div>
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-sm">{config.label}</h3>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge className="absolute -top-2 -right-2 bg-primary">
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diet Preview */}
            {dietPreview && (
              <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/20 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Activity className="h-5 w-5" />
                    Previsão da Sua Dieta
                  </CardTitle>
                  <CardDescription>
                    Valores calculados com base no objetivo selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meta Calórica Principal */}
                  <div className="text-center p-6 bg-background/80 rounded-lg border-2 border-primary/30">
                    <p className="text-sm text-muted-foreground mb-2">Meta Calórica Diária</p>
                    <p className="text-5xl font-bold text-primary">
                      {dietPreview.metaAlvo}
                      <span className="text-2xl ml-2">kcal</span>
                    </p>
                    <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
                      <span>TMB: {dietPreview.bmr} kcal</span>
                      <span>•</span>
                      <span>TDEE: {dietPreview.tdee} kcal</span>
                    </div>
                  </div>

                  {/* Distribuição de Macros */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-center">Distribuição de Macronutrientes</p>
                    
                    {/* Proteína */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Proteína</span>
                        <Badge variant="secondary">{dietPreview.proteina}g</Badge>
                      </div>
                      <Progress 
                        value={33} 
                        className="h-2 bg-blue-200 [&>div]:bg-blue-500"
                      />
                    </div>

                    {/* Carboidrato */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Carboidratos</span>
                        <Badge variant="secondary">{dietPreview.carboidrato}g</Badge>
                      </div>
                      <Progress 
                        value={33} 
                        className="h-2 bg-green-200 [&>div]:bg-green-500"
                      />
                    </div>

                    {/* Gordura */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Gorduras</span>
                        <Badge variant="secondary">{dietPreview.gordura}g</Badge>
                      </div>
                      <Progress 
                        value={33} 
                        className="h-2 bg-orange-200 [&>div]:bg-orange-500"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    💡 Esses valores serão aplicados quando você salvar as alterações
                  </p>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full md:w-auto" disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "🚀 Salvar e Aplicar Nova Dieta"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile.share_code && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartilhar com Nutricionista
            </CardTitle>
            <CardDescription>
              Use este código para permitir que seu nutricionista acompanhe seu progresso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-300 dark:border-green-700">
              <code className="flex-1 text-2xl font-mono font-bold text-green-700 dark:text-green-400 tracking-wider">
                {profile.share_code}
              </code>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/20"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.share_code || '');
                    toast.success('Código copiado!');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
                {navigator.share && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/20"
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: 'Meu Código Kalorix',
                          text: `Meu código de compartilhamento Kalorix é: ${profile.share_code}`,
                        });
                      } catch (error) {
                        // User cancelled
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-green-100/50 dark:bg-green-900/20 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">
                Como funciona?
              </h4>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>Copie ou compartilhe seu código com seu nutricionista</li>
                <li>O nutricionista adiciona você através do código no sistema dele</li>
                <li>Ele poderá acompanhar suas refeições, progresso e métricas</li>
                <li>Você mantém total controle dos seus dados</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground">
              🔒 Seu nutricionista só terá acesso aos seus dados se você compartilhar este código com ele.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinatura
          </CardTitle>
          <CardDescription>Gerencie sua assinatura e pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
            <div>
              <p className="font-semibold">Premium</p>
              <p className="text-sm text-muted-foreground">
                {profile.assinatura_ativa ? 'Assinatura ativa' : 'Assinatura inativa'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">R$ 27,90</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
          </div>

          <Button onClick={handleManageSubscription} variant="outline" className="w-full" disabled={portalLoading}>
            {portalLoading ? "Abrindo..." : "Gerenciar Assinatura no Stripe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
