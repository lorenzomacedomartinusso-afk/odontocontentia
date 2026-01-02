import { supabase } from './supabaseClient';
import { Project, ContentStatus, NarrativeStructure, FinalAssets } from '../types';

export const projectService = {
    async fetchProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(mapToProject);
    },

    async createProject(project: Omit<Project, 'id' | 'createdAt'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const dbProject = {
            user_id: user.id,
            topic: project.topic,
            status: project.status,
            scheduled_date: project.scheduledDate,
            selected_hook: project.selectedHook,
            selected_headline: project.selectedHeadline,
            narrative: project.narrative,
            final_assets: project.finalAssets,
            format: project.format
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(dbProject)
            .select()
            .single();

        if (error) throw error;
        return mapToProject(data);
    },

    async updateProject(id: string, updates: Partial<Project>) {
        const dbUpdates: any = {};
        if (updates.topic) dbUpdates.topic = updates.topic;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
        if (updates.selectedHook) dbUpdates.selected_hook = updates.selectedHook;
        if (updates.selectedHeadline) dbUpdates.selected_headline = updates.selectedHeadline;
        if (updates.narrative) dbUpdates.narrative = updates.narrative;
        if (updates.finalAssets) dbUpdates.final_assets = updates.finalAssets;
        if (updates.format) dbUpdates.format = updates.format;

        const { data, error } = await supabase
            .from('projects')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapToProject(data);
    },

    async deleteProject(id: string) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

function mapToProject(data: any): Project {
    return {
        id: data.id,
        topic: data.topic,
        status: data.status as ContentStatus,
        createdAt: data.created_at,
        scheduledDate: data.scheduled_date,
        selectedHook: data.selected_hook,
        selectedHeadline: data.selected_headline,
        narrative: data.narrative as NarrativeStructure,
        finalAssets: data.final_assets as FinalAssets,
        format: data.format
    };
}
