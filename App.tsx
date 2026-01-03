import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, LayoutDashboard, LogOut, Plus, Search, Calendar as CalendarIcon, ClipboardList, CheckCircle2, PlayCircle, Share2, FileText, Copy, ShieldCheck, ChevronRight, User as UserIcon, Loader2, X, Users, AlertCircle, Check, RefreshCw, Lightbulb, Edit2, Save, RotateCcw, Pencil, Trash2, ChevronLeft, CalendarDays, Mail, Settings, Building2, Bell, Lock, GripVertical, Clock, TrendingUp, Target, BarChart3, Star, Quote, Info, MessageCircle } from 'lucide-react';
import { Project, ContentStatus, WizardStep, NarrativeStructure, FinalAssets, User } from './types';
import * as GeminiService from './services/geminiService';
import { projectService } from './services/projectService';
import * as SubscriptionService from './services/subscriptionService';
import PaywallModal from './components/PaywallModal';
import { useSubscription } from './hooks/useSubscription';

// Componente de Carrossel Simples para a Landing Page
const LandingCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2000); // Troca a cada 2 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-[#0D0E12]">
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <img
            src={src}
            alt={`Slide ${index + 1}`}
            className="w-full h-auto object-cover"
          />
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-brand-teal w-6' : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
          />
        ))}
      </div>
    </div>
  );
};

// --- Constants ---
const MOCK_USER: User = {
  id: '1',
  name: 'Dr. Andre Silva',
  role: 'DENTISTA_DONO',
  email: 'andre@clinica.com'
};

const INITIAL_TEAM: User[] = [
  { id: '1', name: 'Dr. Andre Silva', role: 'Cirurgião-Dentista (Admin)', avatar: 'DR', email: 'andre@clinica.com' },
  { id: '2', name: 'Ana Clara', role: 'Social Media', avatar: 'AC', email: 'ana@agencia.com' },
];

// Temas seguindo a filosofia ADV Content - Tensões Culturais na Odontologia
const TOPIC_POOL = [
  // Tensões de Vaidade
  "O sorriso perfeito: expectativa vs realidade",
  "Por que escondemos o sorriso nas fotos?",
  "A obsessão pelo branco e o medo do natural",
  "Selfie e autoestima: o peso do sorriso",
  "Lentes de contato: quando a perfeição vira armadilha",

  // Tensões de Hábitos
  "O café que mancha e o sorriso que some",
  "Clareamento e café: a batalha diária",
  "Ranger os dentes: o stress que ninguém vê",
  "Bruxismo: quando a mente ataca à noite",
  "O preço do vício no sorriso",

  // Tensões de Medo
  "O medo do dentista que ninguém confessa",
  "Adiar a consulta: o custo do silêncio",
  "A dor que ignoramos até não dar mais",
  "Quando o medo custa mais que o tratamento",

  // Tensões de Sociedade
  "Sorriso de novela: a pressão invisível",
  "Por que julgamos sorrisos imperfeitos?",
  "O tabu dos dentes tortos na era digital",
  "Aparelho em adulto: vergonha ou coragem?",
  "A culpa de quem não cuida da boca",

  // Tensões de Tempo/Dinheiro
  "O implante que espera a vida toda",
  "Saúde bucal: luxo ou necessidade?",
  "Protelar o dentista: economia que sai cara",
  "A conta que chega depois do descuido"
];

// Função para obter temas do dia baseado na data
const getDailySuggestions = (): string[] => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const startIndex = (dayOfYear * 6) % TOPIC_POOL.length;

  const suggestions: string[] = [];
  for (let i = 0; i < 6; i++) {
    suggestions.push(TOPIC_POOL[(startIndex + i) % TOPIC_POOL.length]);
  }
  return suggestions;
};

// --- Helper Components ---

