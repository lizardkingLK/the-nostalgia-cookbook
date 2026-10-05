export interface ParsedGemmaOutput {
  title: string;
  category?: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  servingsCount?: number;
  difficulty?: string;
  ingredients: Array<{
    amount?: string;
    unit?: string;
    name?: string;
    item: string;
    imperial: string;
    metric: string;
    notes?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    instruction: string;
    tip?: string;
  }>;
  nostalgia: {
    summary: string;
    anecdotes: string[];
    familyMembersMentioned: string[];
    historicalContext?: string;
    emotionalTone?: string;
    secretFamilyTip?: string;
  };
}

export function cleanAndParseGemmaResponse(rawResponse: string): ParsedGemmaOutput {
  let cleaned = rawResponse.trim();

  // Extract JSON payload if wrapped in Markdown code fences
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(jsonBlockRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Basic structure integrity validation (accepts both instructions or steps)
    if (!parsed.title || !Array.isArray(parsed.ingredients) || (!Array.isArray(parsed.instructions) && !Array.isArray(parsed.steps))) {
      throw new Error('JSON structure does not match expected Recipe schema.');
    }

    // Normalize steps into instructions
    if (Array.isArray(parsed.steps) && !Array.isArray(parsed.instructions)) {
      parsed.instructions = parsed.steps.map((s: any, idx: number) => ({
        stepNumber: idx + 1,
        instruction: typeof s === 'string' ? s : String(s.instruction || ''),
      }));
    }

    // Normalize story_journal into nostalgia
    if (Array.isArray(parsed.story_journal) && !parsed.nostalgia) {
      parsed.nostalgia = {
        summary: parsed.story_journal[0] || '',
        anecdotes: parsed.story_journal.map(String),
        familyMembersMentioned: Array.isArray(parsed.family_members) ? parsed.family_members.map(String) : [],
        historicalContext: parsed.era || 'Family archive',
        secretFamilyTip: parsed.secret_tip,
      };
    }

    // Normalize ingredients to guarantee amount, unit, name, item, imperial, and metric
    parsed.ingredients = parsed.ingredients.map((ing: any) => {
      const cleanName = String(ing.name || ing.item || '').trim();
      const rawAmt = String(ing.amount || '').trim();
      const rawUnit = String(ing.unit || '').trim();
      const imperial = ing.imperial || (rawAmt || rawUnit ? `${rawAmt} ${rawUnit}`.trim() : 'As needed');
      return {
        amount: rawAmt || undefined,
        unit: rawUnit || undefined,
        name: cleanName,
        item: cleanName,
        imperial,
        metric: ing.metric || imperial,
        notes: ing.notes ? String(ing.notes) : undefined,
      };
    });

    return parsed as ParsedGemmaOutput;
  } catch (error) {
    throw new Error(`Failed to parse structured JSON from Gemma: ${(error as Error).message}`);
  }
}
