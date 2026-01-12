export interface ModelDefinition {
  id: string;
  name: string;
  description?: string;
}

export interface ModelCategory {
  id: string;
  name: string;
  models: ModelDefinition[];
}

export const MODEL_CATALOG: ModelCategory[] = [
  {
    id: 'kling',
    name: 'Kling',
    models: [
      { id: 'kling-2.6', name: 'Kling 2.6', description: 'Latest cinematic model with audio' },
      { id: 'kling-o1', name: 'Kling O1 Video', description: 'Best consistency from images' },
      { id: 'kling-o1-edit', name: 'Kling O1 Video Edit', description: 'Advanced scene editing' },
      { id: 'kling-motion', name: 'Kling Motion Control', description: 'Trajectory & brush control' },
      { id: 'kling-2.5-turbo', name: 'Kling 2.5 Turbo', description: 'Fast generation, good motion' },
      { id: 'kling-2.1-master', name: 'Kling 2.1 Master', description: 'High fidelity master mode' },
    ]
  },
  {
    id: 'veo',
    name: 'Google Veo',
    models: [
      { id: 'veo-3.1', name: 'Veo 3.1', description: 'High-quality cinematic 1080p' },
      { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast', description: 'Rapid prototyping' },
      { id: 'veo-3', name: 'Veo 3', description: 'Standard production model' },
    ]
  },
  {
    id: 'minimax',
    name: 'Minimax Hailuo',
    models: [
      { id: 'hailuo-video-01', name: 'Hailuo Video-01', description: 'Best for high dynamic motion' },
      { id: 'hailuo-t2v', name: 'Hailuo Text-to-Video', description: 'Optimized for complex prompts' },
    ]
  },
  {
    id: 'wan',
    name: 'Wan (Alibaba)',
    models: [
      { id: 'wan-2.1-14b', name: 'Wan 2.1 (14B)', description: 'Massive parameter model, high detail' },
      { id: 'wan-2.1-1.3b', name: 'Wan 2.1 (1.3B)', description: 'Efficient, faster generation' },
      { id: 'wan-1.0', name: 'Wan 1.0', description: 'Legacy model' },
    ]
  },
  {
    id: 'higgsfield',
    name: 'Higgsfield',
    models: [
      { id: 'higgsfield-v1', name: 'Higgsfield v1', description: 'Advanced camera & character control' },
      { id: 'higgsfield-motion', name: 'Higgsfield Motion', description: 'Specific for dance and action' },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'sora-2', name: 'Sora 2', description: 'Multi-shot, high coherence' },
      { id: 'sora-turbo', name: 'Sora Turbo', description: 'Fast iteration' },
    ]
  },
  {
    id: 'seedance',
    name: 'Seedance',
    models: [
      { id: 'seedance-gl', name: 'Seedance GL', description: 'General Large model' },
      { id: 'seedance-max', name: 'Seedance Max', description: 'Maximum quality settings' },
    ]
  },
  {
    id: 'custom',
    name: 'Altro / Custom',
    models: [
      { id: 'custom-input', name: 'Modello Personalizzato', description: 'Inserisci manualmente il nome' }
    ]
  }
];

export interface PromptOptions {
  isShortPrompt: boolean;
  includeTechParams: boolean;
  fixColorShift: boolean;
  isHighFidelity: boolean;
}

export interface OptimizedPrompt {
  mainPrompt: string;
  reasoning: string;
  usedOptions: PromptOptions;
}

export interface HistoryItem extends OptimizedPrompt {
  id: string;
  originalInput: string;
  timestamp: number;
  model: string;
}