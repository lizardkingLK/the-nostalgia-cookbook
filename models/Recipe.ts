import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIngredient {
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

export interface IRecipeDocument extends Document {
  // Family & User Ownership (Google Auth Integration)
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  isFamilyShared: boolean;
  allowedFamilyEmails: string[];

  // Recipe Mechanics
  title: string;
  category: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  servingsCount: number;
  difficulty: 'Easy' | 'Medium' | 'Heirloom Master';
  ingredients: IIngredient[];
  instructions: IInstruction[];

  // Oral Heritage & Memories
  nostalgia: INostalgiaNarrative;
  rawTranscript: string;
  audioDurationSeconds?: number;
  engineUsed?: string;

  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredient>({
  item: { type: String, required: true },
  imperial: { type: String, required: true },
  metric: { type: String, required: true },
  notes: { type: String },
});

const InstructionSchema = new Schema<IInstruction>({
  stepNumber: { type: Number, required: true },
  instruction: { type: String, required: true },
  tip: { type: String },
});

const NostalgiaSchema = new Schema<INostalgiaNarrative>({
  summary: { type: String, required: true },
  anecdotes: [{ type: String }],
  familyMembersMentioned: [{ type: String }],
  historicalContext: { type: String },
  emotionalTone: { type: String },
  secretFamilyTip: { type: String },
});

const RecipeSchema = new Schema<IRecipeDocument>(
  {
    // Ownership link to Google User
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true, index: true, lowercase: true },
    isFamilyShared: { type: Boolean, default: false },
    allowedFamilyEmails: [{ type: String, lowercase: true, trim: true }],

    // Core Content
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      default: 'Sunday Dinners',
      enum: [
        'Sunday Dinners',
        'Baking & Breads',
        'Soups & Stews',
        'Holiday Traditions',
        'Desserts & Sweets',
        'Preserves & Relishes',
      ],
    },
    prepTime: { type: String, default: '20 mins' },
    cookTime: { type: String, default: '45 mins' },
    servings: { type: String, default: '4-6 servings' },
    servingsCount: { type: Number, default: 6 },
    difficulty: { type: String, default: 'Medium', enum: ['Easy', 'Medium', 'Heirloom Master'] },
    ingredients: { type: [IngredientSchema], required: true },
    instructions: { type: [InstructionSchema], required: true },
    nostalgia: { type: NostalgiaSchema, required: true },
    rawTranscript: { type: String, required: true },
    audioDurationSeconds: { type: Number },
    engineUsed: { type: String, default: 'Gemma 2 (Ollama Local)' },
  },
  { timestamps: true }
);

// Compound index for querying user recipes quickly
RecipeSchema.index({ userEmail: 1, createdAt: -1 });

export const Recipe: Model<IRecipeDocument> =
  mongoose.models.Recipe || mongoose.model<IRecipeDocument>('Recipe', RecipeSchema);
