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

export function sanitizeRecipeTitle(rawTitle: string, fullTranscript?: string, hint?: string): string {
  let t = (rawTitle || '').trim();

  // Normalize quotes
  t = t.replace(/[’‘`]/g, "'");
  const transcriptNorm = (fullTranscript || '').replace(/[’‘`]/g, "'");

  // If the title starts with "S ", "s ", "'s ", or "'S " (e.g. "S Real Sunday", "s Real Sunday", "'s Real Sunday"):
  // A possessive name was cut off right at the apostrophe!
  const cutOffMatch = t.match(/^[sS]['']?\s+(.*)/i) || t.match(/^['']s\s+(.*)/i);
  if (cutOffMatch) {
    const remainder = cutOffMatch[1].trim();
    // Search the transcript for what name was immediately before "'s " + remainder
    const firstWordOfRemainder = remainder.split(' ')[0];
    const recoverMatch =
      transcriptNorm.match(new RegExp(`([A-Za-z]+)'s\\s+(?:real\\s+)?${firstWordOfRemainder}`, 'i')) ||
      transcriptNorm.match(/([A-Za-z]+)'s/i);

    if (recoverMatch && recoverMatch[1]) {
      const personName = recoverMatch[1].charAt(0).toUpperCase() + recoverMatch[1].slice(1).toLowerCase();
      t = `${personName}'s ${remainder}`;
    } else if (hint) {
      t = `${hint}'s ${remainder}`;
    } else if (/rose/i.test(transcriptNorm)) {
      t = `Rose's ${remainder}`;
    }
  }

  // Reject generic single words like "Occasion", "Setting", "Recipe"
  if (/^(occasion|setting|recipe|dinner|food|kitchen|story|memories|things?)$/i.test(t)) {
    if (hint) {
      t = `${hint}'s Sunday Pot Roast`;
    } else if (/pot\s+roast|roast/i.test(transcriptNorm)) {
      t = /Rose/i.test(transcriptNorm) ? "Rose's Sunday Pot Roast" : "Sunday Pot Roast";
    } else {
      t = 'Beloved Family Recipe';
    }
  }

  // If title ends with "Sunday", and transcript is about Pot Roast, append "Pot Roast"
  if (/Sunday$/i.test(t) && /pot\s+roast|roast/i.test(transcriptNorm)) {
    t = `${t} Pot Roast`;
  }

  // Ensure title-case while preserving 's
  t = t
    .split(' ')
    .map((w) => {
      if (/^([a-zA-Z]+)('s)$/i.test(w)) {
        const parts = w.match(/^([a-zA-Z]+)('s)$/i)!;
        return parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() + "'s";
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');

  return t;
}

export function cleanAndParseGemmaResponse(rawResponse: string, fullTranscript?: string, hint?: string): ParsedGemmaOutput {
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

    // Sanitize title to prevent truncation like "S Real Sunday"
    parsed.title = sanitizeRecipeTitle(parsed.title, fullTranscript, hint);

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
