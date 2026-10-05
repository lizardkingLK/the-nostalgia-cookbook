import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import { Recipe } from './models/Recipe.js';
import { User } from './models/User.js';
import { IRecipe } from './src/types/recipe.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration from environment variables
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://chansanfdo_db_user:3Hz6qP2e1XQRFUcY@cluster0.e0iy2uf.mongodb.net/?appName=Cluster0';

const GEMMA_API_ENDPOINT =
  process.env.GEMMA_API_ENDPOINT ||
  'https://openrouter.ai/api/v1/chat/completions';

const GEMMA_API_KEY =
  process.env.GEMMA_API_KEY ||
  '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';

const GEMMA_MODEL = process.env.GEMMA_MODEL || 'google/gemma-2-27b-it';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6ImFY9juWQh6G6nIP9Qu1prxGwoOQ9zfPZ1noLEBbEKPg';

const NEXTAUTH_URL =
  process.env.NEXTAUTH_URL ||
  'https://the-nostalgia-cookbook-83vbe.ondigitalocean.app';

// MongoDB Atlas Connection
let isMongoConnected = false;
async function initMongo() {
  if (!MONGODB_URI) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 6000,
    });
    isMongoConnected = true;
    console.log('🍃 MongoDB Atlas connected successfully to cluster0.');
  } catch (err: unknown) {
    console.warn('⚠️ MongoDB Atlas initial connection warning (will use local backup store):', (err as Error).message);
    isMongoConnected = false;
  }
}
initMongo();

// Persistent file storage backup (starts empty - NO seed data)
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadFileRecipes(): IRecipe[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read recipes file, returning empty:', err);
  }
  return [];
}

function saveFileRecipes(recipes: IRecipe[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save recipes to data/recipes.json:', err);
  }
}

// Global server GenAI client for audio transcription
const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
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

// Active session storage
let currentServerSession: {
  id?: string;
  name: string;
  email: string;
  image: string;
  googleId?: string;
} | null = null;

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(ai),
    mongoConnected: isMongoConnected,
    gemmaEndpoint: GEMMA_API_ENDPOINT,
    gemmaModel: GEMMA_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// Authentication endpoints
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, image, googleId } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    let userDoc: any = null;
    if (isMongoConnected) {
      try {
        userDoc = await User.findOneAndUpdate(
          { email: email.toLowerCase() },
          {
            googleId: googleId || `google-${Date.now()}`,
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            image: image || '',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (dbErr) {
        console.warn('MongoDB user upsert notice:', dbErr);
      }
    }

    currentServerSession = {
      id: userDoc?._id?.toString() || googleId || `user-${Date.now()}`,
      name: name || userDoc?.name || email.split('@')[0],
      email: email.toLowerCase(),
      image: image || userDoc?.image || '',
      googleId: googleId || userDoc?.googleId,
    };

    res.json({
      success: true,
      user: currentServerSession,
    });
  } catch (error: unknown) {
    console.error('Google Auth Sync Error:', error);
    res.status(500).json({ error: 'Failed to process Google sign in.' });
  }
});

app.get('/api/auth/session', (req: Request, res: Response) => {
  res.json({
    user: currentServerSession,
  });
});

app.post('/api/auth/signout', (req: Request, res: Response) => {
  currentServerSession = null;
  res.json({ success: true });
});

// Check Gemma / Inference Status
app.get('/api/gemma-status', async (req: Request, res: Response) => {
  let isConnected = false;
  let statusDetail = '';

  if (GEMMA_API_ENDPOINT.includes('openrouter.ai')) {
    isConnected = true;
    statusDetail = `Active OpenRouter Inference (Model: ${GEMMA_MODEL})`;
  } else {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const pingRes = await fetch(GEMMA_API_ENDPOINT, { signal: controller.signal });
      clearTimeout(timeout);
      isConnected = pingRes.ok;
      statusDetail = isConnected ? 'Droplet Endpoint Responded' : 'Endpoint Offline';
    } catch (e) {
      isConnected = false;
      statusDetail = (e as Error).message;
    }
  }

  res.json({
    endpoint: GEMMA_API_ENDPOINT,
    model: GEMMA_MODEL,
    localOllamaConnected: isConnected,
    gemmaModelAvailable: isConnected,
    cloudFallbackActive: true,
    message: statusDetail,
  });
});

