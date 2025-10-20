import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Apple, Flame, Loader2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  // Hardcoded user phone for now - will be replaced with dynamic auth later
  const userPhone = '5521997759217';
  
  const { 
    dietData, 
    todaysMeals, 
    consumedTotals, 
    isLoading, 
    isError 
  } = useDashboardData(userPhone);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !dietData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erro ao carregar dados do dashboard</p>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      </div>
    );
  }

  // Calculate values from real data - converting strings to numbers
  const caloriesConsumed = consumedTotals.calorias;
  const caloriesGoal = parseFloat(dietData.calorias_diarias);
  const caloriesRemaining = caloriesGoal - caloriesConsumed;
  const progressPercent = caloriesGoal > 0 ? (caloriesConsumed / caloriesGoal) * 100 : 0;

  const macros = [
    { 
      name: "Proteínas", 
      consumed: Math.round(consumedTotals.proteinas), 
      goal: parseFloat(dietData.proteina_gramas), 
      color: "protein", 
      unit: "g" 
    },
    { 
      name: "Carboidratos", 
      consumed: Math.round(consumedTotals.carboidratos), 
      goal: parseFloat(dietData.carboidrato_gramas), 
      color: "carbs", 
      unit: "g" 
    },
    { 
      name: "Gorduras", 
      consumed: Math.round(consumedTotals.gorduras), 
      goal: parseFloat(dietData.gordura_gramas), 
      color: "fats", 
      unit: "g" 
    },
  ];

  // Format time from HH:MM:SS to HH:MM
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  // Map meal types to Portuguese
  const getMealTypeInPortuguese = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'Café da manhã': 'Café da manhã',
      'Almoço': 'Almoço', 
      'Lanche': 'Lanche',
      'Jantar': 'Jantar'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Como você está hoje</p>
      </div>

      {/* Calorie Overview Card */}
      <Card className="bg-secondary border-none">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Meta Diária de Calorias
              </span>
            </div>
            
            <div>
              <div className="text-5xl md:text-6xl font-bold text-primary mb-2">
                {caloriesGoal}
                <span className="text-2xl ml-2">kcal</span>
              </div>
              <p className="text-sm text-muted-foreground">
                TMB: {dietData.gasto_basal} kcal • NEAT: {dietData.neat} kcal
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Consumido: {caloriesConsumed} kcal</span>
                <span className="font-semibold">
                  Restante: {caloriesRemaining > 0 ? caloriesRemaining : 0} kcal
                </span>
              </div>
              <Progress value={Math.min(progressPercent, 100)} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macros Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Distribuição de Macronutrientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1 h-8 rounded-full overflow-hidden">
            {macros.map((macro) => (
              <div
                key={macro.name}
                className={`bg-${macro.color}`}
                style={{ 
                  width: `${(macro.goal / (macros.reduce((sum, m) => sum + m.goal, 0))) * 100}%` 
                }}
              />
            ))}
          </div>

          {macros.map((macro) => (
            <div key={macro.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full bg-${macro.color}/10 flex items-center justify-center`}>
                    <span className={`text-${macro.color} font-bold text-sm`}>
                      {macro.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{macro.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {macro.goal > 0 ? Math.round((macro.goal / caloriesGoal) * 100) : 0}% das calorias
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{macro.consumed}{macro.unit}</p>
                  <p className="text-xs text-muted-foreground">de {macro.goal}{macro.unit}</p>
                </div>
              </div>
              <Progress 
                value={macro.goal > 0 ? Math.min((macro.consumed / macro.goal) * 100, 100) : 0} 
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Today's Meals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Refeições de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma refeição registrada hoje</p>
              <p className="text-sm">Comece enviando uma foto pelo WhatsApp!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysMeals.map((meal, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {formatTime(meal.hora_consumo)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{meal.nome_alimento}</p>
                      <p className="text-xs text-muted-foreground">
                        {getMealTypeInPortuguese(meal.tipo_refeicao)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{parseFloat(meal.calorias)} kcal</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
