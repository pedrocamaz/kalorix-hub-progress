import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, LineChart, MessageSquare, Target } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section id="inicio" className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Sua jornada para uma vida mais saudável começa aqui
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Monitore suas calorias de forma simples pelo WhatsApp e acompanhe seus resultados em tempo real
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                Começar agora →
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Leva apenas 2 minutos
          </p>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="bg-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Envie pelo WhatsApp</h3>
              <p className="text-muted-foreground">
                Tire uma foto da sua refeição ou descreva o que comeu
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">IA Analisa</h3>
              <p className="text-muted-foreground">
                Nossa inteligência artificial calcula calorias e macronutrientes
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Acompanhe Resultados</h3>
              <p className="text-muted-foreground">
                Visualize seu progresso com gráficos e relatórios detalhados
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Atinja suas Metas</h3>
              <p className="text-muted-foreground">
                Receba orientações personalizadas para alcançar seus objetivos
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Quem Somos */}
      <section id="quem-somos" className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Quem Somos</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A Kalorix nasceu da missão de tornar o monitoramento nutricional acessível e descomplicado. 
            Acreditamos que cuidar da saúde não precisa ser difícil ou tedioso. Por isso, criamos um 
            assistente nutricional inteligente que se integra naturalmente ao seu dia a dia através 
            do WhatsApp.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nossa tecnologia combina inteligência artificial de ponta com uma interface simples e 
            intuitiva, permitindo que você foque no que realmente importa: seus objetivos de saúde.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 Kalorix. Todos os direitos reservados.
            </div>
            <Link 
              to="/nutritionist/login" 
              className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Área do Nutricionista
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
