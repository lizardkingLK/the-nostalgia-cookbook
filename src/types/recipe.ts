export interface IIngredient {
  amount?: string;
  unit?: string;
  name?: string;
  item: string;
  imperial: string;
  metric: string;
  notes?: string;
}

export interface IInstruction {
  stepNumber: number;
  instruction: string;
  tip?: string;
}

export interface INostalgiaNarrative {
  summary: string;
  anecdotes: string[];
  familyMembersMentioned: string[];
  historicalContext?: string;
  emotionalTone?: string;
  secretFamilyTip?: string;
}

export interface IRecipe {
  id: string;
  title: string;
  category: 'Sunday Dinners' | 'Baking & Breads' | 'Soups & Stews' | 'Holiday Traditions' | 'Desserts & Sweets' | 'Preserves & Relishes';
  prepTime: string;
  cookTime: string;
  servings: string;
  servingsCount: number;
  difficulty: 'Easy' | 'Medium' | 'Heirloom Master';
  ingredients: IIngredient[];
  instructions: IInstruction[];
  nostalgia: INostalgiaNarrative;
  rawTranscript: string;
  audioDurationSeconds?: number;
  engineUsed?: string;
  warning?: string;
  createdAt: string;
  updatedAt: string;
}
