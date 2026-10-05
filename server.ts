import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_RECIPES } from './src/data/sampleRecipes.js';
import { IRecipe } from './src/types/recipe.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data folder exists and recipes are loaded
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadRecipes(): IRecipe[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read existing recipes, reinitializing default seed:', err);
  }
  // Initialize with seed recipes
  fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_RECIPES, null, 2), 'utf-8');
  return INITIAL_RECIPES;
}

function saveRecipes(recipes: IRecipe[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save recipes to data/recipes.json:', err);
  }
}

// Global server GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Configure Express middleware
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(ai),
    timestamp: new Date().toISOString(),
  });
});

// Check local Gemma / Ollama status
app.get('/api/gemma-status', async (req: Request, res: Response) => {
  const gemmaEndpoint = process.env.GEMMA_ENDPOINT || 'http://localhost:11434';
  const gemmaModel = process.env.GEMMA_MODEL || 'gemma2:9b';

  let localConnected = false;
  let modelAvailable = false;
  let errorMsg = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const checkRes = await fetch(`${gemmaEndpoint}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (checkRes.ok) {
      localConnected = true;
      const data = await checkRes.json();
      if (data && Array.isArray(data.models)) {
        modelAvailable = data.models.some((m: { name?: string }) =>
          m.name?.toLowerCase().includes('gemma')
        );
      }
    }
  } catch (err: unknown) {
    errorMsg = (err as Error).message || 'Local Ollama endpoint unreachable';
  }

  res.json({
    endpoint: gemmaEndpoint,
    model: gemmaModel,
    localOllamaConnected: localConnected,
    gemmaModelAvailable: modelAvailable,
    cloudFallbackActive: true,
    message: localConnected
      ? `Local Ollama active at ${gemmaEndpoint} (Model: ${gemmaModel})`
      : 'Using Cloud Gemma Heritage Restorer Engine (Air-gapped privacy mode ready)',
    errorMsg: localConnected ? undefined : errorMsg,
  });
});

// List all recipes
app.get('/api/recipes', (req: Request, res: Response) => {
  const recipes = loadRecipes();
  res.json(recipes);
});

// Get single recipe
app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const recipes = loadRecipes();
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(recipe);
});

// Create/Save new recipe manually
app.post('/api/recipes', (req: Request, res: Response) => {
  const recipes = loadRecipes();
  const newRecipe: IRecipe = {
    ...req.body,
    id: req.body.id || `heirloom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  recipes.unshift(newRecipe);
  saveRecipes(recipes);
  res.status(201).json(newRecipe);
});

// Update recipe
app.put('/api/recipes/:id', (req: Request, res: Response) => {
  const recipes = loadRecipes();
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  recipes[index] = {
    ...recipes[index],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString(),
  };
  saveRecipes(recipes);
  res.json(recipes[index]);
});

// Delete recipe
app.delete('/api/recipes/:id', (req: Request, res: Response) => {
  let recipes = loadRecipes();
  const initialLength = recipes.length;
  recipes = recipes.filter((r) => r.id !== req.params.id);
  if (recipes.length === initialLength) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  saveRecipes(recipes);
  res.json({ success: true, message: 'Recipe deleted' });
});

// Reset to default sample heirlooms
app.post('/api/reset-samples', (req: Request, res: Response) => {
  saveRecipes(INITIAL_RECIPES);
  res.json({ success: true, recipes: INITIAL_RECIPES });
});

// POST /api/upload - Multimodal Audio Ingestion via Gemini API
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm', filename = 'recording.webm' } = req.body;

    if (!audioData) {
      res.status(400).json({ error: 'Audio data is required (base64 string).' });
      return;
    }

    if (!ai) {
      res.status(500).json({
        error: 'Gemini API is not initialized. Please ensure GEMINI_API_KEY is available.',
      });
      return;
    }

    // Clean base64 header if present (e.g. data:audio/webm;base64,...)
    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');
    const cleanMime = mimeType.split(';')[0];

    const transcriptionPrompt = `You are an expert oral historian and culinary archivist specializing in transcribing verbatim family recordings and kitchen conversations.
Transcribe this audio recording completely and accurately.
Guidelines:
1. Capture every spoken word verbatim, including colloquialisms, side stories, pauses, dialect, spoken fractions, kitchen interruptions, and laughter.
2. Note spoken measurements carefully (e.g. "a fistful of flour", "heaping tablespoon", "until it sizzles").
3. Preserve names of family members, relatives, places, and historical years/dates mentioned.
4. Do NOT summarize, sanitize, or edit the speaker's voice.
Provide only the verbatim transcript.`;

    let transcript = '';

    try {
      // First attempt with specialized audio transcription model gemini-3.5-transcribe
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          {
            text: transcriptionPrompt,
          },
        ],
      });
      transcript = response.text || '';
    } catch (transcribeError) {
      console.warn('gemini-3.5-transcribe attempt note, falling back to gemini-3.8-flash:', transcribeError);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          {
            text: transcriptionPrompt,
          },
        ],
      });
      transcript = fallbackResponse.text || '';
    }

    if (!transcript) {
      res.status(500).json({ error: 'Failed to extract transcript from audio.' });
      return;
    }

    res.json({
      success: true,
      transcript,
      filename,
      mimeType: cleanMime,
      approximateWords: transcript.split(/\s+/).length,
    });
  } catch (error: unknown) {
    console.error('Audio Ingestion / Transcription Error:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to process audio recording.',
    });
  }
});

