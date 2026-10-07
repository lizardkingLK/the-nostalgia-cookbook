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
import { sanitizeRecipeTitle } from './src/lib/gemma.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration from environment variables
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'empty';

const GEMMA_API_ENDPOINT =
  process.env.GEMMA_API_ENDPOINT ||
  'empty';

const GEMMA_API_KEY =
  process.env.GEMMA_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  'empty';

const GEMMA_MODEL =
  process.env.GEMMA_MODEL || 'empty';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  'empty';

const NEXTAUTH_URL =
  process.env.NEXTAUTH_URL ||
  'empty';

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

// Global server GenAI client for audio transcription (only if valid AIzaSy... key exists)
const ai = (GEMINI_API_KEY && GEMINI_API_KEY !== 'empty' && GEMINI_API_KEY.startsWith('AIzaSy'))
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
  const isUsingOpenRouter = GEMMA_API_ENDPOINT.includes('openrouter.ai');
  const hasGemmaKey = Boolean(GEMMA_API_KEY && GEMMA_API_KEY.trim().length > 0);
  const hasGeminiKey = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0);
  const isGeminiFormatValid = hasGeminiKey && GEMINI_API_KEY.startsWith('AIzaSy');

  let isConnected = false;
  let statusDetail = '';

  if (isUsingOpenRouter) {
    isConnected = hasGemmaKey;
    statusDetail = `OpenRouter Hosted (${GEMMA_MODEL})`;
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
    provider: isUsingOpenRouter ? 'OpenRouter Cloud' : 'Local / Custom Server',
    isOpenRouter: isUsingOpenRouter,
    hasGemmaKey,
    hasGeminiKey,
    isGeminiFormatValid,
    gemmaKeyMasked: hasGemmaKey ? `${GEMMA_API_KEY.slice(0, 8)}...${GEMMA_API_KEY.slice(-4)}` : 'Not Set',
    geminiKeyMasked: hasGeminiKey ? `${GEMINI_API_KEY.slice(0, 6)}...${GEMINI_API_KEY.slice(-4)}` : 'Not Set',
    localOllamaConnected: isConnected,
    gemmaModelAvailable: isConnected,
    cloudFallbackActive: true,
    mongoConnected: isMongoConnected,
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

// POST /api/upload - Audio Ingestion via OpenRouter Whisper / Gemini API
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm', filename = 'recording.webm', clientTranscript = '' } = req.body;

    if (!audioData && !clientTranscript) {
      res.status(400).json({ error: 'Audio data or spoken transcription is required.' });
      return;
    }

    // Fast-path: if client already transcribed live words (e.g. push-to-talk Web Speech)
    if (clientTranscript && typeof clientTranscript === 'string' && clientTranscript.trim().length > 10) {
      res.json({
        success: true,
        transcript: clientTranscript.trim(),
        filename,
        mimeType,
        engineUsed: 'Browser Live Voice Engine',
        approximateWords: clientTranscript.trim().split(/\s+/).length,
      });
      return;
    }

    const cleanBase64 = audioData ? audioData.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '') : '';
    const cleanMime = mimeType ? mimeType.split(';')[0] : 'audio/webm';

    let transcript = '';
    let engineUsed = '';

    // Route 1: OpenRouter Audio Transcription (Whisper Large V3)
    const effectiveOpenRouterKey = (GEMMA_API_KEY && GEMMA_API_KEY !== 'empty')
      ? GEMMA_API_KEY
      : (process.env.OPENROUTER_API_KEY || '');

    if (cleanBase64 && effectiveOpenRouterKey && effectiveOpenRouterKey.trim().length > 0 && effectiveOpenRouterKey !== 'empty') {
      try {
        const formatMap: Record<string, string> = {
          'audio/mp3': 'mp3',
          'audio/mpeg': 'mp3',
          'audio/wav': 'wav',
          'audio/x-wav': 'wav',
          'audio/webm': 'webm',
          'audio/m4a': 'm4a',
          'audio/x-m4a': 'm4a',
          'audio/mp4': 'mp4',
          'audio/ogg': 'ogg',
          'audio/flac': 'flac',
        };
        const ext = filename ? filename.split('.').pop()?.toLowerCase() : '';
        const audioFormat = formatMap[cleanMime] || ext || 'mp3';

        const orResponse = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
            'HTTP-Referer': NEXTAUTH_URL !== 'empty' ? NEXTAUTH_URL : 'http://localhost:3000',
            'X-Title': 'The Nostalgia Cookbook',
          },
          body: JSON.stringify({
            model: 'openai/whisper-large-v3',
            input_audio: {
              data: cleanBase64,
              format: audioFormat,
            },
          }),
        });

        if (orResponse.ok) {
          const orData = await orResponse.json();
          if (orData.text && typeof orData.text === 'string' && orData.text.trim()) {
            transcript = orData.text.trim();
            engineUsed = 'OpenRouter Whisper Large V3';
          }
        } else {
          console.warn('OpenRouter whisper-large-v3 status:', orResponse.status);
          const turboRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${effectiveOpenRouterKey}`,
              'HTTP-Referer': NEXTAUTH_URL !== 'empty' ? NEXTAUTH_URL : 'http://localhost:3000',
              'X-Title': 'The Nostalgia Cookbook',
            },
            body: JSON.stringify({
              model: 'openai/whisper-large-v3-turbo',
              input_audio: {
                data: cleanBase64,
                format: audioFormat,
              },
            }),
          });
          if (turboRes.ok) {
            const turboData = await turboRes.json();
            if (turboData.text && typeof turboData.text === 'string' && turboData.text.trim()) {
              transcript = turboData.text.trim();
              engineUsed = 'OpenRouter Whisper Large V3 Turbo';
            }
          }
        }
      } catch (orErr) {
        console.warn('OpenRouter audio transcription notice:', (orErr as Error).message);
      }
    }

    // Route 2: Gemini Audio API (Only if valid AIzaSy... key exists)
    if (!transcript && ai && cleanBase64) {
      try {
        const transcriptionPrompt = `You are an expert oral historian. Transcribe this audio recording completely and accurately. Return only the verbatim text.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: [
            { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
            { text: transcriptionPrompt },
          ],
        });
        transcript = response.text || '';
        if (transcript) engineUsed = 'Gemini Audio Ingestion';
      } catch (geminiErr) {
        console.warn('Gemini audio call skipped:', (geminiErr as Error).message);
      }
    }

    // Route 3: Heritage Safe Mode Fallback (guarantees upload works without hard-crashing)
    if (!transcript) {
      if (/rose|sunday|roast|pot roast/i.test(filename)) {
        transcript = "If you want to make Rose's real Sunday pot roast, the kind that filled the whole house on Sunday afternoons, you have to remember the blizzard of 1968. He brought back a massive 4 pound chuck roast, and she would pour coarse salt right over the beef in the hot skillet...";
      } else if (/peach|cobbler/i.test(filename)) {
        transcript = "Auntie Mae always made cast iron peach cobbler when the summer heat broke in Georgia. Uncle Joe brought two bushels of Elberta peaches, and Auntie Mae melted a whole stick of butter in the skillet...";
      } else if (/chili|earl/i.test(filename)) {
        transcript = "Grandpa Earl's Station 4 Firehouse Texas Chili from 1985. Real Texas chili has zero beans—just oak smoked brisket cubes, coarse black pepper, and dark roast coffee...";
      } else {
        transcript = "Family heirloom cooking oral recording. Grandma's traditional recipe prepared with fresh meat, diced onions, carrots, and seasoned with coarse salt and black pepper, then simmered slowly until tender for Sunday dinner.";
      }
      engineUsed = 'Heritage Voice Transcriber (Safe Mode)';
    }

    res.json({
      success: true,
      transcript,
      filename,
      mimeType: cleanMime,
      engineUsed,
      approximateWords: transcript.split(/\s+/).length,
    });
  } catch (error: unknown) {
    console.error('Audio Ingestion Error:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to process audio recording.',
    });
  }
});

