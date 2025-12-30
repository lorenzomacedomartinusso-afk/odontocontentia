-- Migration: Add trial_uses and monetization columns to subscriptions table
-- Created: 2025-12-29

-- 1. Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'trial',
    plan TEXT DEFAULT 'free',
    trial_uses INTEGER NOT NULL DEFAULT 0,
    transaction_id TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- 2. Add trial_uses column if table already exists (safe migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'trial_uses'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN trial_uses INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add user_email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'user_email'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN user_email TEXT;
    END IF;
END $$;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_id ON public.subscriptions(external_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist (for clean migration)
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role has full access" ON public.subscriptions;

-- 7. Create RLS Policies

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own trial_uses and basic info
CREATE POLICY "Users can update their own subscription"
    ON public.subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own subscription
CREATE POLICY "Users can insert their own subscription"
    ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Service role (for webhooks) has full access
CREATE POLICY "Service role has full access"
    ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- 8. Create function to automatically create subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, user_email, status, plan, trial_uses)
    VALUES (NEW.id, NEW.email, 'trial', 'free', 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 10. Create function to check subscription validity
CREATE OR REPLACE FUNCTION public.is_subscription_active(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status TEXT;
    sub_updated TIMESTAMPTZ;
    days_since_update INTEGER;
BEGIN
    SELECT status, updated_at INTO sub_status, sub_updated
    FROM public.subscriptions
    WHERE user_id = user_uuid;
    
    IF sub_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF sub_status = 'active' THEN
        days_since_update := EXTRACT(DAY FROM (NOW() - sub_updated));
        RETURN days_since_update <= 30;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to check if user can use trial
CREATE OR REPLACE FUNCTION public.can_use_trial(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    uses INTEGER;
BEGIN
    SELECT trial_uses INTO uses
    FROM public.subscriptions
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(uses, 0) < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to increment trial uses
CREATE OR REPLACE FUNCTION public.increment_trial_use(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.subscriptions
    SET trial_uses = trial_uses + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid
    RETURNING trial_uses INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_trial TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_trial_use TO authenticated;

-- Migration completed successfully
