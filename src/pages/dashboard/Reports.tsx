import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar } from "lucide-react";

const Reports = () => {
  // Mock data for the last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    calories: Math.floor(Math.random() * 800) + 1800,
    weight: 93 - (i * 0.1) + (Math.random() * 0.5 - 0.25),
  }));

  // Mock heatmap data (caloric balance for last 30 days)
  const heatmapData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    balance: Math.floor(Math.random() * 600) - 300, // -300 to +300
  }));

  const getHeatmapColor = (balance: number) => {
    if (balance < -200) return "bg-red-500";
    if (balance < -100) return "bg-red-400";
    if (balance < 0) return "bg-red-300";
    if (balance < 100) return "bg-green-300";
    if (balance < 200) return "bg-green-400";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios e Progresso</h1>
        <p className="text-muted-foreground">Seu esforço está valendo a pena?</p>
      </div>

      {/* Heatmap - Caloric Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Balanço Calórico - Últimos 30 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {heatmapData.map((data) => (
                <div
                  key={data.day}
                  className={`aspect-square rounded-lg ${getHeatmapColor(data.balance)} flex items-center justify-center`}
                  title={`Dia ${data.day}: ${data.balance > 0 ? '+' : ''}${data.balance} kcal`}
                >
                  <span className="text-xs font-medium text-white">{data.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-500" />
                <span className="text-muted-foreground">Déficit alto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-300" />
                <span className="text-muted-foreground">Déficit leve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-300" />
                <span className="text-muted-foreground">Superávit leve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-500" />
                <span className="text-muted-foreground">Superávit alto</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Chart - Calories & Weight Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Consumo e Peso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `D${value}`}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Calorias', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Peso (kg)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Calorias consumidas"
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--protein))" 
                  strokeWidth={2}
                  name="Peso (kg)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
