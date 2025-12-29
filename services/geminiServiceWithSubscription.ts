/**
 * Wrapper para o GeminiService que adiciona verificação de subscription
 * Todas as chamadas passam por aqui antes de executar a geração de conteúdo
 */

import * as GeminiService from './geminiService';
import * as SubscriptionService from './subscriptionService';
import { NarrativeStructure, FinalAssets } from '../types';

export interface GenerationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    needsSubscription?: boolean;
    subscriptionInfo?: SubscriptionService.SubscriptionCheckResult;
}

/**
 * Verifica se o usuário pode gerar conteúdo e incrementa contador se necessário
 */
async function checkAndIncrementUsage(userId: string): Promise<SubscriptionService.SubscriptionCheckResult> {
    const checkResult = await SubscriptionService.checkSubscriptionStatus(userId);

    // Se pode usar mas não é assinante, incrementa o trial
    if (checkResult.canUse && !checkResult.isSubscriber) {
        await SubscriptionService.incrementTrialUse(userId);
    }

    return checkResult;
}

/**
 * Gera hooks com verificação de subscription
 */
export async function generateHooks(
    userId: string,
    topic: string,
    onWait?: (msg: string) => void
): Promise<GenerationResult<string[]>> {
    try {
        // Verifica subscription
        const subscriptionCheck = await SubscriptionService.checkSubscriptionStatus(userId);

        if (!subscriptionCheck.canUse) {
            return {
                success: false,
                needsSubscription: true,
                subscriptionInfo: subscriptionCheck,
                error: subscriptionCheck.reason === 'trial_exhausted'
                    ? 'Você atingiu o limite de 3 testes gratuitos. Assine para continuar!'
                    : 'Sua assinatura expirou. Renove para continuar gerando conteúdo.'
            };
        }

        // Incrementa uso se for trial
        await checkAndIncrementUsage(userId);

        // Gera conteúdo
        const hooks = await GeminiService.generateHooks(topic, onWait);

        return {
            success: true,
            data: hooks,
            subscriptionInfo: subscriptionCheck
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erro ao gerar hooks'
        };
    }
}

/**
 * Gera headlines com verificação de subscription
 */
export async function generateHeadlines(
    userId: string,
    topic: string,
    selectedHook: string,
    onWait?: (msg: string) => void
): Promise<GenerationResult<string[]>> {
    try {
        const subscriptionCheck = await SubscriptionService.checkSubscriptionStatus(userId);

        if (!subscriptionCheck.canUse) {
            return {
                success: false,
                needsSubscription: true,
                subscriptionInfo: subscriptionCheck,
                error: subscriptionCheck.reason === 'trial_exhausted'
                    ? 'Você atingiu o limite de 3 testes gratuitos. Assine para continuar!'
                    : 'Sua assinatura expirou. Renove para continuar gerando conteúdo.'
            };
        }

        // Não incrementa aqui pois já foi incrementado no generateHooks
        const headlines = await GeminiService.generateHeadlines(topic, selectedHook, onWait);

        return {
            success: true,
            data: headlines,
            subscriptionInfo: subscriptionCheck
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erro ao gerar headlines'
        };
    }
}

/**
 * Gera narrativa com verificação de subscription
 */
export async function generateNarrative(
    userId: string,
    topic: string,
    hook: string,
    headline: string,
    onWait?: (msg: string) => void
): Promise<GenerationResult<NarrativeStructure>> {
    try {
        const subscriptionCheck = await SubscriptionService.checkSubscriptionStatus(userId);

        if (!subscriptionCheck.canUse) {
            return {
                success: false,
                needsSubscription: true,
                subscriptionInfo: subscriptionCheck,
                error: subscriptionCheck.reason === 'trial_exhausted'
                    ? 'Você atingiu o limite de 3 testes gratuitos. Assine para continuar!'
                    : 'Sua assinatura expirou. Renove para continuar gerando conteúdo.'
            };
        }

        const narrative = await GeminiService.generateNarrative(topic, hook, headline, onWait);

        return {
            success: true,
            data: narrative,
            subscriptionInfo: subscriptionCheck
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erro ao gerar narrativa'
        };
    }
}

/**
 * Gera assets finais com verificação de subscription
 */
export async function generateFinalAssets(
    userId: string,
    topic: string,
    narrative: NarrativeStructure,
    onWait?: (msg: string) => void
): Promise<GenerationResult<FinalAssets>> {
    try {
        const subscriptionCheck = await SubscriptionService.checkSubscriptionStatus(userId);

        if (!subscriptionCheck.canUse) {
            return {
                success: false,
                needsSubscription: true,
                subscriptionInfo: subscriptionCheck,
                error: subscriptionCheck.reason === 'trial_exhausted'
                    ? 'Você atingiu o limite de 3 testes gratuitos. Assine para continuar!'
                    : 'Sua assinatura expirou. Renove para continuar gerando conteúdo.'
            };
        }

        const assets = await GeminiService.generateFinalAssets(topic, narrative, onWait);

        return {
            success: true,
            data: assets,
            subscriptionInfo: subscriptionCheck
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erro ao gerar assets finais'
        };
    }
}

/**
 * Retorna informações da subscription do usuário
 */
export async function getSubscriptionStatus(userId: string) {
    return await SubscriptionService.checkSubscriptionStatus(userId);
}
