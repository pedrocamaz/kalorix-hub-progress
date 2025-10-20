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
          <div className="text-center text-sm text-muted-foreground">
            © 2025 Kalorix. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
