import { useState } from 'react';
import { LogOut, Plus, RefreshCw, Search, TrendingUp, Users, Activity, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNutritionistClients } from '@/hooks/useNutritionistClients';
import AddClientModal from '@/components/nutritionist/AddClientModal';
import CreateClientModal from '@/components/nutritionist/CreateClientModal';
import { MacroMiniPie } from '@/components/nutritionist/MacroMiniPie';
import { AdherenceBar } from '@/components/nutritionist/AdherenceBar';
import { InsightBadge } from '@/components/nutritionist/InsightBadge';
import { buildInsight } from '@/lib/nutritionistMetrics';

export default function NutritionistDashboard() {
  const navigate = useNavigate();
  const { clients, summary, loading, refreshing, refresh } = useNutritionistClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/nutritionist/login');
  };

  // Filtrar clientes
  const filteredClients = clients.filter(client => 
    client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.share_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função auxiliar para iniciais
  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  // Função auxiliar para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hub de Nutricionistas
            </h1>
            <p className="text-sm text-muted-foreground">
              {summary?.nutritionist_name || 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Clientes Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.active_clients_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                de {summary?.total_clients_count || 0} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Refeições esta Semana
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.total_meals_week || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                registros nos últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média de Calorias
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.avg_calories_week ? Math.round(summary.avg_calories_week) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                kcal por refeição
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Última Atualização
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Hoje
              </div>
              <p className="text-xs text-muted-foreground">
                dados sincronizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Ações */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Criar Novo Cliente
          </Button>
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca' 
                  : 'Adicione seus primeiros clientes usando o código de compartilhamento'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card key={client.client_id} className="hover:shadow-lg transition">
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-base">{client.client_name}</CardTitle>
                      <CardDescription className="text-xs">{client.share_code}</CardDescription>
                    </div>
                    {client.is_active && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Peso</p>
                      <p className="font-semibold">{client.current_weight ? `${client.current_weight} kg` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">IMC</p>
                      <p className="font-semibold">{client.imc || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Refeições (7d)</p>
                      <p className="font-semibold">{client.meals_last_7_days || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <MacroMiniPie
                      data={[
                        { name: 'Prot', value: client.avg_calories_last_7_days ? 30 : 0, color: '#0ea5e9' },
                        { name: 'Carb', value: client.avg_calories_last_7_days ? 45 : 0, color: '#22c55e' },
                        { name: 'Gord', value: client.avg_calories_last_7_days ? 25 : 0, color: '#f59e0b' },
                      ]}
                    />
                    <div className="flex-1">
                      <AdherenceBar
                        percent={client.adherence_percent_7d || 0}
                      />
                      <div className="mt-2">
                        <InsightBadge
                          text={buildInsight({
                            adherencePercent: client.adherence_percent_7d || 0,
                            avgCaloriesWeek: client.avg_calories_last_7_days || 0,
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Último registro: {client.last_meal_date ? new Date(client.last_meal_date).toLocaleDateString() : '-'}
                  </p>

                  <Button variant="outline" className="w-full" onClick={() => navigate(`/nutritionist/client/${client.client_id}`)}>
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar Cliente */}
      <AddClientModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refresh}
      />

      {/* Modal de Criar Cliente */}
      <CreateClientModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