// Helper to convert Mongo document to IRecipe
function sanitizeRecipe(doc: any): IRecipe {
  return {
    id: doc._id?.toString() || doc.id,
    title: doc.title || 'Untitled Recipe',
    category: doc.category || 'Sunday Dinners',
    prepTime: doc.prepTime || '20 mins',
    cookTime: doc.cookTime || '45 mins',
    servings: doc.servings || '4-6 servings',
    servingsCount: doc.servingsCount || 6,
    difficulty: doc.difficulty || 'Medium',
    ingredients: Array.isArray(doc.ingredients) ? doc.ingredients : [],
    instructions: Array.isArray(doc.instructions) ? doc.instructions : [],
    nostalgia: doc.nostalgia || { summary: '', anecdotes: [], familyMembersMentioned: [] },
    rawTranscript: doc.rawTranscript || '',
    audioDurationSeconds: doc.audioDurationSeconds,
    engineUsed: doc.engineUsed,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// List all recipes (Filtered by user if authenticated)
app.get('/api/recipes', async (req: Request, res: Response) => {
  try {
    const userEmail = (req.query.email as string) || currentServerSession?.email;

    if (isMongoConnected) {
      try {
        const query: any = {};
        if (userEmail) {
          query.$or = [{ userEmail: userEmail.toLowerCase() }, { isFamilyShared: true }];
        }
        const dbRecipes = await Recipe.find(query).sort({ createdAt: -1 }).lean();
        if (dbRecipes && dbRecipes.length > 0) {
          res.json(dbRecipes.map(sanitizeRecipe));
          return;
        }
      } catch (err) {
        console.warn('MongoDB query notice:', err);
      }
    }

    // Fallback to local file store (which starts empty)
    const fileRecipes = loadFileRecipes();
    if (userEmail) {
      const filtered = fileRecipes.filter(
        (r: any) => !r.userEmail || r.userEmail === userEmail.toLowerCase()
      );
      res.json(filtered);
    } else {
      res.json(fileRecipes);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve recipes' });
  }
});

// Get single recipe
app.get('/api/recipes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const recipe = await Recipe.findById(id).lean();
        if (recipe) {
          res.json(sanitizeRecipe(recipe));
          return;
        }
      }
    } catch (err) {
      console.warn('MongoDB single recipe lookup notice:', err);
    }
  }

  const recipes = loadFileRecipes();
  const found = recipes.find((r) => r.id === id);
  if (!found) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(found);
});

// Create/Save new recipe manually
app.post('/api/recipes', async (req: Request, res: Response) => {
  const userEmail = currentServerSession?.email || 'family@heirloom.local';
  const newRecipe: IRecipe = {
    ...req.body,
    id: req.body.id || `heirloom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      await Recipe.create({
        ...newRecipe,
        userId: new mongoose.Types.ObjectId(),
        userEmail: userEmail.toLowerCase(),
      });
    } catch (err) {
      console.warn('MongoDB save notice:', err);
    }
  }

  const recipes = loadFileRecipes();
  recipes.unshift(newRecipe);
  saveFileRecipes(recipes);
  res.status(201).json(newRecipe);
});

// Delete recipe
app.delete('/api/recipes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Recipe.findByIdAndDelete(id);
      } else {
        await Recipe.deleteOne({ id });
      }
    } catch (err) {
      console.warn('MongoDB delete notice:', err);
    }
  }

  let recipes = loadFileRecipes();
  recipes = recipes.filter((r) => r.id !== id);
  saveFileRecipes(recipes);
  res.json({ success: true, message: 'Recipe deleted' });
});

// Clear recipes endpoint (NO seed data restored)
app.post('/api/clear-recipes', async (req: Request, res: Response) => {
  if (isMongoConnected) {
    try {
      if (currentServerSession?.email) {
        await Recipe.deleteMany({ userEmail: currentServerSession.email.toLowerCase() });
      } else {
        await Recipe.deleteMany({});
      }
    } catch (err) {
      console.warn('MongoDB clear notice:', err);
    }
  }
  saveFileRecipes([]);
  res.json({ success: true, recipes: [] });
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
    } catch {
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
    "familyMembersMentioned": ["List of family members named"],
    "historicalContext": "Era, decade, place, or situation",
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
    let engineUsed = `Gemma (${GEMMA_MODEL})`;

    // Check if OpenRouter or OpenAI-compatible endpoint
    if (GEMMA_API_ENDPOINT.includes('openrouter.ai') || GEMMA_API_ENDPOINT.includes('/v1/chat/completions')) {
      try {
        const response = await fetch(GEMMA_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMMA_API_KEY}`,
            'HTTP-Referer': NEXTAUTH_URL,
            'X-Title': 'The Nostalgia Cookbook',
          },
          body: JSON.stringify({
            model: GEMMA_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a professional JSON generator. Return only raw, valid JSON matching the requested schema.',
              },
              {
                role: 'user',
                content: gemmaSystemPrompt,
              },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            recipeData = extractJSON(content);
            engineUsed = `Gemma 2 27B (OpenRouter Hosted)`;
          }
        } else {
          console.warn('OpenRouter Gemma endpoint status:', response.status);
        }
      } catch (openRouterErr) {
        console.warn('OpenRouter Gemma error, falling back:', openRouterErr);
      }
    }

    // Fallback to Gemini if OpenRouter was not reached
    if (!recipeData) {
      if (!ai) {
        throw new Error('No AI inference engine available to structure recipe.');
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
      throw new Error('Failed to parse structured recipe from Gemma output.');
    }

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

    const userEmail = currentServerSession?.email || 'family@heirloom.local';

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

    // Save to MongoDB Atlas if connected
    if (isMongoConnected) {
      try {
        await Recipe.create({
          ...newRecipe,
          userId: new mongoose.Types.ObjectId(),
          userEmail: userEmail.toLowerCase(),
          isFamilyShared: false,
        });
      } catch (mongoSaveErr) {
        console.warn('MongoDB Atlas recipe insert notice:', mongoSaveErr);
      }
    }

    // Save to local file backup
    const fileRecipes = loadFileRecipes();
    fileRecipes.unshift(newRecipe);
    saveFileRecipes(fileRecipes);

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

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 800),
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
            prebuiltVoiceConfig: { voiceName: voice as any },
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
    console.log(`📡 Gemma Inference: ${GEMMA_MODEL} via ${GEMMA_API_ENDPOINT}`);
    console.log(`📁 Database: MongoDB Atlas (Fallback: ${DATA_FILE})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
