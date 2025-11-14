import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Loader2, ChevronLeft, ChevronRight, TrendingUp, Award, Target } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useLogWeight } from "@/hooks/useLogWeight";
import { useWeightHistory } from "@/hooks/useWeightHistory";
import { useState } from "react";
import { useForm } from "react-hook-form";

const Reports = () => {
  const userPhone = localStorage.getItem('sessionPhone') || '';
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const { chartData, calendarData, isLoading, isError } = useReports(userPhone, currentYear, currentMonth);
  const { data: weightHistory, isLoading: isLoadingWeight } = useWeightHistory();
  const logWeightMutation = useLogWeight();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ peso: string }>();

  const onSubmitWeight = (data: { peso: string }) => {
    const pesoNumber = parseFloat(data.peso);
    if (pesoNumber > 0 && pesoNumber < 500) {
      logWeightMutation.mutate(pesoNumber, {
        onSuccess: () => reset()
      });
    }
  };

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

  const formatChartData = () => {
    if (!weightHistory || weightHistory.length === 0) return [];
    
    return weightHistory.map(record => ({
      date: new Date(record.created_at).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      }),
      peso: record.peso
    }));
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
    return parseInt(dateString.split('-')[2], 10);
  };

  const getWeekdays = () => {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  };

  const getCalendarGrid = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfWeek = firstDayOfMonth.getDay();
    
    const grid = Array(startOfWeek).fill(null);
    
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

      {/* 🎯 CARD GAMIFICADO - LARANJA KALORIX */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <Award className="h-5 w-5" />
            🔥 Registrar Peso - Acompanhe sua Evolução!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitWeight)} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="peso" className="text-orange-700 dark:text-orange-300">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                step="0.1"
                placeholder="Ex: 75.5"
                className="border-orange-300 focus:border-orange-500"
                {...register('peso', { 
                  required: 'Campo obrigatório',
                  min: { value: 1, message: 'Peso deve ser maior que 0' },
                  max: { value: 500, message: 'Peso inválido' }
                })}
              />
              {errors.peso && (
                <p className="text-sm text-destructive">{errors.peso.message}</p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={logWeightMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {logWeightMutation.isPending ? '⏳ Salvando...' : '🚀 Registrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 🎯 GRÁFICO GAMIFICADO - LARANJA KALORIX */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <TrendingUp className="h-5 w-5" />
            🏆 Sua Jornada de Evolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWeight ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : !weightHistory || weightHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
              <Target className="h-16 w-16 text-orange-500 opacity-50" />
              <div>
                <p className="text-lg font-medium text-orange-700 dark:text-orange-400">Comece sua jornada agora!</p>
                <p className="text-sm text-muted-foreground">Registre seu primeiro peso acima e veja sua evolução 📈</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    dot={{ fill: '#f97316', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendário de Calorias - MANTIDO ORIGINAL */}
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
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {getWeekdays().map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
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
    </div>
  );
};

export default Reports;