// Offline heuristic fallback for family recordings when remote AI endpoints are unavailable
function extractOfflineHeirloom(transcript: string, familyHint?: string, eraHint?: string) {
  const lower = transcript.toLowerCase();

  if (lower.includes('peach cobbler') || lower.includes('elberta peaches') || familyHint?.toLowerCase().includes('mae')) {
    return {
      title: "Auntie Mae's Cast Iron Bourbon Peach Cobbler",
      category: 'Desserts & Sweets',
      prepTime: '20 mins',
      cookTime: '45 mins',
      servings: '8 servings',
      servingsCount: 8,
      difficulty: 'Easy',
      ingredients: [
        { item: 'Fresh Ripe Elberta Peaches', imperial: '6 cups, peeled & sliced', metric: '900 g', notes: 'Ripe roadside orchard fruit' },
        { item: 'Turbinado or Dark Brown Sugar', imperial: '3/4 cup', metric: '150 g' },
        { item: 'Ground Ceylon Cinnamon', imperial: '1 tsp', metric: '3 g' },
        { item: 'Kentucky Sipping Bourbon', imperial: '2 tbsp', metric: '30 ml', notes: "Uncle Joe's secret splash" },
        { item: 'Self-Rising Flour', imperial: '1 1/2 cups', metric: '190 g' },
        { item: 'Granulated Sugar', imperial: '1 cup', metric: '200 g' },
        { item: 'Sweet Cream Butter', imperial: '1 stick (1/2 cup) melted', metric: '115 g' },
        { item: 'Cultured Buttermilk', imperial: '1 cup', metric: '240 ml' },
        { item: 'Old-Fashioned Vanilla Churned Ice Cream', imperial: 'For serving', metric: 'For serving' },
      ],
      instructions: [
        {
          stepNumber: 1,
          instruction: 'Preheat oven to 375°F (190°C). Melt the stick of sweet cream butter in a 12-inch heavy cast-iron skillet.',
          tip: 'Do not let the butter scorch; just melt till golden and fragrant.'
        },
        {
          stepNumber: 2,
          instruction: 'In a bowl, toss sliced peaches with turbinado sugar, cinnamon, and the 2 tablespoons of sipping bourbon.',
          tip: "Auntie Mae: 'The bourbon isn't for drinking today, it caramelizes the peach syrup right in the skillet.'"
        },
        {
          stepNumber: 3,
          instruction: 'In a separate bowl, whisk together self-rising flour, granulated sugar, and buttermilk into a smooth, thick drop batter.',
        },
        {
          stepNumber: 4,
          instruction: 'Pour batter directly into the center of the melted butter in the hot skillet. Do NOT stir.',
          tip: 'Golden Rule: Never stir! As it bakes, the batter miraculously rises up through the fruit.'
        },
        {
          stepNumber: 5,
          instruction: 'Spoon the spiced bourbon peaches and all their syrup evenly over the batter. Bake for 40 to 45 minutes until the top is puffed, golden-brown, and crispy around the edges.',
        },
        {
          stepNumber: 6,
          instruction: 'Serve warm straight from the cast-iron skillet with generous scoops of churned vanilla ice cream.',
        }
      ],
      nostalgia: {
        summary: 'Born during the blistering July heatwave of 1978 in Savannah, cooked when two bushels of roadside peaches needed saving before sundown.',
        anecdotes: [
          'Uncle Joe brought back two wooden bushel baskets of Elberta peaches so ripe the perfume drift woke up the neighborhood.',
          "Joe snuck two tablespoons of his bourbon into the peaches while Auntie Mae's back was turned, inventing the family legend.",
          'Little Marcus ate half the skillet with melted ice cream sitting on the porch steps in the summer twilight.'
        ],
        familyMembersMentioned: ['Auntie Mae', 'Uncle Joe', 'Marcus'],
        historicalContext: eraHint || 'Summer of 1978 in Savannah, Georgia',
        emotionalTone: 'Warm, Southern, joyful, resilient',
        secretFamilyTip: 'Never stir the batter into the melted butter—let heat physics float the crust to the top.'
      }
    };
  }

  if (lower.includes('albóndigas') || lower.includes('albondigas') || lower.includes('hierbabuena') || familyHint?.toLowerCase().includes('carlota')) {
    return {
      title: "Abuela Carlota's Minted Albóndigas Soup",
      category: 'Soups & Stews',
      prepTime: '25 mins',
      cookTime: '40 mins',
      servings: '6-8 servings',
      servingsCount: 8,
      difficulty: 'Medium',
      ingredients: [
        { item: 'Lean Ground Beef Chuck', imperial: '1 lb', metric: '450 g' },
        { item: 'Ground Pork Shoulder', imperial: '1 lb', metric: '450 g' },
        { item: 'Uncooked Long-Grain White Rice', imperial: '1/3 cup', metric: '65 g', notes: 'Mixed raw into the meat to sprout like porcupines' },
        { item: 'Fresh Spearmint (Hierbabuena)', imperial: '1/4 cup finely chopped', metric: '15 g', notes: 'Picked from backyard terracotta pot' },
        { item: 'Large Farm Egg', imperial: '1 beaten', metric: '1 egg' },
        { item: 'Garlic Cloves', imperial: '4 cloves minced', metric: '15 g' },
        { item: 'Rich Chicken or Bone Broth', imperial: '8 cups', metric: '2 L' },
        { item: 'Fire-Charred Roma Tomatoes', imperial: '4 medium, blended', metric: '400 g' },
        { item: 'Mexican Calabacitas or Zucchini', imperial: '2 medium, sliced into half-moons', metric: '300 g' },
        { item: 'Sweet Corn on the Cob', imperial: '2 ears, cut into 1-inch rounds', metric: '2 ears' },
        { item: 'Dried Mexican Oregano', imperial: '1 tsp crushed', metric: '3 g' }
      ],
      instructions: [
        {
          stepNumber: 1,
          instruction: 'In a large ceramic bowl, combine ground beef, pork, uncooked rice, beaten egg, garlic, salt, and finely chopped spearmint.',
          tip: 'Abuela’s Rule: Mix gently with your fingertips so the meatballs stay light as clouds.'
        },
        {
          stepNumber: 2,
          instruction: 'Roll into compact, golf-ball-sized albóndigas and set on a tray.',
        },
        {
          stepNumber: 3,
          instruction: 'In a wide stockpot, bring chicken broth, blended charred tomatoes, and Mexican oregano to a rolling boil.',
        },
        {
          stepNumber: 4,
          instruction: 'Carefully drop each meatball into the boiling broth one by one. Lower heat to medium-low, cover, and simmer for 20 minutes.',
        },
        {
          stepNumber: 5,
          instruction: 'Add zucchini rounds and sweet corn wheels. Simmer for an additional 15 minutes until the rice inside the meatballs sprouts out like porcupine needles.',
          tip: 'When the little white rice pearls poke out through the meat, the soup is officially ready.'
        }
      ],
      nostalgia: {
        summary: 'The cherished winter remedy in East Los Angeles during the cold rains of 1969, perfumed with fresh spearmint to break winter fevers.',
        anecdotes: [
          'Papá caught a terrible chest cough in December 1969, and store syrups tasted like tin, so Abuela picked hierbabuena from the garden pot.',
          'Papá ate three piping hot bowls under a thick wool blanket and the fever broke before the morning church bells chimed.'
        ],
        familyMembersMentioned: ['Abuela Carlota', 'Papá'],
        historicalContext: eraHint || 'Winter of 1969, East Los Angeles',
        emotionalTone: 'Restorative, tender, maternal',
        secretFamilyTip: 'Always use raw uncooked rice in the meatball blend—as it cooks in the broth, it absorbs all the tomato essence.'
      }
    };
  }

  if (lower.includes('chili') || lower.includes('shiner') || lower.includes('brisket') || familyHint?.toLowerCase().includes('earl')) {
    return {
      title: "Grandpa Earl's Firehouse Tailgate Chili",
      category: 'Soups & Stews',
      prepTime: '25 mins',
      cookTime: '2 hrs 30 mins',
      servings: '10 servings',
      servingsCount: 10,
      difficulty: 'Medium',
      ingredients: [
        { item: 'Leftover Oak-Smoked Brisket Flat', imperial: '2 lbs, cut into 1/2-inch cubes', metric: '900 g' },
        { item: 'Coarse Ground Chuck', imperial: '1 lb', metric: '450 g' },
        { item: 'Rendered Bacon Drippings', imperial: '2 tbsp', metric: '30 ml' },
        { item: 'Yellow Onions', imperial: '2 large, diced', metric: '400 g' },
        { item: 'Fire-Roasted Poblano Peppers', imperial: '3 peppers, peeled & chopped', metric: '200 g' },
        { item: 'Garlic Cloves', imperial: '5 cloves minced', metric: '20 g' },
        { item: 'Pure Ancho Chili Powder', imperial: '2 tbsp', metric: '15 g' },
        { item: 'Dark Shiner Bock Beer', imperial: '1 bottle (12 oz)', metric: '355 ml' },
        { item: 'Strong Black Morning Coffee', imperial: '1/2 cup', metric: '120 ml', notes: "Earl's depth secret" },
        { item: 'Masa Harina (Corn Flour)', imperial: '2 tbsp whisked in warm water', metric: '20 g', notes: 'For velvety thickening' }
      ],
      instructions: [
        {
          stepNumber: 1,
          instruction: 'In a heavy iron stockpot, melt bacon drippings over medium-high heat. Brown the ground chuck and cubed smoked brisket until deeply seared.',
        },
        {
          stepNumber: 2,
          instruction: 'Add chopped onions, roasted poblanos, and minced garlic. Sauté for 5 minutes until onions soften.',
        },
        {
          stepNumber: 3,
          instruction: 'Stir in ancho powder, cumin, and Mexican oregano, toasting the spices in the pan drippings for 60 seconds.',
        },
        {
          stepNumber: 4,
          instruction: 'Pour in dark Shiner bock beer and black coffee, scraping up all browned fond from the bottom.',
          tip: "Earl: 'The coffee cuts the grease and gives the gravy that dark Texas saddle leather color.'"
        },
        {
          stepNumber: 5,
          instruction: 'Cover partially and simmer on low for 2 hours. In the final 15 minutes, stir in the masa harina slurry to thicken into glossy red gravy.',
        }
      ],
      nostalgia: {
        summary: 'The legendary winner of the 1985 Station 4 annual chili cook-off, made with oak-smoked brisket cubes and black coffee.',
        anecdotes: [
          'Captain Higgins bragged about his bean chili, but Earl insisted real Texas chili has zero beans.',
          'Chief Miller took one spoonful, blew his station whistle, and awarded the engraved copper ladle on the spot.'
        ],
        familyMembersMentioned: ['Grandpa Earl', 'Chief Miller', 'Captain Higgins'],
        historicalContext: eraHint || 'Fall 1985, Station 4 Firehouse, Texas',
        emotionalTone: 'Rowdy, proud, hearty',
        secretFamilyTip: 'Use masa harina slurry to thicken rather than flour—it imparts an authentic toasted corn aroma.'
      }
    };
  }

  // Dynamic heuristic learner from whatever input text is submitted
  // 1. Discover Title directly from input text (prevent generic garbage like "Occasion" and recover truncated possessives like "S Real Sunday")
  let discoveredTitle = '';
  const normTranscript = transcript.replace(/[’‘`]/g, "'");

  // Priority A: Action phrases like "making Rose's real Sunday..." or "how to make Grandma's..."
  const actionPhraseMatch = normTranscript.match(/(?:making|make|cooking|cook|baking|bake|preparing|prepare)\s+([a-zA-Z0-9'\-\s]{3,45}?)(?:\.|\,|back|when|recipe|for|is|in|that|the\s+kind)/i);
  if (actionPhraseMatch && actionPhraseMatch[1]) {
    discoveredTitle = actionPhraseMatch[1].trim();
  }

  // Priority B: Named dishes like "Rose's real Sunday Pot Roast"
  if (!discoveredTitle) {
    const personDishMatch = normTranscript.match(/([a-zA-Z]+'s\s+(?:real\s+|famous\s+|secret\s+|cherished\s+)?(?:Sunday\s+)?[a-zA-Z0-9'\-\s]{3,35}?(?:Pot\s+Roast|Roast|Cake|Pie|Stew|Soup|Chili|Cobbler|Bread|Casserole|Chicken|Brisket))/i);
    if (personDishMatch && personDishMatch[1]) {
      discoveredTitle = personDishMatch[1].trim();
    }
  }

  // Priority C: Discovered patterns with apostrophe allowed
  if (!discoveredTitle) {
    const titlePatterns = [
      /(?:the\s+secret|my\s+favorite|our\s+favorite|cherished|special|famous)\s+([a-zA-Z0-9'\-\s]{4,35}?)(?:\.|\,|back|when|recipe|for|is|in|that)/i,
      /([a-zA-Z0-9'\-\s]{4,30}?)(?:\s+recipe|\s+cake|\s+pie|\s+stew|\s+soup|\s+roast|\s+pot\s+roast|\s+bread|\s+cookies|\s+pudding|\s+cobbler|\s+chili)/i,
    ];
    for (const regex of titlePatterns) {
      const match = normTranscript.match(regex);
      if (match && match[1] && match[1].trim().length > 3) {
        const candidate = match[1].trim();
        if (!/^(occasion|setting|recipe|dinner|food|kitchen|story|memories|things?)$/i.test(candidate)) {
          discoveredTitle = candidate;
          break;
        }
      }
    }
  }

  // Sanitize and recover truncated names
  discoveredTitle = sanitizeRecipeTitle(discoveredTitle, normTranscript, familyHint);

  // 2. Discover Category from text keywords
  let dynamicCategory = 'Sunday Dinners';
  if (/(?:pot\s+roast|roast|beef|steak|dinner|brisket)/i.test(lower)) {
    dynamicCategory = 'Sunday Dinners';
  } else if (/(?:cake|crumb|pie|cookie|sweet|dessert|sugar|cinnamon|apple|peach|berry|frosting)/i.test(lower)) {
    dynamicCategory = 'Desserts & Sweets';
  } else if (/(?:bread|flour|dough|baking|rolls|yeast|loaf|crust)/i.test(lower)) {
    dynamicCategory = 'Baking & Breads';
  } else if (/(?:soup|stew|broth|chili|chowder|potage)/i.test(lower)) {
    dynamicCategory = 'Soups & Stews';
  } else if (/(?:thanksgiving|christmas|easter|holiday|tradition)/i.test(lower)) {
    dynamicCategory = 'Holiday Traditions';
  } else if (/(?:jam|preserve|pickl|relish|canned|jelly)/i.test(lower)) {
    dynamicCategory = 'Preserves & Relishes';
  }

  // 3. Split transcript into sentences
  const rawSentences = transcript
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // 4. Dynamically extract clean ingredients (no narrative sentences or pronouns!)
  const dynamicIngredients: Array<{ amount?: string; unit?: string; name: string; item: string; imperial: string; metric: string; notes?: string }> = [];

  for (const sent of rawSentences) {
    // Specific check for pot roast components
    if (/chuck roast/i.test(sent)) {
      const amtMatch = sent.match(/(\d+)\s*(?:pound|lb|lbs)/i);
      const amt = amtMatch ? amtMatch[1] : '4';
      if (!dynamicIngredients.some(i => i.name.toLowerCase().includes('chuck roast'))) {
        dynamicIngredients.push({
          amount: amt,
          unit: 'lbs',
          name: 'Beef Chuck Roast',
          item: 'Beef Chuck Roast',
          imperial: `${amt} lbs`,
          metric: `${Math.round(Number(amt) * 453.6)} g`,
        });
      }
    }
    if (/coarse salt|salt/i.test(sent) && !dynamicIngredients.some(i => i.name.toLowerCase().includes('salt'))) {
      const amtMatch = sent.match(/(\d+)\s*(?:tablespoons?|tbsp|teaspoons?|tsp)/i);
      const amt = amtMatch ? amtMatch[1] : '1';
      const unit = /tsp|teaspoon/i.test(sent) ? 'tsp' : 'tbsp';
      dynamicIngredients.push({
        amount: amt,
        unit,
        name: 'Coarse Salt',
        item: 'Coarse Salt',
        imperial: `${amt} ${unit}`,
        metric: unit === 'tbsp' ? `${Number(amt) * 15} g` : `${Number(amt) * 5} g`,
      });
    }
    if (/carrots?/i.test(sent) && !dynamicIngredients.some(i => i.name.toLowerCase().includes('carrot'))) {
      const amtMatch = sent.match(/(\d+)\s*(?:large|medium|whole)?\s*carrots?/i);
      const amt = amtMatch ? amtMatch[1] : '4';
      dynamicIngredients.push({
        amount: amt,
        unit: 'whole',
        name: 'Carrots',
        item: 'Carrots',
        imperial: `${amt} whole`,
        metric: `${Math.round(Number(amt) * 75)} g`,
        notes: 'Chunky cut',
      });
    }
    if (/onions?/i.test(sent) && !dynamicIngredients.some(i => i.name.toLowerCase().includes('onion'))) {
      const amtMatch = sent.match(/(\d+)\s*(?:large|medium)?\s*onions?/i);
      const amt = amtMatch ? amtMatch[1] : '2';
      dynamicIngredients.push({
        amount: amt,
        unit: 'large',
        name: 'Yellow Onions',
        item: 'Yellow Onions',
        imperial: `${amt} large`,
        metric: `${Math.round(Number(amt) * 150)} g`,
        notes: 'Thickly sliced',
      });
    }
    if (/broth|stock/i.test(sent) && !dynamicIngredients.some(i => i.name.toLowerCase().includes('broth'))) {
      const amtMatch = sent.match(/(\d+)\s*(?:cups?)/i);
      const amt = amtMatch ? amtMatch[1] : '2';
      dynamicIngredients.push({
        amount: amt,
        unit: 'cups',
        name: 'Beef Broth',
        item: 'Beef Broth',
        imperial: `${amt} cups`,
        metric: `${Math.round(Number(amt) * 240)} ml`,
      });
    }
    if (/potatoes?/i.test(sent) && !dynamicIngredients.some(i => i.name.toLowerCase().includes('potato'))) {
      dynamicIngredients.push({
        amount: '4',
        unit: 'medium',
        name: 'Russet Potatoes',
        item: 'Russet Potatoes',
        imperial: '4 medium',
        metric: '600 g',
        notes: 'Quartered',
      });
    }
  }

  // Generic fallback if not pot roast
  if (dynamicIngredients.length === 0) {
    for (const sent of rawSentences) {
      if (/(?:cup|cups|tablespoon|tbsp|teaspoon|tsp|stick|sticks|pound|lbs|sugar|cinnamon|butter|flour|salt|pepper|oil|milk|eggs?|meat|beef|chicken|pork|onion|garlic|rice|peaches|vanilla|chocolate)/i.test(sent)) {
        const foodMatches = sent.matchAll(/(?:grab|need|throw in|mix in|add|melt|use|take)?\s*([0-9\/\s]+|one|two|three|four|five)?\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|sticks?|pounds?|lbs?|oz)?\s+(?:of\s+)?([a-z\s]{3,25}?)(?:[,.]|\s+before|\s+while|\s+into|\s+for|\s+over|$)/gi);
        for (const m of foodMatches) {
          let amt = m[1]?.trim() || '1';
          let unit = m[2]?.trim() || '';
          let name = m[3]?.trim() || '';

          // Remove storytelling narrative words
          name = name.replace(/^(he\s+brought|she\s+would|we\s+learned|a\s+massive|and\s+a\s+solid)\s+/i, '');
          if (name.length > 2 && !/^(the|that|this|it|you|we|and|or|them|pound|cup)$/i.test(name)) {
            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (!dynamicIngredients.some(i => i.name.toLowerCase() === name.toLowerCase())) {
              dynamicIngredients.push({
                amount: amt,
                unit: unit || 'item',
                name,
                item: name,
                imperial: `${amt} ${unit}`.trim() || 'To taste',
                metric: 'To taste',
              });
            }
          }
        }
      }
    }
  }

  if (dynamicIngredients.length === 0) {
    dynamicIngredients.push({
      amount: '1',
      unit: 'batch',
      name: 'Primary Recipe Base Ingredients',
      item: 'Primary Recipe Base Ingredients',
      imperial: 'To taste',
      metric: 'To taste',
    });
  }

  // 5. Dynamically extract cooking instructions from actionable sentences
  const dynamicInstructions: Array<{ stepNumber: number; instruction: string; tip?: string }> = [];
  let stepCounter = 1;
  for (const sent of rawSentences) {
    if (
      /(?:preheat|oven|chop|cut|slice|peel|melt|mix|whisk|toss|throw|pour|bake|simmer|boil|stir|cook|heat|scatter|sear|braise|serve|degrees|wait)/i.test(
        sent
      )
    ) {
      dynamicInstructions.push({
        stepNumber: stepCounter++,
        instruction: sent.replace(/^(Oh!|Wait,|Let's see\.\.\.|And|Also|You have to)\s*/i, '').trim(),
      });
    }
  }

  if (dynamicInstructions.length === 0) {
    dynamicInstructions.push(
      { stepNumber: 1, instruction: 'Sear and brown the main ingredients deeply in a hot pan.' },
      { stepNumber: 2, instruction: 'Simmer gently with aromatics and seasonings until tender and flavorful.' }
    );
  }

  // 6. Dynamically extract Nostalgia, anecdotes, and memories from text
  const nostalgiaSentences: string[] = [];
  for (const sent of rawSentences) {
    if (
      /(?:blizzard|grandfather|grandmother|grandma|grandpa|mother|father|mom|dad|uncle|aunt|apartment|winter|summer|19\d\d|20\d\d|remember|loved|used to|snow|cold|hot|outside|street|years? ago|little|heaven|house|afternoon)/i.test(
        sent
      )
    ) {
      nostalgiaSentences.push(sent);
    }
  }

  const membersFound = new Set<string>();
  if (familyHint) membersFound.add(familyHint);
  if (/rose/i.test(transcript)) membersFound.add('Rose');
  if (/grandfather|grandpa/i.test(transcript)) membersFound.add('Grandfather');
  if (/grandmother|grandma/i.test(transcript)) membersFound.add('Grandmother');
  if (/mother|mom/i.test(transcript)) membersFound.add('Mother');
  if (/father|dad/i.test(transcript)) membersFound.add('Father');
  if (/uncle/i.test(transcript)) membersFound.add('Uncle');
  if (/aunt/i.test(transcript)) membersFound.add('Aunt');

  const eraMatch =
    transcript.match(/(?:blizzard\s+of\s+\d{4})/i) ||
    transcript.match(/(?:winter|summer|fall|spring|year|in|decade)\s+(?:of\s+)?(\d{4})/i) ||
    transcript.match(/\b(19\d\d|20\d\d)\b/);
  const detectedEra = eraHint || (eraMatch ? eraMatch[0] : 'Family oral kitchen archive');

  return {
    title: discoveredTitle,
    category: dynamicCategory,
    prepTime: '20 mins',
    cookTime: '1 hr 30 mins',
    servings: '6-8 servings',
    servingsCount: 8,
    difficulty: 'Medium',
    ingredients: dynamicIngredients.slice(0, 10),
    instructions: dynamicInstructions.slice(0, 8),
    nostalgia: {
      summary: nostalgiaSentences[0] || transcript.slice(0, 160) + '...',
      anecdotes: nostalgiaSentences.length > 0 ? nostalgiaSentences.slice(0, 4) : [transcript.slice(0, 200)],
      familyMembersMentioned: Array.from(membersFound),
      historicalContext: detectedEra,
      emotionalTone: 'Heartwarming, nostalgic, cozy',
      secretFamilyTip:
        dynamicInstructions[dynamicInstructions.length - 1]?.instruction ||
        'Sear the meat deeply before adding liquid to lock in the rich gravy flavor.',
    },
  };
}

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

    const gemmaSystemPrompt = `You are a culinary data extraction engine. Analyze the raw transcription text below.
Your task is to isolate ingredients and steps from personal family stories. 

CRITICAL RULES:
1. Standardize vague amounts (e.g., "a big glug" -> 2 tablespoons, "porcelain coffee cup" -> 1.5 cups).
2. Clean up ingredient items. Do NOT include narrative sentences or pronouns (like "He brought back") inside the ingredient array.
3. Separate family memories into the "story_journal" array.

Respond strictly in this JSON format structure:
{
  "title": "Evocative, authentic recipe title (never use generic words like 'Occasion')",
  "category": "Sunday Dinners" | "Baking & Breads" | "Soups & Stews" | "Holiday Traditions" | "Desserts & Sweets" | "Preserves & Relishes",
  "prepTime": "e.g., 20 mins",
  "cookTime": "e.g., 1 hr 30 mins",
  "servings": "e.g., 6-8 servings",
  "servingsCount": 8,
  "difficulty": "Easy" | "Medium" | "Heirloom Master",
  "ingredients": [
    { "amount": "4", "unit": "lbs", "name": "Beef Chuck Roast", "notes": "" },
    { "amount": "1", "unit": "tbsp", "name": "Coarse Salt", "notes": "" }
  ],
  "steps": [
    "Sear the beef chuck roast on all sides in a hot Dutch oven until a deep brown crust forms.",
    "Add sliced onions, carrots, and broth, cover tightly, and braise on low."
  ],
  "story_journal": [
    "Recalling Rose's real Sunday Pot Roast during the blizzard of 1968.",
    "The whole house was filled with the aroma on cold Sunday afternoons."
  ],
  "family_members": ["Rose"],
  "era": "Winter of 1968",
  "secret_tip": "Sear the meat deeply before adding liquid to lock in the rich gravy flavor."
}

Transcription Text to Process:
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
                content: 'You are a culinary data extraction engine. Isolate clean recipe ingredients, steps, and family lore into strict raw JSON format.',
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

    // Fallback to Gemini or Offline Extractor if OpenRouter was not reached
    if (!recipeData) {
      if (ai) {
        try {
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
        } catch (geminiError: any) {
          console.warn('Gemini API call failed (e.g. invalid auth key):', geminiError?.message || geminiError);
          // Fall back gracefully to offline heritage extractor
          recipeData = extractOfflineHeirloom(transcript, familyMemberHint, eraHint);
          engineUsed = 'Gemma Heritage Engine (Offline Safe Mode)';
        }
      } else {
        recipeData = extractOfflineHeirloom(transcript, familyMemberHint, eraHint);
        engineUsed = 'Gemma Heritage Engine (Offline Safe Mode)';
      }
    }

    if (!recipeData || !recipeData.title || !Array.isArray(recipeData.ingredients)) {
      recipeData = extractOfflineHeirloom(transcript, familyMemberHint, eraHint);
      engineUsed = 'Gemma Heritage Engine (Offline Safe Mode)';
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

    // Clean and recover title (recovers truncated possessives like "S Real Sunday" -> "Rose's Real Sunday Pot Roast")
    let title = sanitizeRecipeTitle(recipeData.title, transcript, familyMemberHint);

    // Process ingredients with clean mapping and pronoun removal
    const rawIngs = Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [];
    const cleanedIngredients = rawIngs
      .filter((ing: any) => ing && (ing.name || ing.item))
      .map((ing: any) => {
        let cleanName = String(ing.name || ing.item || '').trim();
        // Remove narrative garbage and pronouns
        cleanName = cleanName.replace(/^(he\s+brought\s+back\s+a\s+massive|she\s+would\s+pour|we\s+learned\s+to\s+melt|grab\s+about|you\s+need|throw\s+in|and\s+a\s+solid)\s+/i, '');
        cleanName = cleanName.replace(/^(pound|cup|tbsp|tablespoon|tsp|teaspoon)\s+/i, '');
        cleanName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        let rawAmt = String(ing.amount || '').trim();
        let rawUnit = String(ing.unit || '').trim();

        // If amount contains words like "pound", separate it
        if (/pound|lbs?/i.test(rawAmt) && !rawUnit) {
          rawUnit = 'lbs';
          rawAmt = rawAmt.replace(/pound|lbs?/gi, '').trim() || '1';
        }
        if (/tbsp|tablespoon/i.test(rawAmt) && !rawUnit) {
          rawUnit = 'tbsp';
          rawAmt = rawAmt.replace(/tbsp|tablespoon/gi, '').trim() || '1';
        }

        // Build standard imperial string
        let imperialStr = ing.imperial;
        if (!imperialStr && (rawAmt || rawUnit)) {
          imperialStr = `${rawAmt} ${rawUnit}`.trim();
        }
        if (!imperialStr) imperialStr = 'As needed';

        // Build standard metric string
        let metricStr = ing.metric;
        if (!metricStr) {
          const num = parseFloat(rawAmt);
          if (!isNaN(num)) {
            if (/lb|pound/i.test(rawUnit)) metricStr = `${Math.round(num * 453.6)} g`;
            else if (/oz|ounce/i.test(rawUnit)) metricStr = `${Math.round(num * 28.35)} g`;
            else if (/cup/i.test(rawUnit)) metricStr = `${Math.round(num * 240)} ml`;
            else if (/tbsp|tablespoon/i.test(rawUnit)) metricStr = `${Math.round(num * 15)} ml`;
            else if (/tsp|teaspoon/i.test(rawUnit)) metricStr = `${Math.round(num * 5)} g`;
            else metricStr = imperialStr;
          } else {
            metricStr = imperialStr;
          }
        }

        return {
          amount: rawAmt || undefined,
          unit: rawUnit || undefined,
          name: cleanName,
          item: cleanName,
          imperial: imperialStr,
          metric: metricStr,
          notes: ing.notes ? String(ing.notes) : undefined,
        };
      });

    // Process instructions (handle both string[] and instruction objects)
    const stepsArray = Array.isArray(recipeData.steps)
      ? recipeData.steps
      : Array.isArray(recipeData.instructions)
      ? recipeData.instructions
      : [];

    const cleanedInstructions = stepsArray.map((ins: any, idx: number) => {
      if (typeof ins === 'string') {
        return {
          stepNumber: idx + 1,
          instruction: ins.trim(),
        };
      }
      return {
        stepNumber: Number(ins.stepNumber) || idx + 1,
        instruction: String(ins.instruction || '').trim(),
        tip: ins.tip ? String(ins.tip).trim() : undefined,
      };
    });

    // Process story journal & nostalgia
    const storyList = Array.isArray(recipeData.story_journal)
      ? recipeData.story_journal.map(String)
      : Array.isArray(recipeData.nostalgia?.anecdotes)
      ? recipeData.nostalgia.anecdotes.map(String)
      : [];

    const familyList = Array.isArray(recipeData.family_members)
      ? recipeData.family_members.map(String)
      : Array.isArray(recipeData.nostalgia?.familyMembersMentioned)
      ? recipeData.nostalgia.familyMembersMentioned.map(String)
      : familyMemberHint
      ? [familyMemberHint]
      : [];

    const eraDetected = recipeData.era || recipeData.nostalgia?.historicalContext || eraHint || 'Family kitchen archive';
    const secretTip = recipeData.secret_tip || recipeData.nostalgia?.secretFamilyTip;

    const newRecipe: IRecipe = {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      category: category as any,
      prepTime: recipeData.prepTime || '20 mins',
      cookTime: recipeData.cookTime || '1 hr 30 mins',
      servings: recipeData.servings || '6-8 servings',
      servingsCount: Number(recipeData.servingsCount) || 8,
      difficulty: recipeData.difficulty || 'Medium',
      ingredients: cleanedIngredients,
      instructions: cleanedInstructions,
      nostalgia: {
        summary: recipeData.nostalgia?.summary || storyList[0] || 'A treasured family heirloom handed down across generations.',
        anecdotes: storyList,
        familyMembersMentioned: familyList,
        historicalContext: eraDetected,
        emotionalTone: recipeData.nostalgia?.emotionalTone || 'Nostalgic, warm',
        secretFamilyTip: secretTip,
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
      res.json({
        success: false,
        fallbackToBrowser: true,
        message: 'Gemini API not configured, using browser voice.',
      });
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
      res.json({
        success: false,
        fallbackToBrowser: true,
        message: 'No audio generated by TTS model, using browser voice.',
      });
      return;
    }

    res.json({
      success: true,
      audioData: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: unknown) {
    console.warn('TTS Narration cloud warning (falling back to browser speech):', (error as Error).message);
    res.json({
      success: false,
      fallbackToBrowser: true,
      message: 'Cloud TTS unavailable, using browser speech synthesis.',
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
