import { useState } from 'react';
import { Sparkles, User, Phone, Mail, Target, Flame, Beef, Wheat, Droplet, Calculator, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNutritionistClients, CreateClientData } from '@/hooks/useNutritionistClients';

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateClientModal({ open, onClose, onSuccess }: CreateClientModalProps) {
  const { createClient } = useNutritionistClients();
  const [loading, setLoading] = useState(false);
  const [dietaDinamica, setDietaDinamica] = useState(true); // 🔥 Estado do tipo de dieta
  const [nivelAtividade, setNivelAtividade] = useState(1); // 🔥 Nível de atividade (1-5)
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    phone: '',
    email: '',
    peso: 70,
    altura: 170,
    idade: 30,
    sexo: 'M',
    goal: 'maintenance',
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 60,
    nivel_atividade: 1,
    dieta_dinamica: true,
  });

  // ✅ Validação completa do formulário
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.peso > 0 &&
      formData.altura > 0 &&
      formData.idade > 0 &&
      (formData.sexo === 'M' || formData.sexo === 'F') &&
      formData.calories > 0 &&
      formData.protein > 0 &&
      formData.carbs > 0 &&
      formData.fat > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check validation
    if (!isFormValid()) {
      alert('Preencha todos os campos obrigatórios corretamente');
      return;
    }

    setLoading(true);
    try {
      const success = await createClient(formData);
      
      if (success) {
        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          peso: 70,
          altura: 170,
          idade: 30,
          sexo: 'M',
          goal: 'maintenance',
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 60,
        });
        onClose();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // ✅ Previne submit ao apertar Enter em campos individuais
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  };

  // Phone formatting
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  // Calculate BMR (Mifflin-St Jeor)
  const calculateBMR = (peso: number, altura: number, idade: number, sexo: string): number => {
    if (sexo === 'M') {
      return Math.round((10 * peso) + (6.25 * altura) - (5 * idade) + 5);
    } else {
      return Math.round((10 * peso) + (6.25 * altura) - (5 * idade) - 161);
    }
  };

  // Calculate IMC
  const calculateIMC = (peso: number, altura: number): number => {
    const h = altura / 100;
    return Number((peso / (h * h)).toFixed(1));
  };

  // Quick macro calculator with physical data
  const quickCalculate = () => {
    const bmr = calculateBMR(formData.peso, formData.altura, formData.idade, formData.sexo);
    const neat = 350; // Fixo
    
    // 🔥 CALCULAR BONUS DE ATIVIDADE (apenas se estático)
    let bonusAtividade = 0;
    if (!dietaDinamica) {
      const bonusMap = [0, 200, 400, 600, 800];
      bonusAtividade = bonusMap[nivelAtividade - 1] || 0;
    }
    
    // 🔥 META BASE = TMB + NEAT + bonus (se estático)
    let metaBase = bmr + neat + bonusAtividade;
    
    let baseCalories = metaBase;
    
    // Adjust based on goal
    if (formData.goal === 'lose') baseCalories = metaBase - 400;
    else if (formData.goal === 'gain') baseCalories = metaBase + 400;
    else baseCalories = metaBase; // maintenance
    
    // Macro split (40% carbs, 30% protein, 30% fat)
    const protein = Math.round((baseCalories * 0.30) / 4);
    const carbs = Math.round((baseCalories * 0.40) / 4);
    const fat = Math.round((baseCalories * 0.30) / 9);
    
    setFormData({
      ...formData,
      calories: baseCalories,
      protein,
      carbs,
      fat,
      nivel_atividade: nivelAtividade,
      dieta_dinamica: dietaDinamica,
    });
  };

  const imc = calculateIMC(formData.peso, formData.altura);
  const bmr = calculateBMR(formData.peso, formData.altura, formData.idade, formData.sexo);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-green-600" />
            Criar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente e configure sua dieta inicial
          </DialogDescription>
        </DialogHeader>
        
        {/* ✅ Adiciona onKeyDown para prevenir Enter */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6 py-4">
          {/* Basic Info Section */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: João Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-white"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="pl-9 bg-white"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9 bg-white"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Objetivo</Label>
                  <Select
                    value={formData.goal}
                    onValueChange={(value) => setFormData({ ...formData, goal: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white">
                      <Target className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose_aggressive">🔥 Secar Tudo</SelectItem>
                      <SelectItem value="lose_moderate">📉 Emagrecer Saudável</SelectItem>
                      <SelectItem value="maintenance">⚖️ Manutenção</SelectItem>
                      <SelectItem value="gain_lean">💪 Ganho Massa Magra</SelectItem>
                      <SelectItem value="gain_aggressive">🏋️ Bulking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Physical Data Section */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Dados Físicos *
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peso">Peso (kg) *</Label>
                  <Input
                    id="peso"
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || 0 })}
                    className="bg-white"
                    min="30"
                    max="300"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altura">Altura (cm) *</Label>
                  <Input
                    id="altura"
                    type="number"
                    value={formData.altura}
                    onChange={(e) => setFormData({ ...formData, altura: parseInt(e.target.value) || 0 })}
                    className="bg-white"
                    min="100"
                    max="250"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idade">Idade *</Label>
                  <Input
                    id="idade"
                    type="number"
                    value={formData.idade}
                    onChange={(e) => setFormData({ ...formData, idade: parseInt(e.target.value) || 0 })}
                    className="bg-white"
                    min="10"
                    max="120"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo *</Label>
                  <Select
                    value={formData.sexo}
                    onValueChange={(value: 'M' | 'F') => setFormData({ ...formData, sexo: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculated Metrics Display */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">📊 Métricas Calculadas:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">IMC:</span>
                    <span className="ml-2 font-semibold text-blue-700">{imc}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TMB:</span>
                    <span className="ml-2 font-semibold text-blue-700">{bmr} kcal</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 🔥 TIPO DE DIETA: DINÂMICA vs ESTÁTICA */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-purple-600" />
                Tipo de Dieta
              </h3>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="dietaDinamica"
                  checked={dietaDinamica}
                  onChange={(e) => setDietaDinamica(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  disabled={loading}
                />
                <div className="flex-1">
                  <label htmlFor="dietaDinamica" className="block text-sm font-semibold text-purple-900 dark:text-purple-100 cursor-pointer">
                    🔥 Dieta Dinâmica (Treinos Contam Separadamente)
                  </label>
                  <div className="mt-2 space-y-2 text-xs">
                    <p className="text-purple-700 dark:text-purple-300">
                      <strong>✅ Dinâmica (padrão):</strong> Meta base = TMB + 350 kcal. 
                      Cliente registra treinos que <em>adicionam</em> calorias ao dia. Ideal para monitorar aderência aos treinos.
                    </p>
                    <p className="text-purple-600 dark:text-purple-400">
                      <strong>⚡ Estática:</strong> Meta base já inclui exercícios estimados (TMB + 350 + bonus). 
                      Treinos são apenas controle, não alteram meta diária.
                    </p>
                  </div>
                </div>
              </div>

              {/* 🎯 SE ESTÁTICO, MOSTRA SELETOR DE NÍVEL DE ATIVIDADE */}
              {!dietaDinamica && (
                <div className="p-4 bg-white rounded-lg border border-amber-200">
                  <Label htmlFor="nivelAtividade" className="text-sm font-semibold mb-2 block">
                    📊 Nível de Atividade (usado no cálculo)
                  </Label>
                  <Select
                    value={nivelAtividade.toString()}
                    onValueChange={(value) => {
                      const nivel = parseInt(value);
                      setNivelAtividade(nivel);
                      setFormData({ ...formData, nivel_atividade: nivel });
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Sedentário (+0 kcal)</SelectItem>
                      <SelectItem value="2">2 - Levemente Ativo (+200 kcal)</SelectItem>
                      <SelectItem value="3">3 - Moderadamente Ativo (+400 kcal)</SelectItem>
                      <SelectItem value="4">4 - Muito Ativo (+600 kcal)</SelectItem>
                      <SelectItem value="5">5 - Extremamente Ativo (+800 kcal)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Quanto mais ativo, maior o bonus calórico adicionado à meta base.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Macro Configuration Section */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Flame className="h-5 w-5 text-purple-600" />
                  Configuração de Macros
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={quickCalculate}
                  className="bg-white"
                  disabled={loading}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Automático
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories" className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Calorias
                  </Label>
                  <Input
                    id="calories"
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
                    className="bg-white"
                    min="1000"
                    max="5000"
                    disabled={loading}
                  />
                  <Badge variant="secondary" className="text-xs">kcal/dia</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protein" className="flex items-center gap-2">
                    <Beef className="h-4 w-4 text-red-500" />
                    Proteínas
                  </Label>
                  <Input
                    id="protein"
                    type="number"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || 0 })}
                    className="bg-white"
                    min="50"
                    max="500"
                    disabled={loading}
                  />
                  <Badge variant="secondary" className="text-xs">gramas</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carbs" className="flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-amber-600" />
                    Carboidratos
                  </Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) || 0 })}
                    className="bg-white"
                    min="50"
                    max="500"
                    disabled={loading}
                  />
                  <Badge variant="secondary" className="text-xs">gramas</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fat" className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-yellow-500" />
                    Gorduras
                  </Label>
                  <Input
                    id="fat"
                    type="number"
                    value={formData.fat}
                    onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) || 0 })}
                    className="bg-white"
                    min="20"
                    max="200"
                    disabled={loading}
                  />
                  <Badge variant="secondary" className="text-xs">gramas</Badge>
                </div>
              </div>

              {/* Macro Preview */}
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-muted-foreground mb-2">Distribuição Calórica:</p>
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    Proteína: {Math.round((formData.protein * 4 / formData.calories) * 100)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    Carbo: {Math.round((formData.carbs * 4 / formData.calories) * 100)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    Gordura: {Math.round((formData.fat * 9 / formData.calories) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>✨ Benefícios:</strong> O cliente será criado com assinatura ativa automaticamente, 
              perfil completo (peso, altura, idade, sexo) e receberá um código de compartilhamento para acessar o app.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            {/* ✅ Desabilita botão se formulário não estiver completo */}
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando Cliente...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Criar Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}