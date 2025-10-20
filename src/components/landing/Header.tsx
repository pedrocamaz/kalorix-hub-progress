import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#inicio" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Início
          </a>
          <a href="#como-funciona" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Como Funciona
          </a>
          <a href="#quem-somos" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Quem Somos
          </a>
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <a
              href="#inicio"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Como Funciona
            </a>
            <a
              href="#quem-somos"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Quem Somos
            </a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full">Login</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
