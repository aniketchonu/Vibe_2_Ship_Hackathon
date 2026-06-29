export interface Task {
  id: string;
  title: string;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // HH:MM
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'done' | 'skipped';
}

export interface PlanBlock {
  taskId: string;
  start: string; // HH:MM
  end: string;   // HH:MM
  label: string;
}

export interface Plan {
  date: string; // YYYY-MM-DD
  blocks: PlanBlock[];
}

export interface PersonaVoice {
  pitchMultiplier: number;
  rateMultiplier: number;
}

export interface PersonaEscalation {
  "1": string;
  "2": string;
  "3": string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  planningPhilosophy: string;
  escalationStyle: PersonaEscalation;
  voice: PersonaVoice;
}

export interface AppState {
  tasks: Task[];
  currentPlan: Plan | null;
  selectedPersona: string | null; // persona ID
  escalationStage: number; // 0 to 3
  isLocked: boolean;
  driftMinutes: number;
  commentary: string;
  shortVoiceLine: string;
}

