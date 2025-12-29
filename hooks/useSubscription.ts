import { useState, useEffect } from 'react';
import * as SubscriptionService from '../services/subscriptionService';

export function useSubscription(userId: string | null) {
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionService.SubscriptionCheckResult | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSubscription = async () => {
        if (!userId) {
            setSubscriptionInfo(null);
            setLoading(false);
            return;
        }

        try {
            const info = await SubscriptionService.checkSubscriptionStatus(userId);
            console.log('📊 Subscription carregada:', info);
            setSubscriptionInfo(info);
        } catch (error) {
            console.error('Error loading subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubscription();
    }, [userId]);

    const checkAndIncrement = async (): Promise<boolean> => {
        if (!userId || !subscriptionInfo) {
            console.log('❌ Sem userId ou subscriptionInfo');
            return false;
        }

        console.log('🔍 Verificando subscription:', subscriptionInfo);

        // Se NÃO pode usar, bloqueia
        if (!subscriptionInfo.canUse) {
            console.log('🚫 BLOQUEADO - canUse é false');
            return false;
        }

        // Se é assinante, pode usar sem incrementar
        if (subscriptionInfo.isSubscriber) {
            console.log('✅ Assinante ativo - pode usar');
            return true;
        }

        // Se está no trial, incrementa ANTES de permitir
        console.log(`📊 Trial - incrementando uso (restantes antes: ${subscriptionInfo.trialUsesRemaining})`);
        await SubscriptionService.incrementTrialUse(userId);
        await loadSubscription(); // Recarrega para atualizar contador

        return true;
    };

    return {
        subscriptionInfo,
        loading,
        refresh: loadSubscription,
        checkAndIncrement
    };
}
