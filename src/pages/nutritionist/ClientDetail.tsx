import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Phone, Mail, Calendar, Target, FileText, TrendingUp, Edit, Flame, Award, Zap, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatShareCode } from "@/lib/shareCode";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { calcImc, classifyImc, calcAdherence, buildInsight } from '@/lib/nutritionistMetrics';
import { InsightBadge } from '@/components/nutritionist/InsightBadge';
import { Progress } from '@/components/ui/progress';
import { useClientLiveMetrics } from '@/hooks/useClientLiveMetrics';
import EditDietModal from '@/components/nutritionist/EditDietModal';

interface ClientData {
  id: string;
  nome: string;
  email?: string;
  telefone: string;
  share_code?: string;
  idade?: number;
  sexo?: string; // Campo real é 'sexo' não 'genero'
  altura?: number;
  peso?: number; // Campo real é 'peso' não 'peso_atual'
  objetivo?: string;
  nivel_atividade?: string;
  tem_dieta_previa?: boolean;
  imc?: number; // Campo calculado automaticamente
  created_at: string;
}

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  goal_type: string;      // 'weight', 'calories', etc
  target_value: number;
  current_value?: number;
  target_date?: string;
  is_achieved?: boolean;  // substituir 'status'
  created_at: string;
}

// GOAL TYPE LABELS
const GOAL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  lose_aggressive: { label: 'Secar Tudo 🔥', icon: '🔥', color: 'text-red-600' },
  lose_moderate: { label: 'Emagrecer Saudável 📉', icon: '📉', color: 'text-orange-600' },
  maintenance: { label: 'Manutenção ⚖️', icon: '⚖️', color: 'text-blue-600' },
  gain_lean: { label: 'Ganho Massa Magra 💪', icon: '💪', color: 'text-green-600' },
  gain_aggressive: { label: 'Bulking 🏋️', icon: '🏋️', color: 'text-purple-600' },
};

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeWeightGoal, setActiveWeightGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para nova nota
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Estado para nova meta
  const [newGoal, setNewGoal] = useState({
    goal_type: "weight_loss",
    target_value: "",
    target_date: "",
  });
  const [savingGoal, setSavingGoal] = useState(false);

  const { diet, todaysMeals, totals, remaining, isLoading: isLiveLoading } = useClientLiveMetrics(clientId, client?.telefone || '');

  const [adherence7d, setAdherence7d] = useState<{ percent: number; daysWithMeals: number; referenceDays: number } | null>(null);

  // Add state for Edit Diet Modal
  const [showEditDiet, setShowEditDiet] = useState(false);

  // New state for gamified charts
  const [weeklyCalories, setWeeklyCalories] = useState<Array<{ day: string; calories: number; target: number }>>([]);
  const [weeklyMacros, setWeeklyMacros] = useState<Array<{ day: string; protein: number; carbs: number; fat: number }>>([]);
  const [weightHistory, setWeightHistory] = useState<Array<{ date: string; weight: number }>>([]);
  const [todayExerciseCalories, setTodayExerciseCalories] = useState(0);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Busca dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from("users")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Busca notas
      const { data: notesData, error: notesError } = await supabase
        .from("nutritionist_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);

      // Busca metas
      const { data: goalsData, error: goalsError } = await supabase
        .from("nutritionist_goals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (goalsError) throw goalsError;
      setGoals(goalsData || []);
      
      // Busca meta de peso ativa (corrigido)
      const weightGoal = (goalsData || []).find(
        (g) => g.goal_type === 'weight' && g.is_achieved === false
      );
      setActiveWeightGoal(weightGoal || null);

      // Refeições últimos 7 dias (para adesão real)
      const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // inclui hoje
        .toISOString()
        .split('T')[0];

      const { data: meals7d, error: meals7dError } = await supabase
        .from('registros_alimentares')
        .select('data_consumo')
        .eq('usuario_id', clientId)
        .gte('data_consumo', startDate);

      if (meals7dError) throw meals7dError;

      const mealDates = (meals7d || []).map(m => `${m.data_consumo}T00:00:00`);
      setAdherence7d(calcAdherence(mealDates));

      // FETCH WEIGHT HISTORY FROM registros_peso - Usando user_telefone como ID
      const { data: weightData, error: weightError } = await supabase
        .from('registros_peso')
        .select('peso, created_at')
        .eq('user_telefone', clientData.telefone)
        .order('created_at', { ascending: true })
        .limit(30); // Last 30 entries

      if (weightError) {
        console.error('Error fetching weight history:', weightError);
        // Não bloqueia o carregamento se falhar
      }
      
      const formattedWeightHistory = (weightData || []).map(w => ({
        date: new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        weight: parseFloat(w.peso),
      }));
      setWeightHistory(formattedWeightHistory);

      // FETCH TODAY'S EXERCISE CALORIES
      const today = new Date().toISOString().split('T')[0];
      const { data: workoutsToday, error: workoutsError } = await supabase
        .from('registros_treino')
        .select('calorias_queimadas')
        .eq('usuario_telefone', clientData.telefone)
        .eq('data_treino', today);

      if (!workoutsError) {
        const exerciseCals = (workoutsToday || []).reduce(
          (sum, w) => sum + (Number(w.calorias_queimadas) || 0),
          0
        );
        console.log('🏋️ Treinos hoje:', workoutsToday);
        console.log('🔥 Total calorias exercícios:', exerciseCals);
        setTodayExerciseCalories(exerciseCals);
      }

      // FETCH WEEKLY CALORIES (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const { data: mealsWeekData } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, calorias')
        .eq('usuario_id', clientId)
        .in('data_consumo', last7Days);

      // Get target calories from diet
      const { data: dietTarget } = await supabase
        .from('dietas')
        .select('calorias_diarias')
        .eq('usuario_telefone', clientData?.telefone || '')
        .maybeSingle();

      const targetCals = dietTarget?.calorias_diarias || 2000;

      const caloriesByDay = last7Days.map(date => {
        const dayMeals = (mealsWeekData || []).filter(m => m.data_consumo === date);
        const totalCals = dayMeals.reduce((sum, m) => sum + (m.calorias || 0), 0);
        return {
          day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
          calories: Math.round(totalCals),
          target: targetCals,
        };
      });
      setWeeklyCalories(caloriesByDay);

      // FETCH WEEKLY MACROS (last 7 days)
      const { data: macrosWeekData } = await supabase
        .from('registros_alimentares')
        .select('data_consumo, proteinas, carboidratos, gorduras')
        .eq('usuario_id', clientId)
        .in('data_consumo', last7Days);

      const macrosByDay = last7Days.map(date => {
        const dayMeals = (macrosWeekData || []).filter(m => m.data_consumo === date);
        return {
          day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
          protein: Math.round(dayMeals.reduce((sum, m) => sum + (m.proteinas || 0), 0)),
          carbs: Math.round(dayMeals.reduce((sum, m) => sum + (m.carboidratos || 0), 0)),
          fat: Math.round(dayMeals.reduce((sum, m) => sum + (m.gorduras || 0), 0)),
        };
      });
      setWeeklyMacros(macrosByDay);
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações do cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newNote.trim() || !clientId) return;

    setSavingNote(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Busca o ID do nutricionista
      const { data: nutritionistData, error: nutritionistError } = await supabase
        .from("nutritionists")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (nutritionistError) throw nutritionistError;

      const { error } = await supabase
        .from("nutritionist_notes")
        .insert({
          nutritionist_id: nutritionistData.id,
          client_id: clientId,
          note_text: newNote,
        });

      if (error) throw error;

      toast({
        title: "Nota salva!",
        description: "A nota foi adicionada com sucesso.",
      });

      setNewNote("");
      fetchClientData();
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Erro ao salvar nota",
        description: "Não foi possível salvar a nota. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  };

  const saveGoal = async () => {
    if (!newGoal.target_value || !clientId) return;

    setSavingGoal(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Busca o ID do nutricionista
      const { data: nutritionistData, error: nutritionistError } = await supabase
        .from("nutritionists")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (nutritionistError) throw nutritionistError;

      const { error } = await supabase
        .from("nutritionist_goals")
        .insert({
          nutritionist_id: nutritionistData.id,
          client_id: clientId,
          goal_type: newGoal.goal_type,
          target_value: parseFloat(newGoal.target_value),
          target_date: newGoal.target_date || null,
          status: "active",
        });

      if (error) throw error;

      toast({
        title: "Meta criada!",
        description: "A meta foi adicionada com sucesso.",
      });

      setNewGoal({ goal_type: "weight_loss", target_value: "", target_date: "" });
      fetchClientData();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast({
        title: "Erro ao criar meta",
        description: "Não foi possível criar a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingGoal(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weight_loss: "Perda de Peso",
      weight_gain: "Ganho de Peso",
      muscle_gain: "Ganho de Massa",
      maintenance: "Manutenção",
      other: "Outro",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      active: "Ativa",
      completed: "Concluída",
      cancelled: "Cancelada",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getGoalDisplay = (objetivo: string | undefined) => {
    if (!objetivo) return { label: 'Não definido', icon: '❓', color: 'text-gray-600' };
    return GOAL_LABELS[objetivo] || { label: objetivo, icon: '🎯', color: 'text-gray-600' };
  };

  // Exemplo de dados derivados (garantir arrays vazios se não houver consultas ainda)
  const weightData = (client?.peso ? [{ date: new Date().toISOString().split('T')[0], weight: client.peso }] : []);
  const dailyCalories = (client?.peso ? [{ date: new Date().toISOString().split('T')[0], calories: client.peso * 30 }] : []);
  const macroTrend = (client?.peso ? [{ day: 1, proteina: client.peso * 0.3, carbo: client.peso * 0.4, gordura: client.peso * 0.3 }] : []);
  // Remover placeholder:
  // const adherence = calcAdherence([]);
  const adherence = adherence7d || { percent: 0, daysWithMeals: 0, referenceDays: 7 };
  const insight = buildInsight({ proteinLowDays: 0, adherencePercent: adherence.percent });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Cliente não encontrado</CardTitle>
            <CardDescription>
              Não foi possível encontrar este cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/nutritionist/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGeneratePdf = () => {
    if (!client) return;
    const lines: string[] = [];
    lines.push("Relatório do Cliente - Kalorix");
    lines.push(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
    lines.push("");
    lines.push(`Nome: ${client.nome}`);
    lines.push(`Código: ${client.share_code || "-"}`);
    lines.push(`Peso: ${client.peso ? client.peso + " kg" : "N/A"}`);
    lines.push(`Altura: ${client.altura ? client.altura + " cm" : "N/A"}`);
    lines.push(`IMC: ${client.imc ? client.imc.toFixed(1) : "N/A"}`);
    lines.push(`Objetivo: ${client.objetivo || "N/A"}`);
    lines.push("");
    lines.push("Notas:");
    if (notes.length === 0) {
      lines.push("- Nenhuma anotação.");
    } else {
      notes.forEach(n =>
        lines.push(
          `- ${new Date(n.created_at).toLocaleDateString("pt-BR")}: ${n.note_text.replace(/\s+/g, " ")}`
        )
      );
    }
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${client.nome.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Relatório gerado",
      description: "Download iniciado (formato TXT).",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/nutritionist/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.nome}`} />
                  <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                    {getInitials(client.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.nome}</h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {client.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {client.email}
                      </div>
                    )}
                    {client.telefone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {client.telefone}
                      </div>
                    )}
                    {client.share_code && (
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Código: {formatShareCode(client.share_code)}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Cliente desde {new Date(client.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Acompanhamento de Hoje - tempo real */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Acompanhamento de Hoje</span>
                  <span className="text-xs text-muted-foreground">Atualiza em tempo real</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid gap-4 ${diet?.dieta_dinamica ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                  <div>
                    <p className="text-sm text-muted-foreground">Meta Base (kcal)</p>
                    <p className="text-2xl font-bold">{diet?.caloriesGoal ?? 0}</p>
                    {diet?.dieta_dinamica && (
                      <p className="text-xs text-purple-600 font-medium">🔥 Dinâmica</p>
                    )}
                  </div>
                  
                  {diet?.dieta_dinamica && (
                    <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                      <p className="text-sm text-muted-foreground">Meta do Dia (kcal)</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-purple-700">
                          {(diet?.caloriesGoal ?? 0) + todayExerciseCalories}
                        </p>
                        {todayExerciseCalories > 0 && (
                          <Dumbbell className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      {todayExerciseCalories > 0 ? (
                        <p className="text-xs text-purple-600 font-medium">+{todayExerciseCalories} de treinos</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem treinos hoje</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Consumido</p>
                    <p className="text-2xl font-bold text-primary">{Math.round(totals.calories)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restante</p>
                    <p className="text-2xl font-bold">{Math.round(remaining.calories)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progresso</p>
                    <Progress
                      value={diet && diet.caloriesGoal > 0 ? Math.min((totals.calories / diet.caloriesGoal) * 100, 100) : 0}
                      className="h-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Proteínas</p>
                    <p className="font-semibold">{Math.round(totals.protein)}g <span className="text-muted-foreground">/ {diet?.proteinGoal ?? 0}g</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carboidratos</p>
                    <p className="font-semibold">{Math.round(totals.carbs)}g <span className="text-muted-foreground">/ {diet?.carbGoal ?? 0}g</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gorduras</p>
                    <p className="font-semibold">{Math.round(totals.fats)}g <span className="text-muted-foreground">/ {diet?.fatGoal ?? 0}g</span></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Refeições de hoje</p>
                  {isLiveLoading ? (
                    <div className="text-muted-foreground text-sm">Carregando...</div>
                  ) : todaysMeals.length === 0 ? (
                    <div className="text-muted-foreground text-sm">Sem registros hoje</div>
                  ) : (
                    <div className="space-y-2">
                      {todaysMeals.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-12">{m.time}</span>
                            <span className="font-medium">{m.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-primary">{Math.round(m.calories)} kcal</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* UPDATED: Objetivo do Cliente - With Proper Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {client.objetivo && (
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Target className="h-6 w-6 text-green-600" />
                      <div>
                        <CardTitle className="text-green-900">Objetivo do Cliente</CardTitle>
                        <CardDescription>Meta nutricional definida</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{getGoalDisplay(client.objetivo).icon}</span>
                      <div>
                        <p className={`text-2xl font-bold ${getGoalDisplay(client.objetivo).color}`}>
                          {getGoalDisplay(client.objetivo).label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 🔥 BADGE TIPO DE DIETA */}
              {diet && (
                <Card className={`border-2 ${diet.dieta_dinamica ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Flame className="h-6 w-6 text-purple-600" />
                      <div>
                        <CardTitle className="text-purple-900">Tipo de Dieta</CardTitle>
                        <CardDescription>Modo de cálculo calórico</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{diet.dieta_dinamica ? '🔥' : '⚡'}</span>
                      <div>
                        <p className={`text-2xl font-bold ${diet.dieta_dinamica ? 'text-purple-700' : 'text-amber-700'}`}>
                          {diet.dieta_dinamica ? 'Dinâmica' : 'Estática'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {diet.dieta_dinamica 
                            ? 'Treinos adicionam calorias' 
                            : 'Treinos já inclusos na meta'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Peso Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">
                    {client.peso ? `${client.peso} kg` : "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Altura</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">
                    {client.altura ? `${client.altura} cm` : "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">IMC</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">
                    {client.imc ? client.imc.toFixed(1) : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.idade && (
                    <div>
                      <Label className="text-gray-600">Idade</Label>
                      <p className="font-medium">{client.idade} anos</p>
                    </div>
                  )}
                  {client.sexo && (
                    <div>
                      <Label className="text-gray-600">Sexo</Label>
                      <p className="font-medium capitalize">{client.sexo}</p>
                    </div>
                  )}
                  {client.nivel_atividade && (
                    <div>
                      <Label className="text-gray-600">Nível de Atividade</Label>
                      <p className="font-medium">{client.nivel_atividade}</p>
                    </div>
                  )}
                  {client.tem_dieta_previa !== undefined && (
                    <div>
                      <Label className="text-gray-600">Tem Dieta Prévia</Label>
                      <p className="font-medium">{client.tem_dieta_previa ? "Sim" : "Não"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GAMIFIED: Weight Evolution Chart */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="h-6 w-6 text-orange-600" />
                    <div>
                      <CardTitle className="text-orange-900">🏆 Evolução de Peso</CardTitle>
                      <CardDescription>Progresso ao longo do tempo</CardDescription>
                    </div>
                  </div>
                  {weightHistory.length > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {weightHistory.length} registros
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {weightHistory.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <TrendingUp className="h-16 w-16 text-orange-300 mb-4" />
                    <p className="text-orange-700 font-medium">Nenhum registro de peso ainda</p>
                    <p className="text-sm text-muted-foreground">Os dados aparecerão aqui quando o cliente registrar o peso</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={weightHistory}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#c2410c"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#c2410c"
                        style={{ fontSize: '12px' }}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff7ed', 
                          border: '2px solid #fb923c',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Peso']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        fill="url(#weightGradient)"
                        dot={{ fill: '#f97316', r: 5 }}
                        activeDot={{ r: 8, fill: '#ea580c' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {weightHistory.length > 1 && (
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white/50 rounded-lg p-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">Peso Inicial</p>
                      <p className="text-xl font-bold text-orange-900">{weightHistory[0].weight.toFixed(1)} kg</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">Peso Atual</p>
                      <p className="text-xl font-bold text-orange-900">{weightHistory[weightHistory.length - 1].weight.toFixed(1)} kg</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">Variação</p>
                      <p className={`text-xl font-bold ${
                        (weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight) < 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight) > 0 ? '+' : ''}
                        {(weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight).toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GAMIFIED: Weekly Calories Profile */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Flame className="h-6 w-6 text-purple-600" />
                  <div>
                    <CardTitle className="text-purple-900">🔥 Perfil Calórico Semanal</CardTitle>
                    <CardDescription>Consumo vs Meta nos últimos 7 dias</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {weeklyCalories.every(d => d.calories === 0) ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <Flame className="h-16 w-16 text-purple-300 mb-4" />
                    <p className="text-purple-700 font-medium">Sem dados de calorias esta semana</p>
                    <p className="text-sm text-muted-foreground">Aguardando registros do cliente</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={weeklyCalories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#7e22ce"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#7e22ce"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#faf5ff', 
                            border: '2px solid #a855f7',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="calories" 
                          name="Consumido" 
                          fill="#a855f7" 
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar 
                          dataKey="target" 
                          name="Meta" 
                          fill="#d8b4fe" 
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 bg-white/50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm font-medium text-purple-900 mb-2">📊 Análise Rápida:</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Média Consumida:</span>
                          <span className="ml-2 font-bold text-purple-700">
                            {Math.round(weeklyCalories.reduce((sum, d) => sum + d.calories, 0) / 7)} kcal/dia
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dias Acima da Meta:</span>
                          <span className="ml-2 font-bold text-purple-700">
                            {weeklyCalories.filter(d => d.calories > d.target).length}/7
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* GAMIFIED: Weekly Macros Distribution */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-blue-900">⚡ Distribuição de Macros (7 dias)</CardTitle>
                    <CardDescription>Proteína, Carboidratos e Gorduras</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {weeklyMacros.every(d => d.protein === 0 && d.carbs === 0 && d.fat === 0) ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <Zap className="h-16 w-16 text-blue-300 mb-4" />
                    <p className="text-blue-700 font-medium">Sem dados de macros esta semana</p>
                    <p className="text-sm text-muted-foreground">Aguardando registros do cliente</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={weeklyMacros}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#1e40af"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#1e40af"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#eff6ff', 
                            border: '2px solid #3b82f6',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="protein" name="Proteína (g)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="carbs" name="Carboidratos (g)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fat" name="Gorduras (g)" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 bg-white/50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">💡 Insights:</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-muted-foreground">Média Proteína:</span>
                          <span className="font-bold text-blue-700">
                            {Math.round(weeklyMacros.reduce((sum, d) => sum + d.protein, 0) / 7)}g/dia
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-muted-foreground">Média Carboidratos:</span>
                          <span className="font-bold text-blue-700">
                            {Math.round(weeklyMacros.reduce((sum, d) => sum + d.carbs, 0) / 7)}g/dia
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                          <span className="text-muted-foreground">Média Gorduras:</span>
                          <span className="font-bold text-blue-700">
                            {Math.round(weeklyMacros.reduce((sum, d) => sum + d.fat, 0) / 7)}g/dia
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Resumo Nutricional</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditDiet(true)}
                    className="gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Dieta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  IMC: {calcImc(client?.peso ?? null, client?.altura ?? null)} (
                  {classifyImc(calcImc(client?.peso ?? null, client?.altura ?? null))})
                </p>
                <p>Adesão (7d): {adherence.percent}% ({adherence.daysWithMeals}/{adherence.referenceDays} dias)</p>
                
                {diet && (
                  <div className="pt-2 border-t">
                    <p className="font-medium">Modo da Dieta:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={diet.dieta_dinamica ? "default" : "secondary"}>
                        {diet.dieta_dinamica ? '🔥 Dinâmica' : '⚡ Estática'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {diet.dieta_dinamica 
                          ? `Meta hoje: ${(diet.caloriesGoal + todayExerciseCalories)} kcal (base ${diet.caloriesGoal} + ${todayExerciseCalories} treino)` 
                          : `Meta fixa: ${diet.caloriesGoal} kcal/dia`}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="mt-2">
                  <InsightBadge text={insight} />
                </div>
                <Button variant="outline" className="mt-2" onClick={handleGeneratePdf}>
                  Gerar Relatório PDF
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nova Anotação</CardTitle>
                <CardDescription>
                  Adicione observações sobre o acompanhamento do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua anotação aqui..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
                <Button onClick={saveNote} disabled={savingNote || !newNote.trim()}>
                  <FileText className="mr-2 h-4 w-4" />
                  {savingNote ? "Salvando..." : "Salvar Anotação"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {notes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Nenhuma anotação ainda. Adicione a primeira!
                  </CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardDescription>
                          {new Date(note.created_at).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(note.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-gray-700">{note.note_text}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nova Meta</CardTitle>
                <CardDescription>Defina uma meta para o cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Meta</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                      value={newGoal.goal_type}
                      onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                    >
                      <option value="weight_loss">Perda de Peso</option>
                      <option value="weight_gain">Ganho de Peso</option>
                      <option value="muscle_gain">Ganho de Massa</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <Label>Valor Alvo (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 70.5"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Data Alvo (opcional)</Label>
                    <Input
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  onClick={saveGoal}
                  disabled={savingGoal || !newGoal.target_value}
                >
                  <Target className="mr-2 h-4 w-4" />
                  {savingGoal ? "Salvando..." : "Criar Meta"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {goals.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Nenhuma meta criada. Adicione a primeira!
                  </CardContent>
                </Card>
              ) : (
                goals.map((goal) => (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{getGoalTypeLabel(goal.goal_type)}</CardTitle>
                          <CardDescription>
                            Criada em {new Date(goal.created_at).toLocaleDateString("pt-BR")}
                          </CardDescription>
                        </div>
                        {getStatusBadge("active")}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Meta</p>
                          <p className="text-2xl font-bold text-gray-900">{goal.target_value} kg</p>
                        </div>
                        {goal.current_value && (
                          <div>
                            <p className="text-sm text-gray-600">Atual</p>
                            <p className="text-2xl font-bold text-gray-900">{goal.current_value} kg</p>
                          </div>
                        )}
                        {goal.target_date && (
                          <div>
                            <p className="text-sm text-gray-600">Data Alvo</p>
                            <p className="font-medium text-gray-900">
                              {new Date(goal.target_date).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Diet Modal */}
      <EditDietModal
        open={showEditDiet}
        onClose={() => setShowEditDiet(false)}
        onSuccess={() => {
          fetchClientData();
        }}
        clientId={clientId || ''}
        clientName={client?.nome || ''}
        currentDiet={diet ? {
          calories: diet.caloriesGoal,
          protein: diet.proteinGoal,
          carbs: diet.carbGoal,
          fat: diet.fatGoal,
        } : undefined}
      />
    </div>
  );
} 
   