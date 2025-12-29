import { supabase } from './supabaseClient';

export interface SubscriptionInfo {
    id: string;
    user_id: string;
    external_id: string | null;
    status: 'trial' | 'active' | 'canceled' | 'refused' | 'refunded';
    plan: string;
    trial_uses: number;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionCheckResult {
    canUse: boolean;
    reason: 'active_subscription' | 'trial_available' | 'trial_exhausted' | 'subscription_expired';
    trialUsesRemaining: number;
    isSubscriber: boolean;
    subscriptionInfo: SubscriptionInfo | null;
}

const CHECKOUT_URL = 'https://pay.cakto.com.br/8eqijd8_701561';
const SUBSCRIPTION_VALIDITY_DAYS = 30;

/**
 * Verifica se o usuário pode usar o sistema (trial ou assinatura ativa)
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionCheckResult> {
    try {
        // Busca a subscription do usuário
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching subscription:', error);

            // Se não existe, cria uma nova (fallback)
            const { data: newSub } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'trial',
                    plan: 'free',
                    trial_uses: 0
                })
                .select()
                .single();

            return {
                canUse: true,
                reason: 'trial_available',
                trialUsesRemaining: 3,
                isSubscriber: false,
                subscriptionInfo: newSub
            };
        }

        const sub = subscription as SubscriptionInfo;

        // Verifica se é assinante ativo
        if (sub.status === 'active') {
            const daysSinceUpdate = Math.floor(
                (Date.now() - new Date(sub.updated_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceUpdate <= SUBSCRIPTION_VALIDITY_DAYS) {
                return {
                    canUse: true,
                    reason: 'active_subscription',
                    trialUsesRemaining: 0,
                    isSubscriber: true,
                    subscriptionInfo: sub
                };
            } else {
                // Assinatura expirada
                return {
                    canUse: false,
                    reason: 'subscription_expired',
                    trialUsesRemaining: 0,
                    isSubscriber: false,
                    subscriptionInfo: sub
                };
            }
        }

        // Não é assinante, verifica trial
        const trialUsesRemaining = Math.max(0, 3 - sub.trial_uses);

        if (trialUsesRemaining > 0) {
            return {
                canUse: true,
                reason: 'trial_available',
                trialUsesRemaining,
                isSubscriber: false,
                subscriptionInfo: sub
            };
        }

        // Trial esgotado
        return {
            canUse: false,
            reason: 'trial_exhausted',
            trialUsesRemaining: 0,
            isSubscriber: false,
            subscriptionInfo: sub
        };

    } catch (error) {
        console.error('Error in checkSubscriptionStatus:', error);
        throw error;
    }
}

/**
 * Incrementa o contador de usos do trial
 */
export async function incrementTrialUse(userId: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('increment_trial_use', {
            user_uuid: userId
        });

        if (error) {
            console.error('Error incrementing trial use:', error);
            throw error;
        }

        return data as number;
    } catch (error) {
        console.error('Error in incrementTrialUse:', error);
        throw error;
    }
}

/**
 * Busca informações completas da subscription
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching subscription info:', error);
            return null;
        }

        return data as SubscriptionInfo;
    } catch (error) {
        console.error('Error in getSubscriptionInfo:', error);
        return null;
    }
}

/**
 * Gera URL do checkout da Cakto com external_id
 */
export function createCheckoutUrl(userId: string): string {
    return `${CHECKOUT_URL}?external_id=${userId}`;
}

/**
 * Verifica se assinatura está ativa (helper)
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
    const result = await checkSubscriptionStatus(userId);
    return result.canUse && result.isSubscriber;
}

/**
 * Verifica se ainda pode usar trial (helper)
 */
export async function canUseTrial(userId: string): Promise<boolean> {
    const result = await checkSubscriptionStatus(userId);
    return result.canUse && !result.isSubscriber;
}
