export interface ParsedGemmaOutput {
  title: string;
  category?: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  servingsCount?: number;
  difficulty?: string;
  ingredients: Array<{
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

    // Basic structure integrity validation
    if (!parsed.title || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions)) {
      throw new Error('JSON structure does not match expected Recipe schema.');
    }

    return parsed as ParsedGemmaOutput;
  } catch (error) {
    throw new Error(`Failed to parse structured JSON from Gemma: ${(error as Error).message}`);
  }
}
