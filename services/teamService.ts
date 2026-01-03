import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import { User } from '../types';

export interface TeamMember {
    id: string;
    owner_id: string;
    member_user_id: string | null;
    name: string;
    role: string;
    email: string;
    avatar: string | null;
    created_at: string;
}

export const teamService = {
    /**
     * Fetch all team members for the current user (as owner or as member)
     */
    async fetchTeamMembers(): Promise<User[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // First, check if current user is a member of someone else's team
        const { data: membershipData } = await supabase
            .from('team_members')
            .select('owner_id')
            .eq('member_user_id', user.id)
            .single();

        // Determine which owner_id to use
        const ownerId = membershipData?.owner_id || user.id;

        // Fetch all team members for this owner
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(mapToUser);
    },

    /**
     * Get the owner info if current user is a team member
     */
    async getTeamOwnerInfo(): Promise<{ isOwner: boolean; ownerName?: string; ownerEmail?: string }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if current user is a member of someone else's team
        // We look for a record where member_user_id = user.id AND owner_id != user.id
        const { data: membershipData } = await supabase
            .from('team_members')
            .select('owner_id, name, email')
            .eq('member_user_id', user.id)
            .neq('owner_id', user.id)
            .single();

        // If no such record exists, the user is an owner (or has no team at all)
        if (!membershipData) {
            return { isOwner: true };
        }

        // User is a member of someone else's team - get owner info
        const { data: ownerData } = await supabase
            .from('team_members')
            .select('name, email')
            .eq('owner_id', membershipData.owner_id)
            .eq('member_user_id', membershipData.owner_id)
            .single();

        return {
            isOwner: false,
            ownerName: ownerData?.name || 'Proprietário',
            ownerEmail: ownerData?.email
        };
    },

    /**
     * Get owner_id for the current user (either their own id or their owner's id)
     */
    async getOwnerId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: membershipData } = await supabase
            .from('team_members')
            .select('owner_id')
            .eq('member_user_id', user.id)
            .single();

        return membershipData?.owner_id || user.id;
    },

    /**
     * Get count of team members (for limit validation)
     */
    async getTeamCount(): Promise<number> {
        const ownerId = await this.getOwnerId();

        const { count, error } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Add a new team member (creates Supabase Auth account and saves to database)
     */
    /**
     * Add a new team member (creates Supabase Auth account and saves to database)
     */
    async addTeamMember(name: string, role: string, email: string, password: string): Promise<User> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const ownerId = user.id;

        // Check limit (max 3 members including owner)
        const count = await this.getTeamCount();
        if (count >= 3) {
            throw new Error('Limite de 3 membros atingido. Faça upgrade para adicionar mais.');
        }

        // Step 1: Insert into team_members table FIRST
        const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const { data: memberData, error: insertError } = await supabase
            .from('team_members')
            .insert({
                owner_id: ownerId,
                member_user_id: null,
                name,
                role,
                email,
                avatar
            })
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                throw new Error('Este e-mail já está cadastrado na equipe.');
            }
            throw insertError;
        }

        // Step 2: Create user account using ISOLATED client (prevents logout)
        // We create a temporary client that does NOT persist the session to localStorage
        const tempSupabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false, // Critical: don't save this session
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role,
                    team_owner_id: ownerId
                }
            }
        });

        if (signUpError) {
            // Rollback
            await supabase.from('team_members').delete().eq('id', memberData.id);

            if (signUpError.message.includes('already registered')) {
                throw new Error('Este e-mail já está cadastrado no sistema.');
            }
            throw new Error(signUpError.message);
        }

        // Step 3: Update team_members with the new auth user ID
        if (signUpData.user?.id) {
            await supabase
                .from('team_members')
                .update({ member_user_id: signUpData.user.id })
                .eq('id', memberData.id);
        }

        return mapToUser(memberData);
    },

    /**
     * Remove a team member
     */
    async removeTeamMember(id: string): Promise<void> {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Add owner as first team member (called once when user first accesses team)
     */
    async ensureOwnerInTeam(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if owner already exists in team
        const { data: existing } = await supabase
            .from('team_members')
            .select('id')
            .eq('owner_id', user.id)
            .eq('member_user_id', user.id)
            .single();

        if (existing) return; // Already exists

        // Get user metadata
        const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Proprietário';
        const avatar = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

        await supabase
            .from('team_members')
            .insert({
                owner_id: user.id,
                member_user_id: user.id,
                name,
                role: 'Proprietário (Admin)',
                email: user.email || '',
                avatar
            });
    }
};

function mapToUser(data: TeamMember): User {
    return {
        id: data.id,
        name: data.name,
        role: data.role,
        email: data.email,
        avatar: data.avatar || undefined
    };
}
