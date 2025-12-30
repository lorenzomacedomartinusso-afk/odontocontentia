import React from 'react';
import { X, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    trialUsesRemaining: number;
    reason: 'trial_exhausted' | 'subscription_expired';
}

const PaywallModal: React.FC<PaywallModalProps> = ({
    isOpen,
    onClose,
    userId,
    trialUsesRemaining,
    reason
}) => {
    if (!isOpen) return null;

    const checkoutUrl = `https://pay.cakto.com.br/8eqijd8_701561?external_id=${userId}`;

    const getMessage = () => {
        if (reason === 'trial_exhausted') {
            return {
                title: 'Seus 3 testes gratuitos acabaram! 🎯',
                subtitle: 'Você experimentou o poder da OdontoContent IA. Agora é hora de desbloquear todo o potencial!',
                features: [
                    'Conteúdos ilimitados para Reels, Stories e Carrosséis',
                    'Roteiros otimizados para retenção e conversão',
                    'Calendário editorial completo',
                    'Gestão de equipe integrada',
                    'Suporte prioritário via WhatsApp'
                ]
            };
        } else {
            return {
                title: 'Sua assinatura expirou 😔',
                subtitle: 'Renove agora e continue criando conteúdo que atrai pacientes!',
                features: [
                    'Conteúdos ilimitados para Reels, Stories e Carrosséis',
                    'Roteiros otimizados para retenção e conversão',
                    'Calendário editorial completo',
                    'Gestão de equipe integrada',
                    'Suporte prioritário via WhatsApp'
                ]
            };
        }
    };

    const { title, subtitle, features } = getMessage();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl relative overflow-y-auto animate-in zoom-in-95 duration-300">

                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal to-emerald-500 rounded-3xl blur opacity-20 animate-pulse"></div>

                {/* Content */}
                <div className="relative bg-zinc-900 rounded-3xl p-8 md:p-10">

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Icon */}
                    <div className="w-20 h-20 bg-brand-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-teal/20">
                        <Lock className="w-10 h-10 text-brand-teal" />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 leading-tight">
                        {title}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-zinc-400 text-center text-lg mb-8 max-w-xl mx-auto">
                        {subtitle}
                    </p>

                    {/* Features */}
                    <div className="bg-zinc-950/50 rounded-2xl p-6 mb-8 border border-zinc-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-brand-teal" />
                            O que você ganha com o Plano Premium:
                        </h3>
                        <div className="space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3 text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                                    <span className="text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-baseline gap-2 mb-2">
                            <span className="text-5xl font-bold text-white">R$ 29,90</span>
                            <span className="text-zinc-500">/mês</span>
                        </div>
                        <p className="text-sm text-zinc-500">Cancele quando quiser • Sem fidelidade</p>
                    </div>

                    {/* CTA Button */}
                    <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gradient-to-r from-brand-teal to-emerald-500 text-black font-bold text-lg px-8 py-4 rounded-full hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 text-center"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Assinar Agora
                        </span>
                    </a>

                    {/* Guarantee */}
                    <p className="text-center text-xs text-zinc-600 mt-4">
                        🔒 Pagamento 100% seguro • 7 dias de garantia incondicional
                    </p>

                </div>
            </div>
        </div>
    );
};

export default PaywallModal;