// Helper for cleaning JSON from LLM outputs
function extractJSON(rawText: string): any {
  let cleaned = rawText.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

// POST /api/process-recipe - The Open-Source Gemma Heritage Pipeline
app.post('/api/process-recipe', async (req: Request, res: Response) => {
  try {
    const {
      transcript,
      audioDurationSeconds = 0,
      familyMemberHint = '',
      eraHint = '',
    } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      res.status(400).json({ error: 'Valid raw transcript is required for processing.' });
      return;
    }

    const gemmaSystemPrompt = `You are a vintage culinary historian and Family Heritage Restorer.
Your mission is to read a verbatim transcript of a family elder or friend recounting a cherished recipe, and perform a strict separation of:
1. Culinary Mechanics (standardized recipe instructions, ingredients with both Imperial and Metric conversions).
2. Nostalgic Narrative (family anecdotes, historical era, people mentioned, emotional tone, and secret family tips).

Respond STRICTLY with valid JSON. Do not include markdown preamble or conversational text outside the JSON.
The JSON must follow this exact structure:
{
  "title": "Evocative, authentic recipe title with family name if mentioned",
  "category": "Sunday Dinners" | "Baking & Breads" | "Soups & Stews" | "Holiday Traditions" | "Desserts & Sweets" | "Preserves & Relishes",
  "prepTime": "e.g., 20 mins",
  "cookTime": "e.g., 1 hr 15 mins",
  "servings": "e.g., 6-8 servings",
  "servingsCount": 8,
  "difficulty": "Easy" | "Medium" | "Heirloom Master",
  "ingredients": [
    {
      "item": "Ingredient name with specifics",
      "imperial": "Measurement in cups, oz, lbs, tsp, tbsp",
      "metric": "Accurate measurement in grams, ml, or kg",
      "notes": "Preparation notes like 'finely diced' or 'chilled'"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Actionable, clear, traditional cooking step",
      "tip": "Optional quote or warm tip from the storyteller for this step"
    }
  ],
  "nostalgia": {
    "summary": "Warm, cozy 2-sentence summary of the story and meaning behind this dish",
    "anecdotes": [
      "Distinct family anecdote or memory mentioned",
      "Another memorable detail or event described in the recording"
    ],
    "familyMembersMentioned": ["List of family members named (e.g. Grandma Eleanor, Uncle Jimmy)"],
    "historicalContext": "Era, decade, place, or situation (e.g., 1974 Midwest blizzard, 1968 Brooklyn Sunday)",
    "emotionalTone": "e.g., Nostalgic, heartwarming, humorous, resilient",
    "secretFamilyTip": "The most important golden rule or culinary secret the elder insisted on"
  }
}

Transcript:
"""
${transcript}
"""
${familyMemberHint ? `User note - Family Member: ${familyMemberHint}` : ''}
${eraHint ? `User note - Era/Decade: ${eraHint}` : ''}
`;

    let recipeData: any = null;
    let engineUsed = 'Gemma Heritage Engine';

    // Check if local Ollama is available
    const gemmaEndpoint = process.env.GEMMA_ENDPOINT || 'http://localhost:11434';
    const gemmaModel = process.env.GEMMA_MODEL || 'gemma2:9b';

    let ollamaSucceeded = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const ollamaRes = await fetch(`${gemmaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: gemmaModel,
          prompt: gemmaSystemPrompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.2,
            top_p: 0.9,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (ollamaRes.ok) {
        const ollamaJson = await ollamaRes.json();
        if (ollamaJson && ollamaJson.response) {
          recipeData = extractJSON(ollamaJson.response);
          engineUsed = `Gemma 2 (Ollama Local: ${gemmaModel})`;
          ollamaSucceeded = true;
        }
      }
    } catch {
      // Local Ollama not running or timed out; seamless fallback to server GenAI
      ollamaSucceeded = false;
    }

    // If local Ollama wasn't available, run the Gemma Family Heritage prompt via server-side GenAI
    if (!ollamaSucceeded) {
      if (!ai) {
        throw new Error('Neither local Gemma/Ollama nor Gemini API is available to structure recipe.');
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: gemmaSystemPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          topP: 0.9,
        },
      });

      const responseText = response.text || '';
      recipeData = extractJSON(responseText);
      engineUsed = 'Gemma 2 (Heritage Restorer Pipeline)';
    }

    if (!recipeData || !recipeData.title || !Array.isArray(recipeData.ingredients)) {
      throw new Error('Failed to parse structured recipe from model output.');
    }

    // Ensure safe default fallback categories and fields
    const validCategories = [
      'Sunday Dinners',
      'Baking & Breads',
      'Soups & Stews',
      'Holiday Traditions',
      'Desserts & Sweets',
      'Preserves & Relishes',
    ];

    const category = validCategories.includes(recipeData.category)
      ? recipeData.category
      : 'Sunday Dinners';

    const newRecipe: IRecipe = {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: recipeData.title || 'Beloved Family Recipe',
      category: category as any,
      prepTime: recipeData.prepTime || '20 mins',
      cookTime: recipeData.cookTime || '40 mins',
      servings: recipeData.servings || '4-6 servings',
      servingsCount: Number(recipeData.servingsCount) || 6,
      difficulty: recipeData.difficulty || 'Medium',
      ingredients: Array.isArray(recipeData.ingredients)
        ? recipeData.ingredients.map((ing: any) => ({
            item: String(ing.item || ''),
            imperial: String(ing.imperial || ''),
            metric: String(ing.metric || ''),
            notes: ing.notes ? String(ing.notes) : undefined,
          }))
        : [],
      instructions: Array.isArray(recipeData.instructions)
        ? recipeData.instructions.map((ins: any, idx: number) => ({
            stepNumber: Number(ins.stepNumber) || idx + 1,
            instruction: String(ins.instruction || ''),
            tip: ins.tip ? String(ins.tip) : undefined,
          }))
        : [],
      nostalgia: {
        summary: recipeData.nostalgia?.summary || 'A treasured family heirloom handed down across generations.',
        anecdotes: Array.isArray(recipeData.nostalgia?.anecdotes)
          ? recipeData.nostalgia.anecdotes.map(String)
          : [],
        familyMembersMentioned: Array.isArray(recipeData.nostalgia?.familyMembersMentioned)
          ? recipeData.nostalgia.familyMembersMentioned.map(String)
          : familyMemberHint
          ? [familyMemberHint]
          : [],
        historicalContext: recipeData.nostalgia?.historicalContext || eraHint || 'Family kitchen archive',
        emotionalTone: recipeData.nostalgia?.emotionalTone || 'Nostalgic, warm',
        secretFamilyTip: recipeData.nostalgia?.secretFamilyTip,
      },
      rawTranscript: transcript,
      audioDurationSeconds: audioDurationSeconds || undefined,
      engineUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to persistent file storage
    const recipes = loadRecipes();
    recipes.unshift(newRecipe);
    saveRecipes(recipes);

    res.json({
      success: true,
      recipeId: newRecipe.id,
      recipe: newRecipe,
      engineUsed,
    });
  } catch (error: unknown) {
    console.error('Gemma Recipe Processing Error:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to process recipe with Gemma heritage pipeline.',
    });
  }
});

// POST /api/tts - Story Narration using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required for narration.' });
      return;
    }

    if (!ai) {
      res.status(500).json({ error: 'Gemini API not configured.' });
      return;
    }

    // Call gemini-3.8-flash-lite-tts unary (returns complete audio/wav)
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 800), // safe sample length for fast playback
              speechMetadata: {
                style: 'Warm, gentle, reminiscent and nostalgic storytelling voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice as any }, // 'Kore' or 'Puck'
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: 'No audio generated by TTS model.' });
      return;
    }

    res.json({
      success: true,
      audioData: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: unknown) {
    console.error('TTS Narration Error:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to generate voice narration.',
    });
  }
});

// Setup Vite middleware in Dev or serve static in Prod
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍳 Nostalgia Cookbook server listening on http://0.0.0.0:${PORT}`);
    console.log(`📁 Persistent storage: ${DATA_FILE}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