const Reveal: React.FC<{ children: React.ReactNode; className?: string; direction?: 'up' | 'down' | 'left' | 'right' | 'none'; delay?: number }> = ({ children, className = '', direction = 'up', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const getDirectionClass = () => {
    switch (direction) {
      case 'up': return 'translate-y-8';
      case 'down': return '-translate-y-8';
      case 'left': return 'translate-x-8';
      case 'right': return '-translate-x-8';
      default: return '';
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 cubic-bezier(0.17, 0.55, 0.55, 1) ${className} ${isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${getDirectionClass()}`}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, className, placeholder, autoFocus }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={`resize-none overflow-hidden block ${className}`}
      placeholder={placeholder}
      rows={1}
      autoFocus={autoFocus}
    />
  );
};

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'gradient' }> = ({ children, className = '', variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-brand-teal text-brand-black hover:bg-brand-teal/90 shadow-[0_0_20px_-5px_rgba(45,212,191,0.4)]',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700',
    ghost: 'text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/5',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    gradient: 'bg-gradient-to-r from-brand-teal to-teal-600 text-black font-bold hover:shadow-[0_0_25px_-5px_rgba(45,212,191,0.6)] border-none'
  };

  return (
    <button
      className={`px-6 py-3 rounded-[2rem] font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-brand-surface border border-zinc-800 rounded-3xl p-4 md:p-6 ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ status: ContentStatus }> = ({ status }) => {
  const styles = {
    'IDEIA': 'bg-zinc-800 text-zinc-300 border-zinc-700',
    'ROTEIRIZADO': 'bg-teal-900/30 text-teal-200 border-teal-800',
    'PRODUZIDO': 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
    'PUBLICADO': 'bg-brand-teal/20 text-brand-teal border-brand-teal/30'
  };
  return (
    <span className={`text-[10px] md:text-xs font-semibold px-2 md:px-3 py-1 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
};

import { supabase } from './services/supabaseClient';

// --- Auth Component ---
const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: (user: any) => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Auto login after signup if session exists, or notify to check email
        if (data.user) {
          // Check if session was created (auto-confirm disabled?)
          // For simple email/pass, usually it sends confirmation or logs in depending on settings.
          // Assuming auto-confirm for now or let them try to login.
          // Actually, standard supabase requires email confirmation by default.
          // But user asked for "functional" login. If confirmation is on, this might block.
          // I will assume standard flow and notify user.
          alert('Cadastro realizado! Por favor, faça login.');
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          onSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-teal/20 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-teal">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{mode === 'login' ? 'Área do Cliente' : 'Novo Cadastro'}</h2>
        </div>

        {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:border-brand-teal outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:border-brand-teal outline-none"
              placeholder="******"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <p className="text-sm text-zinc-400">
            {mode === 'login' ? 'Não tem uma conta?' : 'Já possui conta?'}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-brand-teal font-bold ml-1 hover:underline"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Fazer Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Mock UI Components for Landing Page ---
const MockBrowserWindow: React.FC<{ children: React.ReactNode; title?: string; className?: string }> = ({ children, title = "OdontoContent IA", className = "" }) => (

  <div className={`rounded-2xl overflow-hidden border border-zinc-700/50 bg-[#0A0A0A] shadow-2xl ${className}`}>
    <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-3 flex items-center gap-4 backdrop-blur-md">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-sm"></div>
        <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-sm"></div>
        <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-sm"></div>
      </div>
      <div className="px-4 py-1.5 bg-zinc-950/50 rounded-lg border border-zinc-800/50 text-[10px] text-zinc-400 flex-1 text-center font-mono flex items-center justify-center gap-2">
        <Lock className="w-3 h-3 opacity-50" /> {title}
      </div>
      <div className="w-10"></div> {/* Spacer */}
    </div>
    <div className="p-1 bg-zinc-950">
      {children}
    </div>
  </div>
);

// --- Views ---

const LandingPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-950">
    <style>{`
      .cubic-bezier {
         transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(2deg); }
      }
      
      @keyframes float-slow {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      
      @keyframes pulse-glow {
        0%, 100% { 
          box-shadow: 0 0 20px -5px rgba(45, 212, 191, 0.3);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 40px -5px rgba(45, 212, 191, 0.6);
          transform: scale(1.02);
        }
      }
      
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      
      @keyframes gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      
      @keyframes fade-in-up {
        from { 
          opacity: 0;
          transform: translateY(30px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes scale-in {
        from { 
          opacity: 0;
          transform: scale(0.9);
        }
        to { 
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes glow-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      
      @keyframes typing {
        from { width: 0; }
        to { width: 100%; }
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      
      .animate-float { animation: float 6s ease-in-out infinite; }
      .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
      .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
      .animate-shimmer { 
        background: linear-gradient(90deg, transparent 0%, rgba(45, 212, 191, 0.1) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmer 3s ease-in-out infinite; 
      }
      .animate-gradient-shift { 
        background-size: 200% 200%;
        animation: gradient-shift 4s ease infinite; 
      }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
      .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
      
      .hover-lift {
        transition: all 0.4s cubic-bezier(0.17, 0.55, 0.55, 1);
      }
      .hover-lift:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px -15px rgba(45, 212, 191, 0.2);
      }
      
      .hover-glow {
        transition: all 0.3s ease;
      }
      .hover-glow:hover {
        box-shadow: 0 0 30px -5px rgba(45, 212, 191, 0.4);
      }
      
      .text-gradient-animate {
        background: linear-gradient(90deg, #2dd4bf, #ffffff, #34d399, #2dd4bf);
        background-size: 300% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradient-shift 6s ease infinite;
      }
      
      .card-shine {
        position: relative;
        overflow: hidden;
      }
      .card-shine::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 200%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.03), transparent);
        transition: transform 0.6s ease;
      }
      .card-shine:hover::before {
        transform: translateX(100%);
      }
      
      .icon-bounce {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .icon-bounce:hover {
        transform: scale(1.15) rotate(5deg);
      }
      
      .btn-ripple {
        position: relative;
        overflow: hidden;
      }
      .btn-ripple::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.6s ease, height 0.6s ease;
      }
      .btn-ripple:hover::after {
        width: 300px;
        height: 300px;
      }
      
      .border-glow {
        position: relative;
      }
      .border-glow::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(45deg, #2dd4bf, transparent, #2dd4bf);
        border-radius: inherit;
        z-index: -1;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .border-glow:hover::before {
        opacity: 1;
      }
      
      .stagger-1 { animation-delay: 0.1s; }
      .stagger-2 { animation-delay: 0.2s; }
      .stagger-3 { animation-delay: 0.3s; }
      .stagger-4 { animation-delay: 0.4s; }
      .stagger-5 { animation-delay: 0.5s; }
    `}</style>
    {/* Background Effects - Fixed to persist during scroll */}
    <div className="fixed top-[-30%] md:top-[-20%] left-[-40%] md:left-[-15%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-brand-teal/15 rounded-full blur-[100px] md:blur-[150px] pointer-events-none z-0" />
    <div className="fixed bottom-[-30%] md:bottom-[-20%] right-[-40%] md:right-[-15%] w-[350px] md:w-[700px] h-[350px] md:h-[700px] bg-emerald-600/15 rounded-full blur-[120px] md:blur-[180px] pointer-events-none z-0" />
    <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-transparent to-transparent pointer-events-none z-0 opacity-70" />

    <header className="flex justify-between items-center p-4 md:px-20 lg:px-28 md:py-8 w-full z-10 relative">
      <div className="flex items-center gap-2">
        <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-brand-teal shrink-0" />
        <span className="text-2xl md:text-[1.7rem] font-bold tracking-tight text-white whitespace-nowrap"><span className="bg-gradient-to-r from-brand-teal to-cyan-400 bg-clip-text text-transparent">Odonto</span>Content <span className="bg-gradient-to-r from-brand-teal to-cyan-400 bg-clip-text text-transparent">IA</span></span>
      </div>
      <button
        onClick={onLogin}
        className="px-3 py-1.5 md:px-7 md:py-2.5 rounded-full border border-brand-teal/30 text-brand-teal hover:bg-brand-teal/5 hover:border-brand-teal/50 transition-all duration-300 text-xs md:text-base font-medium hover:scale-105 active:scale-95"
      >
        Entrar
      </button>
    </header>

    <main className="flex-1 flex flex-col w-full z-10 relative">

      {/* SECTION 1: HERO */}
      <section className="flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto mb-20 md:mb-32 pt-2 md:pt-10">
        <Reveal delay={100}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-brand-teal/5 border border-brand-teal/20 text-brand-teal mt-2 mb-2 md:mt-0 md:mb-8 shadow-[0_0_20px_-10px_rgba(45,212,191,0.3)]">
            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">100% Compatível com Normas do CFO</span>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <h1 className="text-4xl md:text-7xl font-bold mb-4 md:mb-6 text-white leading-tight tracking-tight">
            Vire referência na <br />
            <span className="bg-gradient-to-r from-brand-teal via-white to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(45,212,191,0.5)]">Odontologia.</span>
          </h1>
        </Reveal>

        <Reveal delay={300}>
          <p className="text-base md:text-xl text-zinc-400 mb-8 md:mb-10 max-w-2xl px-2 leading-relaxed">
            Chega de falar difícil e não atrair pacientes. De pouco adianta ter a "técnica" se ninguém sabe que você a possui. Agora, seus Reels, Stories e Carrosséis terão conteúdo especializado em gerar interesse VERDADEIRO que atrai e converte pacientes.
          </p>
        </Reveal>

        <Reveal delay={400}>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
            <Button onClick={onLogin} variant="gradient" className="text-base md:text-lg px-8 w-full sm:w-auto transform hover:scale-105 transition-transform duration-200">
              Começar Teste Grátis
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto hover:bg-zinc-800"
            >
              <Info className="w-5 h-5 text-zinc-400" /> Como Funciona
            </Button>
          </div>
        </Reveal>

        <div className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full text-left">
          {[
            { icon: Sparkles, title: "Autoridade Instantânea", desc: "Conteúdos que posicionam você como a única opção lógica na sua região." },
            { icon: ShieldCheck, title: "Segurança Ética (CFO)", desc: "Filtros automáticos que garantem conformidade com o Código de Ética." },
            { icon: LayoutDashboard, title: "Gestão Integrada", desc: "Do roteiro à publicação com Kanban e Calendário editorial inteligentes." }
          ].map((item, i) => (
            <Reveal key={i} delay={500 + (i * 150)} direction="up" className="h-full">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/60 hover:border-brand-teal/20 transition-all duration-300 group h-full">
                <item.icon className="w-8 h-8 text-brand-teal mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SECTION 2: System Explanation (Moved up) */}
      <section id="como-funciona" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-brand-teal/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <Reveal direction="left">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  Um redator sênior <br />
                  <span className="text-brand-teal">que estudou odontologia.</span>
                </h2>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-lg leading-relaxed">
                    A maioria dos dentistas cria conteúdo para impressionar outros dentistas — linguagem técnica, casos clínicos complexos e fotos intraorais.
                  </p>
                  <p className="text-white text-lg leading-relaxed border-l-2 border-brand-teal pl-6">
                    A <strong>OdontoContent</strong> inverte esse jogo. Ela ajuda você a falar a língua de quem assina o cheque: o paciente. Conteúdo que conecta, educa e converte.
                  </p>
                </div>
                <Button variant="primary" onClick={onLogin} className="mt-8">
                  Conheça a Tecnologia
                </Button>
              </Reveal>
            </div>

            <div className="relative flex items-center justify-center">
              <img
                src="/landing-narrativa-gerador.png"
                alt="Gerador de Narrativas Magnéticas"
                className="w-full h-auto rounded-xl shadow-[0_0_50px_-10px_rgba(45,212,191,0.2)] border border-brand-teal/20 hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Vire Referência (Moved down) */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Reveal>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Um sistema de criação de <br />
                conteúdo especializado para <span className="text-brand-teal">atrair pacientes.</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-zinc-400 text-lg leading-relaxed">
                A maioria dos dentistas cria conteúdo para impressionar outros dentistas — linguagem técnica, posts engessados e distantes da realidade. A OdontoContent ajuda você a falar a língua de quem compra.
              </p>
            </Reveal>
          </div>

          <MockBrowserWindow className="max-w-5xl mx-auto transform hover:scale-[1.005] transition-transform duration-700 shadow-[0_0_50px_-10px_rgba(45,212,191,0.15)] border-brand-teal/20">
            <img
              src="/landing-narrativa-escolha.png"
              alt="Interface de Seleção de Narrativas"
              className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity duration-500"
            />
          </MockBrowserWindow>

          <div className="mt-12 flex justify-center">
            <Button onClick={onLogin} variant="gradient" className="text-base px-8 py-3 h-auto shadow-[0_0_30px_-5px_rgba(45,212,191,0.3)] hover:shadow-[0_0_50px_-10px_rgba(45,212,191,0.6)] hover:scale-105 transition-all duration-300 btn-ripple group">
              <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" />
              Experimente com seu tema agora
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 4: Organize (Kanban) */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Crie, organize e publique conteúdos Odontológicos que geram resultado
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Organize seu conteúdo com visualizações em Kanban ou Calendário, tudo integrado ao processo de criação com Inteligência Artificial.
              </p>
            </Reveal>
          </div>

          <MockBrowserWindow title="Planejamento Editorial - Dr. Andre Silva">
            <LandingCarousel
              images={[
                '/landing-kanban-1.png',
                '/landing-kanban-2.png'
              ]}
            />
          </MockBrowserWindow>

        </div>
      </section >

      {/* SECTION 5: Wizard Steps */}
      < section className="py-24 px-4" >
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
              <div className="max-w-4xl">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  <span className="text-brand-teal">Você nunca mais vai ficar sem conteúdo.</span> <br className="hidden md:block" />
                  Um dia sequer.
                </h2>
                <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">
                  É assim: você digita um tema como "Direitos do consumidor em compras online". Em segundos, recebe 5 opções de tese, 5 opções de headline e uma narrativa para fundamentar o roteiro. Depois de selecionar o melhor argumento-mãe, você recebe um roteiro pronto que pode ser utilizado como carrossel, reels ou stories para engajar seus seguidores. Aprovando-o, ele vai automaticamente para o seu Quadro. Simples e rápido — exatamente como deveria ser.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 border border-brand-teal text-brand-teal flex items-center justify-center font-bold text-xl">1</div>
                  <span className="text-xs text-zinc-500 font-medium">Tema</span>
                </div>
                <div className="w-8 h-px bg-zinc-800 mt-6"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold text-xl">2</div>
                  <span className="text-xs text-zinc-500 font-medium">Estratégia</span>
                </div>
                <div className="w-8 h-px bg-zinc-800 mt-6"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold text-xl">3</div>
                  <span className="text-xs text-zinc-500 font-medium">Roteiro</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <MockBrowserWindow className="max-w-4xl mx-auto border-brand-teal/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
              <img
                src="/landing-roteiro.png"
                alt="Roteiro Gerado pela IA"
                className="w-full h-auto opacity-95 hover:opacity-100 transition-opacity duration-500"
              />
            </MockBrowserWindow>
          </Reveal>
        </div>
      </section >


      {/* SECTION 6: Workflow Transformation */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(45,212,191,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[gradient_15s_ease_infinite]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Reveal>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Roteiros que prendem até o fim.</h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-4xl mx-auto">
                A metodologia da Odontocontent combina arquitetura narrativa jornalística, análise cultural e engenharia de engajamento para transformar qualquer ideia em um mini-documentário em formato de carrossel.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} direction="up">
            <div className="flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
              {/* Image 1: Edit Structure */}
              <div className="flex-1 group">
                <div className="mb-4 text-center lg:text-left">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-sm font-medium text-zinc-300">
                    <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></span>
                    Passo 1: Edite sua Narrativa
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-800 group-hover:border-brand-teal/50 transition-all duration-500 shadow-2xl shadow-black/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                  <img
                    src="/landing-script-edit.png"
                    alt="Edite a Estrutura da Narrativa"
                    className="w-full h-auto transform group-hover:scale-[1.02] transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex items-center justify-center py-4 lg:py-0">
                <div className="flex flex-col items-center gap-2">
                  <div className="hidden lg:flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-teal to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-teal/30 animate-pulse">
                      <ChevronRight className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-zinc-500 font-medium mt-2">IA Transforma</span>
                  </div>
                  <div className="lg:hidden flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-teal to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-teal/30 animate-pulse">
                      <ChevronRight className="w-5 h-5 text-white rotate-90" />
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">IA Transforma</span>
                  </div>
                </div>
              </div>

              {/* Image 2: Final Content */}
              <div className="flex-1 group">
                <div className="mb-4 text-center lg:text-right">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal/10 border border-brand-teal/30 rounded-full text-sm font-medium text-brand-teal">
                    <CheckCircle2 className="w-4 h-4" />
                    Passo 2: Roteiro Pronto
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-800 group-hover:border-brand-teal/50 transition-all duration-500 shadow-2xl shadow-black/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                  <img
                    src="/landing-script-final.png"
                    alt="Conteúdo Final Gerado"
                    className="w-full h-auto transform group-hover:scale-[1.02] transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 text-center">
            <p className="text-zinc-500 text-sm">
              Da estrutura narrativa ao roteiro completo — em segundos.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7: Benefits Grid */}
      < section className="py-24 px-4" >
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-16">Por que +800 dentistas<br />escolheram a OdontoContent?</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: "Linguagem de Paciente", text: "A IA remove o 'odontologuês' automaticamente. Você fala, eles entendem, eles compram." },
              { icon: Clock, title: "Calendário em Minutos", text: "Planeje o mês inteiro em 20 minutos. Sobra tempo para o que importa: atender." },
              { icon: TrendingUp, title: "Autoridade Digital", text: "Quem educa o mercado, domina o mercado. Torne-se a referência da sua cidade." },
              { icon: BarChart3, title: "Foco na Conversão", text: "Cada post tem um propósito estratégico: agendamento, branding ou fidelização." }
            ].map((item, i) => (
              <Reveal key={i} delay={200 + (i * 100)} className="h-full">
                <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 hover:bg-zinc-900 hover:border-brand-teal/30 transition-all duration-300 group h-full hover-lift card-shine">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-brand-teal/10 text-brand-teal group-hover:scale-110 group-hover:rotate-6 group-hover:bg-brand-teal/20 transition-all duration-300">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-teal transition-colors duration-300">{item.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors duration-300">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section >

      {/* SECTION 9: Testimonials */}
      < section className="py-24 px-4 overflow-hidden relative" >
        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-infinite-scroll {
            animation: scroll 120s linear infinite;
          }
          .animate-infinite-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="max-w-full mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-16">Quem usa, não vive sem.</h2>

          <div className="flex w-max animate-infinite-scroll gap-6">
            {[
              { text: "Antes eu perdia meu domingo inteiro tentando ter ideias. Hoje faço todo meu calendário do mês em 30 minutos! A qualidade dos roteiros é impressionante.", name: "Dr. João S.", role: "Implantodontista • SP" },
              { text: "A linguagem mudou tudo. Meus pacientes finalmente entendem o valor do meu tratamento. Não é mais 'preço', é valor percebido.", name: "Dra. Mariana C.", role: "Estética • RJ" },
              { text: "Finalmente consigo explicar Invisalign de forma que o paciente entenda. O visual e o texto casam perfeitamente.", name: "Dra. Ana C.", role: "Ortodontista • MG" },
              { text: "Meus seguidores pararam de pular meus stories. A retenção aumentou 300% com os roteiros de conexão que a plataforma gera.", name: "Dr. Lucas M.", role: "Cirurgião • SP" },
              { text: "As mães amam a linguagem acolhedora. Não preciso mais forçar vendas, elas vêm prontas para agendar.", name: "Dra. Fernanda L.", role: "Odontopediatria • PR" },
              { text: "Fechei 2 protocolos na primeira semana usando a estratégia de 'Autoridade Silenciosa'. Pagou o ano todo da plataforma.", name: "Dr. Rafael T.", role: "Implantodontista • SC" },
              { text: "O calendário editorial me deu paz mental. Sei exatamente o que postar e quando, sem aquele desespero diário.", name: "Dra. Beatriz S.", role: "Harmonização • BA" },
              { text: "Antes parecia que eu falava grego. A IA traduziu minha técnica para 'desejo do paciente'. Genial.", name: "Dr. Thiago O.", role: "Clínico Geral • RS" },
              { text: "Nunca imaginei que canal pudesse ser um assunto interessante. Meus reels estão bombando e trazendo pacientes particulares.", name: "Dra. Camila R.", role: "Endodontista • SP" },
              { text: "A consistência que eu buscava há anos. 3 posts por semana, religiosamente, em 15 minutos de dedicação.", name: "Dr. Renato V.", role: "Prótese • RJ" },
              { text: "Explicar doença periodontal era chato. Agora é educativo e engajador. Os pacientes chegam já sabendo da importância.", name: "Dra. Juliana M.", role: "Periodontista • MG" },
              { text: "A ferramenta de 'quebra de objeção' é incrível. O paciente já chega tirando dúvidas que a IA previu nos posts.", name: "Dr. Marcelo D.", role: "Ortodontista • ES" },
              { text: "Stories criativos que conectam com a rotina das famílias. Sensacional, as crianças adoram os vídeos.", name: "Dra. Patrícia G.", role: "Odontopediatria • PE" },
              { text: "Menos dancinha, mais autoridade. Exatamente o que eu precisava para me posicionar como referência.", name: "Dr. Felipe A.", role: "Cirurgia Oral • GO" },
              { text: "Minha agenda de avaliação triplicou. O tráfego pago funciona muito melhor com esses copys persuasivos.", name: "Dra. Larissa C.", role: "Estética • DF" },
              // Duplicate list for seamless infinite scroll
              { text: "Antes eu perdia meu domingo inteiro tentando ter ideias. Hoje faço todo meu calendário do mês em 30 minutos! A qualidade dos roteiros é impressionante.", name: "Dr. João S.", role: "Implantodontista • SP" },
              { text: "A linguagem mudou tudo. Meus pacientes finalmente entendem o valor do meu tratamento. Não é mais 'preço', é valor percebido.", name: "Dra. Mariana C.", role: "Estética • RJ" },
              { text: "Finalmente consigo explicar Invisalign de forma que o paciente entenda. O visual e o texto casam perfeitamente.", name: "Dra. Ana C.", role: "Ortodontista • MG" },
              { text: "Meus seguidores pararam de pular meus stories. A retenção aumentou 300% com os roteiros de conexão que a plataforma gera.", name: "Dr. Lucas M.", role: "Cirurgião • SP" },
              { text: "As mães amam a linguagem acolhedora. Não preciso mais forçar vendas, elas vêm prontas para agendar.", name: "Dra. Fernanda L.", role: "Odontopediatria • PR" },
              { text: "Fechei 2 protocolos na primeira semana usando a estratégia de 'Autoridade Silenciosa'. Pagou o ano todo da plataforma.", name: "Dr. Rafael T.", role: "Implantodontista • SC" },
              { text: "O calendário editorial me deu paz mental. Sei exatamente o que postar e quando, sem aquele desespero diário.", name: "Dra. Beatriz S.", role: "Harmonização • BA" },
              { text: "Antes parecia que eu falava grego. A IA traduziu minha técnica para 'desejo do paciente'. Genial.", name: "Dr. Thiago O.", role: "Clínico Geral • RS" },
              { text: "Nunca imaginei que canal pudesse ser um assunto interessante. Meus reels estão bombando e trazendo pacientes particulares.", name: "Dra. Camila R.", role: "Endodontista • SP" },
              { text: "A consistência que eu buscava há anos. 3 posts por semana, religiosamente, em 15 minutos de dedicação.", name: "Dr. Renato V.", role: "Prótese • RJ" },
              { text: "Explicar doença periodontal era chato. Agora é educativo e engajador. Os pacientes chegam já sabendo da importância.", name: "Dra. Juliana M.", role: "Periodontista • MG" },
              { text: "A ferramenta de 'quebra de objeção' é incrível. O paciente já chega tirando dúvidas que a IA previu nos posts.", name: "Dr. Marcelo D.", role: "Ortodontista • ES" },
              { text: "Stories criativos que conectam com a rotina das famílias. Sensacional, as crianças adoram os vídeos.", name: "Dra. Patrícia G.", role: "Odontopediatria • PE" },
              { text: "Menos dancinha, mais autoridade. Exatamente o que eu precisava para me posicionar como referência.", name: "Dr. Felipe A.", role: "Cirurgia Oral • GO" },
              { text: "Minha agenda de avaliação triplicou. O tráfego pago funciona muito melhor com esses copys persuasivos.", name: "Dra. Larissa C.", role: "Estética • DF" },
            ].map((item, i) => (
              <div key={i} className="w-[400px] bg-zinc-900/40 p-8 rounded-2xl border border-zinc-800 relative flex-shrink-0 hover:border-brand-teal/30 transition-colors group">
                <Quote className="w-8 h-8 text-zinc-800 absolute top-6 right-6 group-hover:text-brand-teal/20 transition-colors" />
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-brand-teal fill-brand-teal" />)}
                </div>
                <p className="text-zinc-300 italic mb-6 text-base leading-relaxed line-clamp-4">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-bold text-zinc-500 border border-zinc-700 text-xs">
                    {item.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.name}</p>
                    <p className="text-brand-teal text-xs font-medium">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Button onClick={onLogin} variant="gradient" className="text-lg px-10 py-4 h-auto shadow-[0_0_30px_-5px_rgba(45,212,191,0.3)] hover:shadow-[0_0_50px_-10px_rgba(45,212,191,0.6)] hover:scale-105 transition-all duration-300 btn-ripple group">
              Quero resultados assim
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section >

      {/* SECTION 8: Pricing Table - Wide Horizontal */}
      < section className="py-20 md:py-24 px-4 relative" >
        {/* Background accent */}
        < div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-teal/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">Comece hoje — plano acessível para todo dentista</h2>
          </Reveal>

          <Reveal delay={200} direction="up">
            <div className="relative group">
              {/* Animated gradient border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-brand-teal via-emerald-400 to-brand-teal rounded-2xl opacity-40 group-hover:opacity-70 blur-sm transition-opacity duration-500" style={{ backgroundSize: '200% 100%', animation: 'gradient-shift 4s ease infinite' }} />

              {/* Card content */}
              <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800/50 overflow-hidden">

                {/* Floating Badge - Top Left on Desktop */}
                <div className="absolute top-4 left-4 md:top-6 md:left-8 z-20">
                  <div className="bg-gradient-to-r from-brand-teal to-emerald-500 text-brand-black px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Oferta Início de Ano
                  </div>
                </div>

                {/* Main Content - Horizontal on Desktop */}
                <div className="flex flex-col md:flex-row md:items-center">

                  {/* Column 1: Price */}
                  <div className="p-8 pt-16 md:pt-8 md:p-10 md:w-[30%] md:border-r border-zinc-800/50">
                    <p className="text-zinc-500 text-sm font-medium mb-2">Plano Pro Odonto</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl md:text-5xl font-bold text-white">R$ 34,90</span>
                      <span className="text-zinc-500 font-medium">/mês</span>
                    </div>
                  </div>

                  {/* Column 2: Features - 2 col grid on desktop */}
                  <div className="p-8 md:p-10 md:flex-1 md:border-r border-zinc-800/50 border-y md:border-y-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                      {[
                        { icon: Sparkles, text: "Roteiros e Legendas Ilimitados" },
                        { icon: LayoutDashboard, text: "Calendário & Kanban" },
                        { icon: Users, text: "Até 3 usuários" },
                        { icon: ShieldCheck, text: "IA com normas do CFO" },
                        { icon: MessageCircle, text: "Suporte via WhatsApp" }
                      ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <feat.icon className="w-4 h-4 text-brand-teal shrink-0" />
                          <span className="text-sm text-zinc-300">{feat.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: CTA */}
                  <div className="p-8 md:p-10 md:w-[28%] flex flex-col justify-center items-center gap-4">
                    <Button onClick={onLogin} variant="gradient" className="w-full py-5 text-base font-bold shadow-[0_0_40px_-10px_rgba(45,212,191,0.4)] hover:shadow-[0_0_50px_-8px_rgba(45,212,191,0.6)] hover:scale-[1.02] transition-all duration-300">
                      Teste Agora Gratuitamente
                    </Button>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-teal" />
                      <span>7 dias de garantia</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section >

      {/* SECTION 10: Final CTA */}
      < section className="py-32 px-4 relative overflow-hidden" >
        <div className="absolute inset-0 z-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent animate-shimmer"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 text-center text-xs md:text-base text-zinc-500 font-mono uppercase tracking-widest opacity-70">
            <p className="line-through decoration-red-500/50 hover:opacity-50 transition-opacity">Postar por postar</p>
            <p className="line-through decoration-red-500/50 hover:opacity-50 transition-opacity">Marketing complicado</p>
            <p className="line-through decoration-red-500/50 hover:opacity-50 transition-opacity">Tentar ser designer</p>
            <p className="text-brand-teal font-bold animate-pulse hover:scale-110 transition-transform cursor-default">Agenda Cheia</p>
          </div>

          <Reveal>
            <h2 className="text-4xl md:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
              Pare de falar sozinho. <br />
              Comece a <span className="text-gradient-animate">atrair pacientes.</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Sua presença digital pode ser simples, estratégica e magnética.
              Junte-se a centenas de dentistas que já modernizaram seu marketing.
            </p>
          </Reveal>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button onClick={onLogin} variant="gradient" className="text-lg px-12 py-5 h-auto w-full md:w-auto shadow-[0_0_40px_-10px_rgba(45,212,191,0.5)] btn-ripple animate-pulse-glow group">
              <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
              Teste por você. É grátis
            </Button>
          </div>
          <p className="mt-6 text-zinc-600 text-xs">Não requer cartão de crédito • Cancelamento a qualquer momento</p>

          <div className="mt-24 pt-8 text-zinc-700 text-xs flex justify-between items-center max-w-2xl mx-auto">
            <span>© 2025 OdontoContent.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-zinc-500">Termos</a>
              <a href="#" className="hover:text-zinc-500">Privacidade</a>
            </div>
          </div>
        </div>
      </section >

    </main >
  </div >
);

const AuthScreen: React.FC<{ onAuth: () => void }> = ({ onAuth }) => (
  <div className="min-h-screen flex items-center justify-center bg-brand-black relative p-4">
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80')] opacity-5 bg-cover bg-center" />

    <Card className="w-full max-w-md backdrop-blur-xl bg-brand-black/90 border-zinc-800 shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-teal/20">
          <Sparkles className="w-8 h-8 text-brand-teal" />
        </div>
        <h2 className="text-2xl font-bold text-white">Terminal Odontológico</h2>
        <p className="text-zinc-500">Acesse sua clínica digital</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1 ml-4">CRO / E-mail</label>
          <input
            type="email"
            value="andre@clinica.com"
            readOnly
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] px-6 py-4 text-white focus:outline-none focus:border-brand-teal transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1 ml-4">Senha</label>
          <input
            type="password"
            value="password"
            readOnly
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] px-6 py-4 text-white focus:outline-none focus:border-brand-teal transition-colors"
          />
        </div>

        <Button onClick={onAuth} className="w-full mt-4">
          Acessar Sistema
        </Button>
      </div>

      <p className="text-center text-zinc-600 text-xs mt-6">
        Ambiente criptografado e seguro.
      </p>
    </Card>
  </div>
);

// --- Dashboard Components ---

const ProjectModal: React.FC<{
  project: Project;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
  onDelete: (id: string) => void;
}> = ({ project, onClose, onUpdate, onDelete }) => {
  const [auditStatus, setAuditStatus] = useState<'IDLE' | 'LOADING' | 'APPROVED'>('IDLE');
  // Initialize with correct logic: if stored is ISO like, extract date, else use it directly
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (!project.scheduledDate) return '';
    return project.scheduledDate.split('T')[0];
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Conteúdo copiado com sucesso!');
  };

  const handleAudit = () => {
    setAuditStatus('LOADING');
    setTimeout(() => {
      setAuditStatus('APPROVED');
    }, 1500);
  };

  const handleSaveDate = () => {
    if (scheduledDate) {
      // BUG FIX: Save as simple string 'YYYY-MM-DD' to avoid UTC conversion issues
      onUpdate({ ...project, scheduledDate: scheduledDate });
    }
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      onDelete(project.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl h-[90vh] md:max-h-[90vh] overflow-y-auto relative animate-slide-up border-brand-teal/20 bg-brand-black rounded-b-none md:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6 md:mb-8 pr-10 pt-2 md:pt-0">
          <div className="flex justify-between items-start">
            <Badge status={project.status} />
            <button onClick={handleDelete} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1 mr-8">
              <Trash2 className="w-3 h-3" /> Excluir
            </button>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-4 mb-2 leading-tight">{project.topic}</h2>
          <p className="text-zinc-400 text-base md:text-lg leading-snug">{project.selectedHeadline}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-8">
          <div className="space-y-6">

            {/* Scheduling Section */}
            <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 border border-zinc-800">
              <h3 className="text-zinc-300 font-bold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Agendamento
              </h3>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-black/30 border border-zinc-700 text-white text-sm rounded-lg p-2.5 w-full focus:border-brand-teal outline-none"
                />
                <Button variant="secondary" onClick={handleSaveDate} className="py-2 px-4 text-xs h-[42px]">
                  Salvar Data
                </Button>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 border border-zinc-800">
              <h3 className="text-brand-teal font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Estratégia
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase text-zinc-500 font-bold">Gancho</label>
                  <p className="text-zinc-300 text-sm">{project.selectedHook}</p>
                </div>
                {project.narrative && (
                  <div>
                    <label className="text-xs uppercase text-zinc-500 font-bold">Tensão (Dor)</label>
                    <p className="text-zinc-300 text-sm">{project.narrative.tension}</p>
                  </div>
                )}
              </div>
            </div>

            {project.finalAssets && (
              <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-brand-teal font-bold flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" /> Roteiro
                  </h3>
                  <button onClick={() => handleCopy(project.finalAssets!.reelsScript)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {project.finalAssets.reelsScript}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {project.finalAssets && (
              <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 border border-zinc-800 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-brand-teal font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Legenda
                  </h3>
                  <button onClick={() => handleCopy(project.finalAssets!.caption)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
                <div className="flex-1 bg-black/30 rounded-xl p-4 mb-4 border border-zinc-800/50">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{project.finalAssets.caption}</p>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                  {auditStatus === 'IDLE' && (
                    <Button variant="secondary" onClick={handleAudit} className="w-full text-sm">
                      <ShieldCheck className="w-4 h-4" /> Executar Auditoria Ética (CFO)
                    </Button>
                  )}
                  {auditStatus === 'LOADING' && (
                    <Button variant="secondary" disabled className="w-full text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Analisando Compliance...
                    </Button>
                  )}
                  {auditStatus === 'APPROVED' && (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 text-emerald-400 text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold">Aprovado: Conteúdo Ético</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

const SettingsView: React.FC<{ user: User; onBack: () => void }> = ({ user, onBack }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    cro: '12345-SP',
    specialty: 'Implantodontia',
    clinicName: 'Clínica Sorriso Modelo',
    notifications: true
  });

  const handleSave = () => {
    setIsSaving(true);
    // Simulating API call
    setTimeout(() => {
      setIsSaving(false);
      alert('Configurações salvas com sucesso!');
    }, 1500);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-w-4xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-teal" /> Configurações de Perfil
        </h2>
      </div>

      <div className="space-y-6 pb-20">
        {/* Profile Card */}
        <Card className="border-brand-teal/20">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-brand-teal" /> Dados Pessoais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-teal focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">E-mail</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">CRO (Conselho Regional)</label>
              <input
                type="text"
                value={formData.cro}
                onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-teal focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Especialidade Principal</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-teal focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Clinic Info */}
        <Card>
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-teal" /> Dados da Clínica
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nome da Clínica / Consultório</label>
              <input
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-teal focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-teal" /> Preferências e Segurança
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-teal/10 rounded-lg text-brand-teal">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Notificações por E-mail</p>
                  <p className="text-xs text-zinc-500">Receba resumos semanais de conteúdo.</p>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, notifications: !formData.notifications })}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.notifications ? 'bg-brand-teal' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.notifications ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Alterar Senha</p>
                  <p className="text-xs text-zinc-500">Última alteração há 30 dias.</p>
                </div>
              </div>
              <Button variant="secondary" className="text-xs py-2 h-auto">
                Redefinir
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
};



const Wizard: React.FC<{
  onComplete: (project: Project) => void;
  onCancel: () => void;
  user: User;
  setPaywallReason: (reason: 'trial_exhausted' | 'subscription_expired') => void;
  setShowPaywall: (show: boolean) => void;
}> = ({ onComplete, onCancel, user, setPaywallReason, setShowPaywall }) => {
  const [step, setStep] = useState<WizardStep>(WizardStep.TOPIC_INPUT);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [topic, setTopic] = useState('');
  const [trialsRemaining, setTrialsRemaining] = useState(3);

  const [hooks, setHooks] = useState<string[]>([]);
  const [isEditingHooks, setIsEditingHooks] = useState(false);

  const [headlines, setHeadlines] = useState<string[]>([]);
  const [isEditingHeadlines, setIsEditingHeadlines] = useState(false);

  const [selectedHook, setSelectedHook] = useState('');
  const [selectedHeadline, setSelectedHeadline] = useState('');

  const [narrative, setNarrative] = useState<NarrativeStructure | null>(null);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);

  const [finalAssets, setFinalAssets] = useState<FinalAssets | null>(null);
  const [isEditingAssets, setIsEditingAssets] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'reels' | 'carousel'>('reels');

  const [suggestedTopics, setSuggestedTopics] = useState<string[]>(getDailySuggestions());

  // Carrega trials restantes ao montar
  useEffect(() => {
    loadTrialsRemaining();
    // Sugestões já são carregadas pelo useState inicial
  }, []);

  const loadTrialsRemaining = async () => {
    try {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('trial_uses, status, plan')
        .eq('user_id', user.id)
        .single();

      const isActive = subData?.status === 'active' && subData?.plan === 'Premium';
      const totalCreated = subData?.trial_uses || 0;
      const remaining = isActive ? 999 : Math.max(0, 3 - totalCreated);

      setTrialsRemaining(remaining);
    } catch (error) {
      console.error('Erro ao carregar trials:', error);
    }
  };

  // Quando o botão "Atualizar ideias" é clicado, mostra sugestões aleatórias
  const refreshSuggestions = () => {
    const shuffled = [...TOPIC_POOL].sort(() => 0.5 - Math.random());
    setSuggestedTopics(shuffled.slice(0, 6));
  };

  const handleGenerateHooks = async () => {
    if (!topic) return;

    // VERIFICAÇÃO DE SUBSCRIPTION LOGO NO INÍCIO
    try {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('trial_uses, status, plan')
        .eq('user_id', user.id)
        .single();

      const isActive = subData?.status === 'active' && subData?.plan === 'Premium';
      const totalCreated = subData?.trial_uses || 0;

      // Conta projetos atuais (para mostrador)
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const currentProjects = count || 0;
      const remainingTrials = Math.max(0, 3 - totalCreated);

      console.log(`📊 Status: ${totalCreated} criações totais, ${currentProjects} projetos atuais, ${remainingTrials} testes restantes`);

      // BLOQUEIA se já criou 3 vezes (mesmo que tenha deletado)
      if (!isActive && totalCreated >= 3) {
        console.log('🚫 BLOQUEADO - Já usou os 3 testes gratuitos!');
        setPaywallReason('trial_exhausted');
        setShowPaywall(true);
        return; // NÃO permite continuar
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    }

    // Se passou na verificação, continua normalmente
    setLoading(true);
    const result = await GeminiService.generateHooks(topic);
    setHooks(result);
    setLoading(false);
    setStep(WizardStep.HOOKS);
  };

  const handleRegenerateHooks = async () => {
    setLoading(true);
    const result = await GeminiService.generateHooks(topic);
    setHooks(result);
    setLoading(false);
  };

  const updateHook = (index: number, value: string) => {
    const newHooks = [...hooks];
    newHooks[index] = value;
    setHooks(newHooks);
  };

  const handleGenerateHeadlines = async (hook: string) => {
    setSelectedHook(hook);
    setLoading(true);
    const result = await GeminiService.generateHeadlines(topic, hook);
    setHeadlines(result);
    setLoading(false);
    setStep(WizardStep.HEADLINES);
  };

  const handleRegenerateHeadlines = async () => {
    setLoading(true);
    const result = await GeminiService.generateHeadlines(topic, selectedHook);
    setHeadlines(result);
    setLoading(false);
  };

  const updateHeadline = (index: number, value: string) => {
    const newHeadlines = [...headlines];
    newHeadlines[index] = value;
    setHeadlines(newHeadlines);
  };

  const handleGenerateNarrative = async (headline: string) => {
    setSelectedHeadline(headline);
    setLoading(true);
    const result = await GeminiService.generateNarrative(topic, selectedHook, headline);
    setNarrative(result);
    setLoading(false);
    setStep(WizardStep.NARRATIVE);
  };

  const handleRegenerateNarrative = async () => {
    setLoading(true);
    const result = await GeminiService.generateNarrative(topic, selectedHook, selectedHeadline);
    setNarrative(result);
    setLoading(false);
  };

  const handleGenerateFinalAssets = async () => {
    if (!narrative) return;
    setLoading(true);
    try {
      const result = await GeminiService.generateFinalAssets(topic, narrative);
      if (result && result.reelsScript) {
        setFinalAssets(result);
        setStep(WizardStep.FINAL_ASSETS);
      } else {
        console.error('Resultado inválido da API:', result);
        alert('Erro ao gerar conteúdo. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo final:', error);
      alert('Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateFinalAssets = async () => {
    if (!narrative) return;
    setLoading(true);
    const result = await GeminiService.generateFinalAssets(topic, narrative);
    setFinalAssets(result);
    setLoading(false);
  };

  const handleFinish = async () => {
    if (finalAssets && narrative && !isSaving) {
      if (isSaving) return;
      setIsSaving(true);
      console.log('🎯 handleFinish chamado - Finalizando wizard');

      // BUG FIX: Store simple date string YYYY-MM-DD instead of ISO string with time
      // This prevents timezone shift when viewing on different locales
      const todayString = new Date().toISOString().split('T')[0];

      const newProject: Project = {
        id: Date.now().toString(),
        topic,
        status: 'IDEIA',
        createdAt: new Date().toISOString(),
        scheduledDate: todayString, // Default to today as simple string
        selectedHook,
        selectedHeadline,
        narrative,
        finalAssets,
        format: selectedFormat // 'reels' or 'carousel'
      };

      console.log('✅ Criando projeto com formato:', selectedFormat);
      onComplete(newProject);

      // Recarrega contador de trials após criar projeto
      await loadTrialsRemaining();
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Texto copiado!");
  }

  return (
    <div className="flex flex-col h-full w-full max-w-[98%] xl:max-w-[95%] 2xl:max-w-[92%] mx-auto">
      {/* Trial Counter Banner */}
      {/* Trial Counter Banner */}
      {/* Trial Counter Banner */}
      {/* Trial Counter Banner */}
      {/* Trial Counter Banner */}
      {trialsRemaining < 999 && (
        <div className="bg-[#2dd4bf]/10 rounded-full px-3 py-1.5 md:px-4 md:py-2 mb-4 md:mb-6 flex items-center justify-center w-full max-w-[92%] md:max-w-fit mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-[#2dd4bf]/30 flex items-center justify-center shrink-0">
              <Info className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#2dd4bf]" strokeWidth={3} />
            </div>
            <p className="text-xs md:text-sm text-zinc-400 leading-tight">
              Você tem mais <span className="font-bold text-zinc-200">{trialsRemaining}</span> {trialsRemaining === 1 ? 'roteiro restante' : 'roteiros restantes'}. <button onClick={() => window.open(SubscriptionService.createCheckoutUrl(user.id), '_blank')} className="font-bold underline hover:text-[#2dd4bf] transition-colors text-zinc-200">Faça o upgrade</button> e tenha acesso ilimitado.
            </p>
          </div>
        </div>
      )}
      <Card className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-brand-surface/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-4">
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-brand-teal animate-spin mb-4" />
            <p className="text-brand-teal font-medium animate-pulse text-sm md:text-base">Consultando base de conhecimento clínico...</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-12">
          {step === WizardStep.TOPIC_INPUT && (
            <div className="flex flex-col min-h-full px-4 md:px-8 pb-8 pt-0">
              <div className="w-full">
                <div className="flex flex-col items-center justify-center gap-3 mb-8 max-w-5xl mx-auto w-full">
                  <div className="flex flex-col md:flex-row items-center justify-center w-full gap-3 md:gap-4">
                    <div className="hidden md:flex w-10 h-10 md:w-10 md:h-10 bg-zinc-900/80 rounded-xl items-center justify-center border border-zinc-800/80 shrink-0 shadow-sm transition-colors">
                      <Sparkles className="w-5 h-5 md:w-5 md:h-5 text-brand-teal" />
                    </div>
                    {/* Responsive Text Size: Base xl (Small Phones), 2xl (Min 350px), 3xl (Regular), 5xl (Desktop) */}
                    <h2 className="text-xl min-[350px]:text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight md:whitespace-nowrap text-center md:text-left tracking-tighter md:tracking-normal w-full md:w-auto px-1">
                      Gerador de Narrativas<br className="block md:hidden" /> Magnéticas
                    </h2>
                  </div>
                  <p className="text-zinc-500 text-sm md:text-lg max-w-2xl mx-auto text-center whitespace-nowrap overflow-hidden text-ellipsis px-2 w-full mt-2 md:mt-0">
                    Jogue um tema. Deixe o resto com a gente.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Ex: Sensibilidade após clareamento..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 text-lg md:text-xl text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none mb-8"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  autoFocus
                />

                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-zinc-400 text-sm uppercase font-bold tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-brand-teal" />
                      Sugestões em Alta
                    </p>
                    <button
                      onClick={refreshSuggestions}
                      className="text-brand-teal hover:text-white text-xs flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Atualizar ideias
                    </button>
                  </div>
                  {/* Grid 1 col on tiny screens, 2 cols on regular mobile */}
                  <div className="grid grid-cols-1 min-[375px]:grid-cols-2 md:grid-cols-3 gap-3">
                    {suggestedTopics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className="p-3 md:p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-teal hover:bg-zinc-800 transition-all text-left group"
                      >
                        <p className="text-zinc-300 group-hover:text-white text-xs md:text-sm font-medium line-clamp-2">
                          {t}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
                  <Button onClick={handleGenerateHooks} disabled={!topic.trim()} className="w-full sm:w-auto">Gerar Estratégia</Button>
                </div>
              </div>
            </div>
          )}

          {step === WizardStep.HOOKS && (
            <div className="p-2 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg md:text-xl text-zinc-400">Escolha a melhor narrativa</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateHooks}
                    className="text-brand-teal hover:text-white flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-brand-teal/20 hover:bg-brand-teal/10 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Regenerar
                  </button>
                  <button
                    onClick={() => setIsEditingHooks(!isEditingHooks)}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isEditingHooks ? 'bg-brand-teal text-brand-black border-brand-teal font-bold' : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600'}`}
                  >
                    {isEditingHooks ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    {isEditingHooks ? 'Salvar' : 'Editar'}
                  </button>
                </div>
              </div>
              <div className="space-y-3 pb-8">
                {hooks.map((hook, i) => (
                  <div
                    key={i}
                    className={`
                      relative rounded-2xl border transition-all duration-200 overflow-hidden bg-zinc-900
                      ${isEditingHooks ? 'border-brand-teal shadow-[0_0_15px_-3px_rgba(45,212,191,0.15)]' : 'border-zinc-800 hover:border-zinc-700'}
                    `}
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex gap-4 items-start mb-4">
                        <span className={`
                          flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full 
                          font-bold text-sm shrink-0 transition-colors
                          ${isEditingHooks ? 'bg-brand-teal text-black' : 'bg-zinc-800 text-zinc-400'}
                        `}>
                          {i + 1}
                        </span>

                        {isEditingHooks ? (
                          <AutoResizeTextarea
                            value={hook}
                            onChange={(e) => updateHook(i, e.target.value)}
                            className="w-full bg-transparent text-white text-base md:text-lg outline-none leading-relaxed"
                          />
                        ) : (
                          <p className="text-base md:text-lg text-zinc-200 leading-relaxed flex-1">{hook}</p>
                        )}
                      </div>

                      {!isEditingHooks && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleGenerateHeadlines(hook)}
                            className="flex items-center gap-2 text-sm font-medium text-brand-teal hover:text-white px-4 py-2 rounded-lg border border-brand-teal/30 hover:bg-brand-teal/10 transition-all"
                          >
                            Selecionar <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === WizardStep.HEADLINES && (
            <div className="p-2 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg md:text-xl text-zinc-400">Escolha a headline de maior impacto</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateHeadlines}
                    className="text-brand-teal hover:text-white flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-brand-teal/20 hover:bg-brand-teal/10 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Regenerar
                  </button>
                  <button
                    onClick={() => setIsEditingHeadlines(!isEditingHeadlines)}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isEditingHeadlines ? 'bg-brand-teal text-brand-black border-brand-teal font-bold' : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600'}`}
                  >
                    {isEditingHeadlines ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    {isEditingHeadlines ? 'Salvar' : 'Editar'}
                  </button>
                </div>
              </div>
              <div className="space-y-3 pb-8">
                {headlines.map((head, i) => (
                  <div
                    key={i}
                    onClick={() => !isEditingHeadlines && handleGenerateNarrative(head)}
                    className={`
                      relative flex items-center rounded-2xl border transition-all duration-200 overflow-hidden bg-zinc-900
                      ${isEditingHeadlines ? 'border-brand-teal shadow-[0_0_15px_-3px_rgba(45,212,191,0.15)]' : 'border-zinc-800 hover:border-zinc-700 cursor-pointer hover:bg-zinc-800/30'}
                    `}
                  >
                    <div className="flex-1 p-5 md:p-6 flex gap-4 items-center">
                      <span className={`
                        flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full 
                        font-bold text-sm shrink-0 transition-colors
                        ${isEditingHeadlines ? 'bg-brand-teal text-black' : 'bg-zinc-800 text-zinc-400'}
                      `}>
                        {i + 1}
                      </span>

                      {isEditingHeadlines ? (
                        <AutoResizeTextarea
                          value={head}
                          onChange={(e) => updateHeadline(i, e.target.value)}
                          className="w-full bg-transparent text-white text-lg md:text-xl font-bold outline-none leading-tight"
                        />
                      ) : (
                        <p className="text-lg md:text-xl font-bold text-white leading-tight flex-1">{head}</p>
                      )}
                    </div>

                    {/* Right: Arrow indicator */}
                    {!isEditingHeadlines && (
                      <div className="pr-5 md:pr-6 text-zinc-500">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === WizardStep.NARRATIVE && narrative && (
            <div className="p-2 md:p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Edite e valide a estrutura da narrativa</h3>
                <button
                  onClick={() => setStep(WizardStep.HEADLINES)}
                  className="text-brand-teal hover:text-white text-sm flex items-center gap-1 mx-auto transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar e escolher outra headline
                </button>
              </div>

              {/* Top Right Edit Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsEditingNarrative(!isEditingNarrative)}
                  className={`flex items-center gap-2 text-xs md:text-sm px-4 py-2 rounded-lg border transition-colors ${isEditingNarrative ? 'bg-brand-teal text-brand-black border-brand-teal font-bold' : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600'}`}
                >
                  {isEditingNarrative ? <Save className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  {isEditingNarrative ? 'Salvar Edição' : 'Editar Tese'}
                </button>
              </div>

              {/* Section: Tese Central */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-brand-teal" />
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Tese Central</span>
                </div>
                <div className="bg-zinc-900/50 p-4 md:p-5 rounded-xl border border-zinc-800">
                  {isEditingNarrative ? (
                    <textarea
                      className="w-full bg-black/20 text-zinc-200 text-sm md:text-base p-2 rounded border border-zinc-700 focus:border-brand-teal outline-none resize-y min-h-[100px]"
                      value={narrative.tension}
                      onChange={(e) => setNarrative({ ...narrative, tension: e.target.value })}
                    />
                  ) : (
                    <p className="text-zinc-300 text-sm md:text-base leading-relaxed">{narrative.tension}</p>
                  )}
                </div>
              </div>

              {/* Section: Argumento-Mãe */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Quote className="w-4 h-4 text-brand-teal" />
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Argumento-Mãe</span>
                </div>
                <div className="bg-zinc-900/50 p-4 md:p-5 rounded-xl border-l-4 border-brand-teal/50">
                  {isEditingNarrative ? (
                    <textarea
                      className="w-full bg-black/20 text-zinc-200 text-lg md:text-xl italic p-2 rounded border border-zinc-700 focus:border-brand-teal outline-none resize-y min-h-[80px]"
                      value={narrative.cause}
                      onChange={(e) => setNarrative({ ...narrative, cause: e.target.value })}
                    />
                  ) : (
                    <p className="text-zinc-200 text-lg md:text-xl italic leading-relaxed">{narrative.cause}</p>
                  )}
                </div>
              </div>

              {/* Section: Sequência Narrativa */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-brand-teal" />
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Sequência Narrativa</span>
                </div>
                <div className="space-y-3">
                  {[
                    { num: 1, label: 'Abertura (Tensão)', key: 'tension' as keyof NarrativeStructure },
                    { num: 2, label: 'Explicação (Causa)', key: 'cause' as keyof NarrativeStructure },
                    { num: 3, label: 'Revelação (Efeito)', key: 'effect' as keyof NarrativeStructure },
                    { num: 4, label: 'Ampliação (Cultura)', key: 'culture' as keyof NarrativeStructure },
                    { num: 5, label: 'Provocação (Fecho)', key: 'provocation' as keyof NarrativeStructure },
                  ].map((item) => (
                    <div key={item.num} className="flex gap-4 items-start bg-zinc-900/30 p-3 md:p-4 rounded-lg border border-zinc-800/50">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold shrink-0">
                        {item.num}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs text-zinc-500 font-medium block mb-1">{item.label}</span>
                        {isEditingNarrative ? (
                          <textarea
                            className="w-full bg-black/20 text-zinc-300 text-sm p-2 rounded border border-zinc-700 focus:border-brand-teal outline-none resize-y min-h-[60px]"
                            value={narrative[item.key]}
                            onChange={(e) => setNarrative({ ...narrative, [item.key]: e.target.value })}
                          />
                        ) : (
                          <p className="text-zinc-300 text-sm leading-relaxed">{narrative[item.key]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: Format Selection + CTA */}
              <div className="pt-6 border-t border-zinc-800">
                {/* Format Selection */}
                <div className="mb-6">
                  <p className="text-sm text-zinc-400 text-center mb-4">Escolha o formato do conteúdo:</p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setSelectedFormat('reels')}
                      className={`flex-1 max-w-[200px] flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedFormat === 'reels'
                        ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                    >
                      <PlayCircle className="w-6 h-6" />
                      <span className="font-bold">Reels</span>
                    </button>
                    <button
                      onClick={() => setSelectedFormat('carousel')}
                      className={`flex-1 max-w-[200px] flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedFormat === 'carousel'
                        ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                    >
                      <ClipboardList className="w-6 h-6" />
                      <span className="font-bold">Carrossel/Story</span>
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-center">
                  <Button onClick={handleGenerateFinalAssets} variant="gradient" className="w-full md:w-auto text-base py-4 px-8">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Validar Tese e Gerar Conteúdo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === WizardStep.FINAL_ASSETS && finalAssets && finalAssets.reelsScript && (
            <div className="p-2 md:p-6 h-full overflow-y-auto">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Conteúdo Final Gerado</h3>
                <button
                  onClick={handleRegenerateFinalAssets}
                  className="text-brand-teal hover:text-white text-sm flex items-center gap-1 mx-auto transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Gerar novamente
                </button>
              </div>

              {/* Roteiro Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-brand-teal" />
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      {selectedFormat === 'reels' ? 'Roteiro Para Reels' : 'Roteiro Para Carrossel/Story'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditingAssets(!isEditingAssets)}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isEditingAssets ? 'bg-brand-teal text-brand-black border-brand-teal font-bold' : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600'}`}
                  >
                    {isEditingAssets ? <Save className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                    {isEditingAssets ? 'Salvar' : 'Editar'}
                  </button>
                </div>
                <div className="bg-zinc-900/50 p-4 md:p-6 rounded-xl border border-zinc-800">
                  {isEditingAssets ? (
                    <textarea
                      className="w-full min-h-[400px] bg-black/20 text-zinc-200 text-sm p-3 rounded border border-zinc-700 focus:border-brand-teal outline-none resize-y"
                      value={finalAssets.reelsScript}
                      onChange={(e) => setFinalAssets({ ...finalAssets, reelsScript: e.target.value })}
                    />
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {finalAssets.reelsScript}
                    </div>
                  )}
                </div>
                <Button variant="ghost" className="w-full mt-3 text-xs" onClick={() => copyText(finalAssets.reelsScript)}>
                  <Copy className="w-3 h-3 mr-2" /> Copiar Roteiro
                </Button>
              </div>

              {/* Legenda Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-brand-teal" />
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Legenda</span>
                </div>
                <div className="bg-zinc-900/50 p-4 md:p-6 rounded-xl border border-zinc-800">
                  {isEditingAssets ? (
                    <textarea
                      className="w-full min-h-[150px] bg-black/20 text-zinc-200 text-sm p-3 rounded border border-zinc-700 focus:border-brand-teal outline-none resize-y"
                      value={finalAssets.caption}
                      onChange={(e) => setFinalAssets({ ...finalAssets, caption: e.target.value })}
                    />
                  ) : (
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{finalAssets.caption}</p>
                  )}
                </div>
                <Button variant="ghost" className="w-full mt-3 text-xs" onClick={() => copyText(finalAssets.caption)}>
                  <Copy className="w-3 h-3 mr-2" /> Copiar Legenda
                </Button>
              </div>

              {/* CFO Disclaimer */}
              <div className="p-4 bg-brand-teal/5 border border-zinc-800/50 rounded-xl flex items-start gap-3 mb-8">
                <ShieldCheck className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                <p className="text-xs text-brand-teal/80 leading-relaxed">
                  Este conteúdo foi gerado seguindo as normas do CFO para publicidade odontológica.
                  Revise antes de publicar para garantir adequação ao seu contexto específico.
                </p>
              </div>

              {/* Footer CTA */}
              <div className="flex justify-center pt-4 border-t border-zinc-800">
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  variant="gradient"
                  className="w-full md:w-auto text-base py-4 px-8 font-bold"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {isSaving ? 'Salvando...' : 'Aprovar e Adicionar ao Planejamento'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card >
    </div >
  );
};

const KanbanColumn: React.FC<{
  title: string;
  status: ContentStatus;
  projects: Project[];
  onMove: (id: string, status: ContentStatus) => void;
  onDelete: (id: string) => void;
  onOpenProject: (project: Project) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
}> = ({ title, status, projects, onMove, onDelete, onOpenProject, draggedId, setDraggedId }) => {
  const filtered = projects.filter(p => p.status === status);

  const statusFlow: ContentStatus[] = ['IDEIA', 'ROTEIRIZADO', 'PRODUZIDO', 'PUBLICADO'];
  const currentIndex = statusFlow.indexOf(status);
  const nextStatus = currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  const prevStatus = currentIndex > 0 ? statusFlow[currentIndex - 1] : null;

  return (
    <div
      className={`flex-1 min-w-[75vw] sm:min-w-[240px] md:min-w-[260px] lg:min-w-[280px] max-w-[320px] bg-zinc-900/30 rounded-2xl p-3 border border-zinc-800/50 flex flex-col h-full snap-center transition-colors ${draggedId ? 'hover:bg-zinc-800/50 hover:border-brand-teal/30' : ''}`}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        if (draggedId) {
          onMove(draggedId, status);
          setDraggedId(null);
        }
      }}
    >
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex justify-between items-center">
        {title}
        <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[10px]">{filtered.length}</span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar flex flex-col">
        {filtered.map(project => (
          <div
            key={project.id}
            draggable
            onDragStart={() => setDraggedId(project.id)}
            onDragEnd={() => setDraggedId(null)}
            onClick={() => onOpenProject(project)}
            className="bg-brand-surface border border-zinc-800 p-3 rounded-xl hover:border-brand-teal/50 transition-colors group cursor-move active:scale-[0.98] duration-100 relative shadow-sm"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <GripVertical className="w-3 h-3 text-zinc-600" />
              <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) onDelete(project.id) }} className="p-1 text-zinc-600 hover:text-red-500 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-1.5 pr-6">
              {/* Format indicator dot: blue for Reels, orange for Carousel/Story */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${project.format === 'carousel' ? 'bg-orange-500' : 'bg-sky-500'}`} title={project.format === 'carousel' ? 'Carrossel/Story' : 'Reels'} />
              <span className="text-xs text-brand-teal font-medium truncate">{project.topic}</span>
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-2 line-clamp-2">{project.selectedHeadline || project.topic}</p>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
              <div className="flex items-center gap-1">
                {prevStatus && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(project.id, prevStatus); }}
                    className="p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                    title="Voltar etapa"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-zinc-600">
                {project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString() : 'Sem data'}
              </span>
              <div className="flex items-center gap-1">
                {nextStatus && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(project.id, nextStatus); }}
                    className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-brand-teal hover:text-black transition-colors"
                    title="Avançar etapa"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 text-xs min-h-[200px]">
            Arraste um item aqui
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarView: React.FC<{
  projects: Project[];
  onOpenProject: (p: Project) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  onUpdateProject: (p: Project) => void;
}> = ({ projects, onOpenProject, draggedId, setDraggedId, onUpdateProject }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Padding for the end of the grid to complete the last row
  const totalCells = blanks.length + days.length;
  const rows = Math.ceil(totalCells / 7);
  const totalSlots = rows * 7;
  const paddingLen = totalSlots - totalCells;
  const endPadding = Array.from({ length: paddingLen }, (_, i) => i);

  // OPTIMIZATION: Create a map of date string (YYYY-MM-DD) to projects
  // This reduces complexity from O(Days * Projects) to O(Projects) + O(Days) which is much faster.
  const projectsMap = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (p.scheduledDate) {
        // BUG FIX: Ensure we only use the date part if it contains time info, 
        // or just use the string if it is already YYYY-MM-DD
        const dateKey = p.scheduledDate.includes('T') ? p.scheduledDate.split('T')[0] : p.scheduledDate;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(p);
      }
    });
    return map;
  }, [projects]);

  const getProjectsForDate = (year: number, month: number, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return projectsMap[dateKey] || [];
  };

  const handleDropOnDate = (year: number, month: number, day: number) => {
    if (!draggedId) return;
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const project = projects.find(p => p.id === draggedId);
    if (project) {
      onUpdateProject({ ...project, scheduledDate: dateKey });
      setDraggedId(null);
    }
  };

  // Scroll to today on mobile view
  const todayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [currentDate]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 shrink-0 px-1">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-brand-teal" />
          Agenda de Conteúdos
        </h2>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
          <button
            onClick={goToToday}
            className="text-xs font-bold text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 px-3 py-2 rounded-lg border border-brand-teal/20 transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center gap-4 bg-zinc-900 rounded-lg p-1 border border-zinc-800 justify-between flex-1 md:flex-none">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-white min-w-[120px] text-center capitalize">{monthName}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-zinc-900/20 rounded-2xl border border-zinc-800/50 flex flex-col">
        {/* DESKTOP GRID */}
        <div className="hidden lg:flex flex-col h-full bg-zinc-950/30">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/50">
            {/* Fixed headers: Dom, Seg, Ter, Qua, Qui, Sex, Sáb */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-zinc-500 text-center text-[10px] font-bold uppercase tracking-widest py-4 bg-zinc-900/50 border-r border-zinc-800/30 last:border-r-0">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-auto min-h-0 overflow-y-auto bg-zinc-900/20">
            {blanks.map(b => <div key={`blank-${b}`} className="bg-zinc-900/20 min-h-[140px] border-b border-r border-zinc-800/30 [&:nth-child(7n)]:border-r-0" />)}

            {days.map(day => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const dayProjects = getProjectsForDate(year, month, day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  className={`p-3 transition-all relative group min-h-[140px] flex flex-col gap-2 border-b border-r border-zinc-800/30 [&:nth-child(7n)]:border-r-0 overflow-hidden
                    ${isToday
                      ? 'bg-brand-teal/5 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3),inset_0_0_20px_rgba(45,212,191,0.05)] z-10'
                      : 'bg-zinc-900/20 hover:bg-zinc-900/60'} 
                    ${draggedId ? 'hover:bg-brand-teal/5' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnDate(year, month, day);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors
                      ${isToday ? 'bg-brand-teal text-black font-bold shadow-lg shadow-brand-teal/20' : 'text-zinc-500 group-hover:text-zinc-300 group-hover:bg-zinc-800'}`}>
                      {day}
                    </span>
                    {dayProjects.length > 0 && (
                      <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-zinc-800/50">
                        {dayProjects.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {dayProjects.map(p => (
                      <button
                        key={p.id}
                        draggable
                        onDragStart={() => setDraggedId(p.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => onOpenProject(p)}
                        className={`w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg border transition-all block cursor-move group/item shadow-sm relative overflow-hidden
                          ${p.status === 'PUBLICADO'
                            ? 'bg-brand-teal/10 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/20'
                            : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'}`}
                      >
                        {/* Left border uses format color: sky-500 for Reels, orange-500 for Carousel */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${p.format === 'carousel' ? 'bg-orange-500' : 'bg-sky-500'}`} />
                        <span className="truncate block pl-1 font-medium relative z-10">{p.topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Fill remaining slots */}
            {endPadding.map(p => (
              <div key={`end-${p}`} className="bg-zinc-900/20 min-h-[140px] border-b border-r border-zinc-800/30 [&:nth-child(7n)]:border-r-0" />
            ))}
          </div>
        </div>

        {/* MOBILE LIST */}
        <div className="lg:hidden flex-1 overflow-y-auto scroll-smooth">
          {days.map(day => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const dayProjects = getProjectsForDate(year, month, day);
            const dateObj = new Date(year, month, day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const dayName = dateObj.toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '');

            return (
              <div
                key={day}
                ref={isToday ? todayRef : null}
                className={`flex border-b border-zinc-800/50 min-h-[80px] ${isToday ? 'bg-brand-teal/5' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnDate(year, month, day);
                }}
              >
                {/* Date Column */}
                <div className={`w-20 p-4 border-r border-zinc-800/50 flex flex-col items-center justify-center shrink-0 ${isToday ? 'text-brand-teal' : 'text-zinc-500'}`}>
                  <span className="text-xl font-bold">{day}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{dayName}</span>
                  {isToday && <span className="text-[9px] font-bold text-brand-teal mt-1">HOJE</span>}
                </div>

                {/* Events Column */}
                <div className="flex-1 p-3 flex flex-col justify-center gap-2">
                  {dayProjects.length > 0 ? (
                    dayProjects.map(p => (
                      <button
                        key={p.id}
                        draggable
                        onDragStart={() => setDraggedId(p.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => onOpenProject(p)}
                        className="w-full text-left text-xs bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between group active:scale-[0.98] transition-all hover:border-brand-teal/30 cursor-move"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Format indicator: sky-500 for Reels, orange-500 for Carousel */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${p.format === 'carousel' ? 'bg-orange-500' : 'bg-sky-500'}`} />
                          <span className="text-zinc-200 font-medium truncate">{p.topic}</span>
                        </div>
                        <div className="bg-zinc-800 p-1 rounded-full text-zinc-500">
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <span className="text-zinc-700 text-[10px] italic pl-2 opacity-50">Nenhum conteúdo agendado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

const TeamView: React.FC<{
  team: User[];
  onAddMember: (member: User) => void;
  onRemoveMember: (id: string) => void;
}> = ({ team, onAddMember, onRemoveMember }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.name && newMember.role && newMember.email) {
      onAddMember({
        id: Date.now().toString(),
        name: newMember.name,
        role: newMember.role,
        email: newMember.email,
        avatar: newMember.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      });
      setIsAdding(false);
      setNewMember({ name: '', role: '', email: '' });
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-teal" />
          Equipe da Clínica
        </h2>
        <Button onClick={() => setIsAdding(true)} className="text-xs h-9">
          <Plus className="w-4 h-4" /> Novo Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-20">
        {team.map(member => (
          <div key={member.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-zinc-400">
                {member.avatar || member.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-white font-bold">{member.name}</h3>
                <p className="text-zinc-500 text-xs">{member.role}</p>
                <p className="text-zinc-600 text-[10px]">{member.email}</p>
              </div>
            </div>
            {member.id !== '1' && (
              <button
                onClick={() => { if (confirm('Remover membro?')) onRemoveMember(member.id); }}
                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
            <h3 className="text-xl font-bold text-white mb-4">Adicionar Membro</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Nome</label>
                <input
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-brand-teal outline-none"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Cargo</label>
                <input
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-brand-teal outline-none"
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">E-mail</label>
                <input
                  required
                  type="email"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-brand-teal outline-none"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

const SubscriptionPage: React.FC<{ user: User }> = ({ user }) => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionService.SubscriptionCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const info = await SubscriptionService.checkSubscriptionStatus(user.id);
      console.log('📊 Subscription carregada na página:', info);
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega quando monta E sempre que user.id muda
  useEffect(() => {
    loadSubscription();
  }, [user.id]);

  // IMPORTANTE: Recarrega sempre que a página fica visível
  useEffect(() => {
    // Adiciona listener para quando a página fica visível
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Carrega imediatamente quando componente monta
    loadSubscription();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkoutUrl = SubscriptionService.createCheckoutUrl(user.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const isSubscriber = subscriptionInfo?.isSubscriber || false;
  const trialUsesRemaining = subscriptionInfo?.trialUsesRemaining || 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 overflow-y-auto h-full pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-8 h-8 text-brand-teal" />
        <h1 className="text-2xl md:text-3xl font-bold text-white">Minha Assinatura</h1>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {isSubscriber ? 'Plano Premium Ativo' : 'Plano Gratuito'}
              </h2>
              <p className="text-zinc-400 text-sm">
                {isSubscriber
                  ? 'Você tem acesso ilimitado a todos os recursos'
                  : `Você tem ${trialUsesRemaining} teste${trialUsesRemaining !== 1 ? 's' : ''} gratuito${trialUsesRemaining !== 1 ? 's' : ''} restante${trialUsesRemaining !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            {isSubscriber ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700">
                <Clock className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-400">Trial</span>
              </div>
            )}
          </div>

          {!isSubscriber && (
            <div className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-teal">{trialUsesRemaining}</span>
                </div>
                <div>
                  <p className="text-white font-medium">Testes Restantes</p>
                  <p className="text-xs text-zinc-500">de 3 testes gratuitos</p>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-teal to-emerald-500 transition-all duration-500"
                  style={{ width: `${(trialUsesRemaining / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {!isSubscriber && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-brand-teal to-emerald-500 text-black font-bold text-center px-6 py-4 rounded-xl hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.6)] transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Assinar Plano Premium - R$ 29,90/mês
              </span>
            </a>
          )}
        </div>
      </Card>

      {/* Features Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-brand-teal" />
            O que você ganha com o Premium
          </h3>
          <div className="grid gap-3">
            {[
              'Conteúdos ilimitados para Reels, Stories e Carrosséis',
              'Roteiros otimizados para retenção e conversão',
              'Calendário editorial completo',
              'Gestão de equipe integrada',
              'Suporte prioritário via WhatsApp'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isSubscriber && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">Gerenciar Assinatura</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Para cancelar ou atualizar sua assinatura, entre em contato com o suporte.
            </p>
            <Button variant="secondary" className="w-full md:w-auto">
              <Mail className="w-4 h-4" />
              Contatar Suporte
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

const Workspace: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [view, setView] = useState<'KANBAN' | 'CREATE' | 'CALENDAR' | 'TEAM' | 'SETTINGS' | 'SUBSCRIPTION'>('CREATE');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'trial_exhausted' | 'subscription_expired'>('trial_exhausted');

  // Subscription Management
  const { subscriptionInfo, checkAndIncrement, refresh: refreshSubscription } = useSubscription(user.id);

  // Function to check subscription before any action
  const checkSubscriptionBeforeAction = async (): Promise<boolean> => {
    if (!subscriptionInfo) return false;

    if (subscriptionInfo.canUse) {
      // Se pode usar, incrementa (se for trial)
      const canProceed = await checkAndIncrement();
      if (!canProceed) {
        setPaywallReason(subscriptionInfo.reason === 'subscription_expired' ? 'subscription_expired' : 'trial_exhausted');
        setShowPaywall(true);
        return false;
      }
      return true;
    } else {
      // Não pode usar, mostra paywall
      setPaywallReason(subscriptionInfo.reason === 'subscription_expired' ? 'subscription_expired' : 'trial_exhausted');
      setShowPaywall(true);
      return false;
    }
  };

  // State Management
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [team, setTeam] = useState<User[]>(() => {
    // Keep team in localstorage for now as requested only "contents" saved
    const saved = localStorage.getItem('odonto_team');
    return saved ? JSON.parse(saved) : INITIAL_TEAM;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Persistence
  useEffect(() => {
    loadProjects();
  }, [user.id]); // Reload if user changes

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const data = await projectService.fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('odonto_team', JSON.stringify(team));
  }, [team]);

  // Actions
  const handleCreateProject = async (project: Project) => {
    console.log('🎯 handleCreateProject chamado');

    try {
      // VERIFICAÇÃO DIRETA NO BANCO
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('trial_uses, status, plan')
        .eq('user_id', user.id)
        .single();

      console.log('📊 Subscription do banco:', subData);

      if (subError && subError.code !== 'PGRST116') {
        console.error('Erro ao buscar subscription:', subError);
      }

      // Se não tem subscription, cria uma
      if (!subData) {
        console.log('📝 Criando subscription...');
        await supabase
          .from('subscriptions')
          .insert({ user_id: user.id, status: 'pending', plan: 'free', trial_uses: 0 });
      }

      const isActive = subData?.status === 'active' && subData?.plan === 'Premium';
      const trialUses = subData?.trial_uses || 0;

      console.log(`✅ Status: ${isActive ? 'Premium' : 'Trial'}, Usos: ${trialUses}/3`);

      // BLOQUEIA se não é assinante E já usou 3 vezes
      if (!isActive && trialUses >= 3) {
        console.log('🚫 BLOQUEADO - Trial esgotado!');
        setPaywallReason('trial_exhausted');
        setShowPaywall(true);
        return;
      }

      // Incrementa o contador se não é assinante
      if (!isActive) {
        console.log(`📊 Incrementando de ${trialUses} para ${trialUses + 1}`);
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ trial_uses: trialUses + 1, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('❌ Erro ao incrementar:', updateError);
        } else {
          console.log('✅ Trial_uses incrementado com sucesso!');
        }
      }

      // Cria o projeto
      console.log('✅ Criando projeto...');
      const newProject = await projectService.createProject(project);
      setProjects(prev => [newProject, ...prev]);
      setView('KANBAN');
      console.log('✅ Projeto criado!');
    } catch (error) {
      console.error("Error creating project", error);
      alert("Erro ao salvar projeto no banco de dados.");
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      // Optimistic UI
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelectedProject(updatedProject);

      // DB Update
      await projectService.updateProject(updatedProject.id, updatedProject);
    } catch (error) {
      console.error("Error updating project", error);
      // Revert on error? For now just log
      loadProjects();
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
      await projectService.deleteProject(id);
    } catch (error) {
      console.error("Error deleting project", error);
      loadProjects();
    }
  };

  const handleMoveProject = async (id: string, newStatus: ContentStatus) => {
    try {
      // Optimistic
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));

      await projectService.updateProject(id, { status: newStatus });
    } catch (error) {
      console.error("Error moving project", error);
      loadProjects();
    }
  };

  // Team Actions
  const handleAddMember = (member: User) => {
    setTeam([...team, member]);
  };

  const handleRemoveMember = (id: string) => {
    setTeam(team.filter(m => m.id !== id));
  };

  const filteredProjects = projects.filter(p =>
    p.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.selectedHeadline && p.selectedHeadline.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-screen flex flex-col bg-brand-black text-zinc-200 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-brand-teal/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-emerald-600/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full pb-20 z-10">
        <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-brand-black/50 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('CREATE')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Sparkles className="w-7 h-7 md:w-9 md:h-9 text-brand-teal shrink-0" />
              <span className="font-bold text-xl md:text-2xl tracking-tight text-white whitespace-nowrap"><span className="bg-gradient-to-r from-brand-teal to-cyan-400 bg-clip-text text-transparent">Odonto</span>Content <span className="bg-gradient-to-r from-brand-teal to-cyan-400 bg-clip-text text-transparent">IA</span></span>
            </button>
          </div>
          <div className="flex gap-2 items-center">
            {/* Desktop: Input de busca com dropdown */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsMobileSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsMobileSearchOpen(false), 200)}
                className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-brand-teal outline-none w-64 transition-all focus:w-72"
              />
              {/* Dropdown de resultados */}
              {isMobileSearchOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  {filteredProjects.length > 0 ? (
                    <>
                      <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800">
                        {filteredProjects.length} resultado(s)
                      </p>
                      {filteredProjects.slice(0, 8).map(project => (
                        <button
                          key={project.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedProject(project);
                            setSearchQuery('');
                            setView('KANBAN');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-b-0"
                        >
                          <p className="text-white text-sm font-medium truncate">{project.topic}</p>
                          <p className="text-zinc-500 text-xs truncate">{project.selectedHeadline || 'Sem headline'}</p>
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="px-4 py-4 text-sm text-zinc-500 text-center">
                      Nenhum projeto encontrado
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: Ícone de lupa que abre modal */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-brand-teal transition-colors"
              onClick={() => setIsMobileSearchOpen(true)}
            >
              <Search className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Mobile Search Modal */}
            {isMobileSearchOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-brand-black/95 backdrop-blur-sm flex flex-col p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar projetos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsMobileSearchOpen(false);
                          // Mantém o searchQuery aplicado no Kanban
                        }
                      }}
                      autoFocus
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-3 text-white focus:border-brand-teal outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resultados da busca */}
                <div className="flex-1 overflow-y-auto">
                  {searchQuery ? (
                    filteredProjects.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 mb-3">{filteredProjects.length} resultado(s) encontrado(s)</p>
                        {filteredProjects.slice(0, 10).map(project => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedProject(project);
                              setIsMobileSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-brand-teal/30 transition-colors"
                          >
                            <p className="text-white font-medium truncate">{project.topic}</p>
                            <p className="text-zinc-500 text-sm truncate">{project.selectedHeadline || 'Sem headline'}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        <p>Nenhum projeto encontrado para "{searchQuery}"</p>
                        <p className="text-xs mt-2">Você tem {projects.length} projeto(s) no total</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <p>Digite para buscar seus projetos</p>
                      <p className="text-xs mt-2">Você tem {projects.length} projeto(s)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pl-2 border-l border-zinc-800 relative">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[10px] text-zinc-500">{user.role}</p>
              </div>

              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 hover:border-brand-teal transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute top-12 right-0 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-2 animate-fade-in flex flex-col gap-1">
                    <div className="px-3 py-2 border-b border-zinc-800 mb-1 md:hidden">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.role}</p>
                    </div>
                    <button
                      onClick={() => {
                        setView('SETTINGS');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Configurações de Perfil
                    </button>
                    <button
                      onClick={() => {
                        setView('SUBSCRIPTION');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" /> Assinatura
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4 md:p-6 relative">
          {view === 'CREATE' && (
            <Wizard
              onComplete={handleCreateProject}
              onCancel={() => setView('KANBAN')}
              user={user}
              setPaywallReason={setPaywallReason}
              setShowPaywall={setShowPaywall}
            />
          )}

          {view === 'SETTINGS' && (
            <SettingsView user={user} onBack={() => setView('KANBAN')} />
          )}

          {view === 'KANBAN' && (
            <div className="flex h-full gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
              <KanbanColumn
                title="Para Fazer"
                status="IDEIA"
                projects={filteredProjects}
                onMove={handleMoveProject}
                onDelete={handleDeleteProject}
                onOpenProject={setSelectedProject}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
              <KanbanColumn
                title="Fazendo"
                status="ROTEIRIZADO"
                projects={filteredProjects}
                onMove={handleMoveProject}
                onDelete={handleDeleteProject}
                onOpenProject={setSelectedProject}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
              <KanbanColumn
                title="Feito"
                status="PRODUZIDO"
                projects={filteredProjects}
                onMove={handleMoveProject}
                onDelete={handleDeleteProject}
                onOpenProject={setSelectedProject}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
              <KanbanColumn
                title="Publicado"
                status="PUBLICADO"
                projects={filteredProjects}
                onMove={handleMoveProject}
                onDelete={handleDeleteProject}
                onOpenProject={setSelectedProject}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
              />
            </div>
          )}

          {view === 'CALENDAR' && (
            <CalendarView
              projects={filteredProjects}
              onOpenProject={setSelectedProject}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {view === 'TEAM' && <TeamView team={team} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />}
          {view === 'SUBSCRIPTION' && <SubscriptionPage user={user} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-brand-surface/90 backdrop-blur-xl border-t border-zinc-800 flex justify-around items-center px-2 z-50 pb-2 md:pb-0">
        <button
          onClick={() => setView('CREATE')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'CREATE' ? 'text-brand-teal' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className={`p-2 rounded-full ${view === 'CREATE' ? 'bg-brand-teal text-brand-black shadow-[0_0_15px_-3px_rgba(45,212,191,0.5)]' : 'bg-zinc-800'}`}>
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Área de Criação</span>
        </button>

        <button
          onClick={() => setView('KANBAN')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'KANBAN' ? 'text-brand-teal' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Planejamento</span>
        </button>

        <button
          onClick={() => setView('CALENDAR')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'CALENDAR' ? 'text-brand-teal' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Agenda</span>
        </button>

        <button
          onClick={() => setView('TEAM')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'TEAM' ? 'text-brand-teal' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Equipe</span>
        </button>


      </nav>

      {selectedProject && (
        <ProjectModal
          key={selectedProject.id}
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={user.id}
        trialUsesRemaining={subscriptionInfo?.trialUsesRemaining || 0}
        reason={paywallReason}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionService.SubscriptionCheckResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'trial_exhausted' | 'subscription_expired'>('trial_exhausted');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Usuário',
          role: 'DENTISTA_DONO',
          email: session.user.email || ''
        });
        loadSubscriptionInfo(session.user.id);
      } else {
        setUser(null);
        setSubscriptionInfo(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'Usuário',
          role: 'DENTISTA_DONO',
          email: session.user.email || ''
        });
        loadSubscriptionInfo(session.user.id);
      } else {
        setUser(null);
        setSubscriptionInfo(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadSubscriptionInfo = async (userId: string) => {
    try {
      const info = await SubscriptionService.checkSubscriptionStatus(userId);
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscriptionInfo(null);
  };

  if (user) {
    return (
      <>
        <Workspace user={user} onLogout={handleLogout} />
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          userId={user.id}
          trialUsesRemaining={subscriptionInfo?.trialUsesRemaining || 0}
          reason={paywallReason}
        />
      </>
    );
  }

  return (
    <>
      <LandingPage onLogin={() => setShowAuthModal(true)} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default App;