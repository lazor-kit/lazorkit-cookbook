export interface PlanFeatures {
    id: string;
    name: string;
    price: number;
    interval: number;
    popular?: boolean; // Optional property
    features: string[];
}

export const PLANS: Record<string, PlanFeatures> = {
    basic: {
        id: 'basic',
        name: 'Basic',
        price: 0.1,
        interval: 30 * 24 * 60 * 60,
        features: [
            'Access to basic features',
            'Email support',
            'Monthly updates',
            'Cancel anytime'
        ]
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 0.2,
        interval: 30 * 24 * 60 * 60,
        popular: true, // Only pro has this
        features: [
            'All Basic features',
            'Priority support',
            'Advanced analytics',
            'API access',
            'Cancel anytime'
        ]
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 0.3,
        interval: 30 * 24 * 60 * 60,
        features: [
            'All Pro features',
            'Dedicated support',
            'Custom integrations',
            'SLA guarantee',
            'Cancel anytime'
        ]
    }
} as const;

export type PlanId = keyof typeof PLANS;