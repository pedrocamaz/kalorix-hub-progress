import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Apple, Flame } from "lucide-react";

const Dashboard = () => {
  // Mock data - will be replaced with real data from Supabase
  const caloriesConsumed = 1850;
  const caloriesGoal = 2759;
  const caloriesRemaining = caloriesGoal - caloriesConsumed;
  const progressPercent = (caloriesConsumed / caloriesGoal) * 100;

  const macros = [
    { name: "Proteínas", consumed: 120, goal: 186, color: "protein", unit: "g" },
    { name: "Carboidratos", consumed: 180, goal: 295, color: "carbs", unit: "g" },
    { name: "Gorduras", consumed: 55, goal: 93, color: "fats", unit: "g" },
  ];

  const todaysMeals = [
    { time: "08:30", type: "Café da manhã", name: "Pão integral com ovo", calories: 320 },
    { time: "12:45", type: "Almoço", name: "Frango grelhado com arroz e salada", calories: 650 },
    { time: "16:00", type: "Lanche", name: "Iogurte com granola", calories: 180 },
    { time: "19:30", type: "Jantar", name: "Salmão com legumes", calories: 700 },
  ];

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
                TMB: 2009 kcal • NEAT: 350 kcal
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Consumido: {caloriesConsumed} kcal</span>
                <span className="font-semibold">Restante: {caloriesRemaining} kcal</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
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
                style={{ width: `${(macro.goal / (macros.reduce((sum, m) => sum + m.goal, 0))) * 100}%` }}
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
                      {Math.round((macro.goal / caloriesGoal) * 100)}% das calorias
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{macro.consumed}{macro.unit}</p>
                  <p className="text-xs text-muted-foreground">de {macro.goal}{macro.unit}</p>
                </div>
              </div>
              <Progress 
                value={(macro.consumed / macro.goal) * 100} 
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
          <div className="space-y-3">
            {todaysMeals.map((meal, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{meal.time}</p>
                  </div>
                  <div>
                    <p className="font-medium">{meal.name}</p>
                    <p className="text-xs text-muted-foreground">{meal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{meal.calories} kcal</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
