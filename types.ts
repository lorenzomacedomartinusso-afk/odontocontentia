export type ContentStatus = 'IDEIA' | 'ROTEIRIZADO' | 'PRODUZIDO' | 'PUBLICADO';

export interface Project {
  id: string;
  topic: string;
  status: ContentStatus;
  createdAt: string;
  scheduledDate?: string; // Data para o calendário (ISO String)
  selectedHook?: string;
  selectedHeadline?: string;
  narrative?: NarrativeStructure;
  finalAssets?: FinalAssets;
  format?: 'reels' | 'carousel'; // Tipo de formato: Reels (azul) ou Carousel/Story (laranja)
}

export interface NarrativeStructure {
  tension: string;
  cause: string;
  effect: string;
  culture: string;
  provocation: string;
}

export interface FinalAssets {
  reelsScript: string;
  carouselStructure: string[];
  caption: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string; // Iniciais ou URL
  cro?: string;
  specialty?: string;
}

export enum WizardStep {
  TOPIC_INPUT = 0,
  HOOKS = 1,
  HEADLINES = 2,
  NARRATIVE = 3,
  FINAL_ASSETS = 4
}