import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useState } from "react";

const Reports = () => {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  // State for calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  
  const { chartData, calendarData, isLoading, isError } = useReports(userPhone, currentYear, currentMonth);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Erro ao carregar relatórios</p>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      </div>
    );
  }

  const getHeatmapColor = (balance: number, hasData: boolean) => {
    if (!hasData) return "bg-gray-100 dark:bg-gray-800";
    if (balance < -200) return "bg-red-500";
    if (balance < -100) return "bg-red-400";
    if (balance < 0) return "bg-red-300";
    if (balance < 100) return "bg-green-300";
    if (balance < 200) return "bg-green-400";
    return "bg-green-500";
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDayNumber = (dateString: string) => {
    return new Date(dateString).getDate();
  };

  const getWeekdays = () => {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  };

  const getCalendarGrid = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();
    
    // Create array with empty slots for days before month start
    const grid = Array(startOfWeek).fill(null);
    
    // Add actual days data
    calendarData.forEach(dayData => {
      grid.push(dayData);
    });
    
    return grid;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios e Progresso</h1>
        <p className="text-muted-foreground">Seu esforço está valendo a pena?</p>
      </div>

      {/* Interactive Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Balanço Calórico Mensal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatMonthYear(currentDate)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2">
                {getWeekdays().map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {getCalendarGrid().map((dayData, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative ${
                      dayData 
                        ? `${getHeatmapColor(dayData.balance, dayData.hasData)} cursor-pointer hover:opacity-80 transition-opacity`
                        : 'bg-transparent'
                    }`}
                    title={dayData ? `${getDayNumber(dayData.date)} - ${dayData.calories} kcal (${dayData.balance > 0 ? '+' : ''}${dayData.balance})` : ''}
                  >
                    {dayData && (
                      <>
                        <span className={`text-sm font-medium ${dayData.hasData ? 'text-white' : 'text-muted-foreground'}`}>
                          {getDayNumber(dayData.date)}
                        </span>
                        {dayData.hasData && (
                          <span className="text-xs text-white/90">
                            {dayData.calories}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800" />
                <span className="text-muted-foreground">Sem dados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-500" />
                <span className="text-muted-foreground">Déficit alto (-200+)</span>
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
                <span className="text-muted-foreground">Superávit alto (+200)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Chart - Calories & Weight Trend (Last 6 months) */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Consumo e Peso - Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
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
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
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
