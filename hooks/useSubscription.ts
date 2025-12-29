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
        if (!userId || !subscriptionInfo) return false;

        // Se pode usar, incrementa e retorna true
        if (subscriptionInfo.canUse) {
            if (!subscriptionInfo.isSubscriber) {
                await SubscriptionService.incrementTrialUse(userId);
                await loadSubscription(); // Recarrega para atualizar contador
            }
            return true;
        }

        // Não pode usar
        return false;
    };

    return {
        subscriptionInfo,
        loading,
        refresh: loadSubscription,
        checkAndIncrement
    };
}
