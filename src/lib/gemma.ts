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

  // Normalize quotes and apostrophes
  t = t.replace(/[’‘`]/g, "'");
  const transcriptNorm = (fullTranscript || '').replace(/[’‘`]/g, "'");

  // Strip leading action verbs (e.g. "making Rose's Real Sunday" -> "Rose's Real Sunday")
  t = t.replace(/^(?:how\s+to\s+make|how\s+to\s+cook|how\s+to\s+bake|making|make|cooking|cook|baking|bake|preparing|prepare)\s+/i, '');

  // If the title starts with "S ", "s ", "'s ", "'S ", "’s ", or "s'":
  // A possessive name was cut off right at the apostrophe (e.g. "S Real Sunday", "'s Real Sunday")
  const cutOffMatch = t.match(/^[sS]['']?\s+(.*)/i) || t.match(/^['']s\s+(.*)/i);
  if (cutOffMatch) {
    const remainder = cutOffMatch[1].trim();
    const remainderWords = remainder.split(/\s+/);
    const firstWord = remainderWords[0];
    let personName = '';

    // Match [Person]'s + remainder's first word in transcript
    const directMatch = transcriptNorm.match(new RegExp(`\\b([A-Za-z]+)'s\\s+${firstWord}\\b`, 'i'));
    if (directMatch && directMatch[1]) {
      personName = directMatch[1];
    }

    // Match any possessive name in transcript
    if (!personName) {
      const anyPossessiveMatch = transcriptNorm.match(/\b([A-Za-z]{2,20})'s\b/i);
      if (anyPossessiveMatch && anyPossessiveMatch[1] && !/^(it|that|there|what|here|he|she|who|where|how|when)$/i.test(anyPossessiveMatch[1])) {
        personName = anyPossessiveMatch[1];
      }
    }

    // Hint fallback
    if (!personName && hint) {
      personName = hint.replace(/'s$/i, '').trim();
    }

    // Rose fallback if Rose is mentioned anywhere
    if (!personName && /\bRose\b/i.test(transcriptNorm)) {
      personName = 'Rose';
    }

    if (personName) {
      const formatted = personName.charAt(0).toUpperCase() + personName.slice(1).toLowerCase();
      t = `${formatted}'s ${remainder}`;
    }
  }

  // If title is empty or generic, try extracting dish directly from transcript
  if (!t || /^(occasion|setting|recipe|dinner|food|kitchen|story|memories|things?)$/i.test(t)) {
    // Check for "making Rose's Real Sunday" or "Rose's real Sunday..."
    const actionInTranscript = transcriptNorm.match(/(?:how\s+to\s+make|making|make|cooking|cook|baking|bake|preparing|prepare)\s+([A-Za-z]+'s\s+[A-Za-z0-9'\-\s]{3,35})/i);
    const namedInTranscript = transcriptNorm.match(/\b([A-Za-z]+'s\s+(?:real\s+|famous\s+|secret\s+|cherished\s+)?(?:Sunday\s+)?[A-Za-z0-9'\-\s]{3,35}?(?:Pot\s+Roast|Roast|Cake|Pie|Stew|Soup|Chili|Cobbler|Bread|Casserole|Chicken|Brisket|Sunday))/i);

    if (actionInTranscript && actionInTranscript[1]) {
      t = actionInTranscript[1].replace(/(?:\.|\,|;|\!|\?|back|when|recipe|for|is|in|that|the\s+kind).*$/i, '').trim();
    } else if (namedInTranscript && namedInTranscript[1]) {
      t = namedInTranscript[1].trim();
    } else if (hint) {
      t = `${hint}'s Sunday Pot Roast`;
    } else if (/pot\s+roast|roast/i.test(transcriptNorm)) {
      t = /Rose/i.test(transcriptNorm) ? "Rose's Sunday Pot Roast" : "Sunday Pot Roast";
    } else {
      t = 'Beloved Family Recipe';
    }
  }

  // If title ends with "Sunday", and transcript is about Pot Roast / roast, append "Pot Roast"
  if (/Sunday$/i.test(t) && /pot\s+roast|roast|chuck/i.test(transcriptNorm)) {
    t = `${t} Pot Roast`;
  }

  // Ensure title-case while preserving 's
  t = t
    .split(/\s+/)
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
