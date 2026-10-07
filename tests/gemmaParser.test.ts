import { cleanAndParseGemmaResponse, ParsedGemmaOutput, sanitizeRecipeTitle } from '../src/lib/gemma';

// Test runner for parser and data validation
function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('🧪 Running Gemma Structured Output & Privacy Layer Tests...\n');

  // Test 1: Clean raw JSON
  try {
    const rawJson = JSON.stringify({
      title: "Nana's Sunday Bolognese",
      prepTime: "30 mins",
      cookTime: "3 hours",
      servings: "6-8 servings",
      ingredients: [
        { item: "San Marzano Tomatoes", imperial: "2 cans (28 oz)", metric: "1.6 kg" }
      ],
      instructions: [
        { stepNumber: 1, instruction: "Brown meat gently." }
      ],
      nostalgia: {
        summary: "Made every Sunday in Brooklyn.",
        anecdotes: ["Grandpa would steal bread and dip it in the pot."],
        familyMembersMentioned: ["Nana", "Grandpa"],
        historicalContext: "1968 Brooklyn Italian-American household",
        emotionalTone: "Warm, communal"
      }
    });

    const parsed: ParsedGemmaOutput = cleanAndParseGemmaResponse(rawJson);
    assert(parsed.title === "Nana's Sunday Bolognese", "Parses valid clean JSON");
    assert(parsed.ingredients.length === 1, "Extracts ingredients array");
    assert(parsed.nostalgia.familyMembersMentioned.includes("Nana"), "Isolates family members");
    assert(parsed.instructions[0].stepNumber === 1, "Parses structured steps");
  } catch (e) {
    assert(false, `Test 1 failed with error: ${(e as Error).message}`);
  }

  // Test 2: Markdown fenced code blocks (```json ... ```)
  try {
    const markdownWrapped = "```json\n" + JSON.stringify({
      title: "Aunt Clara's Cardamom Bread",
      prepTime: "25 mins",
      cookTime: "40 mins",
      servings: "10 slices",
      ingredients: [
        { item: "Crushed Cardamom Pods", imperial: "1 1/2 tsp", metric: "4 g" }
      ],
      instructions: [
        { stepNumber: 1, instruction: "Whisk warm milk and yeast." }
      ],
      nostalgia: {
        summary: "Baked every winter morning.",
        anecdotes: ["The house smelled like spices."],
        familyMembersMentioned: ["Aunt Clara"],
        historicalContext: "1950s Chicago winter",
        emotionalTone: "Cozy"
      }
    }) + "\n```";

    const parsed = cleanAndParseGemmaResponse(markdownWrapped);
    assert(parsed.title === "Aunt Clara's Cardamom Bread", "Strips markdown fences and extracts JSON");
    assert(parsed.nostalgia.familyMembersMentioned[0] === "Aunt Clara", "Preserves sensitive family names in memory journal");
  } catch (e) {
    assert(false, `Test 2 failed with error: ${(e as Error).message}`);
  }

  // Test 3: Standardized amount/unit/name with steps and story_journal
  try {
    const rawNewSchema = JSON.stringify({
      title: "Rose's Real Sunday Pot Roast",
      ingredients: [
        { amount: "4", unit: "lbs", name: "Beef Chuck Roast" },
        { amount: "1", unit: "tbsp", name: "Coarse Salt" }
      ],
      steps: [
        "Sear the beef chuck roast on all sides in a hot Dutch oven.",
        "Add sliced onions, carrots, and broth, cover and braise."
      ],
      story_journal: [
        "Recalling Rose's real Sunday Pot Roast during the blizzard of 1968.",
        "The whole house was filled with the aroma on cold Sunday afternoons."
      ],
      family_members: ["Rose"],
      era: "Winter of 1968",
      secret_tip: "Sear the meat deeply before adding liquid."
    });

    const parsed = cleanAndParseGemmaResponse(rawNewSchema);
    assert(parsed.title === "Rose's Real Sunday Pot Roast", "Parses new standardized pot roast title");
    assert(parsed.ingredients[0].name === "Beef Chuck Roast", "Extracts clean ingredient name without pronouns");
    assert(parsed.ingredients[0].amount === "4" && parsed.ingredients[0].unit === "lbs", "Extracts distinct amount and unit fields");
    assert(parsed.instructions.length === 2, "Normalizes steps into instructions array");
    assert(parsed.nostalgia.anecdotes.length === 2, "Normalizes story_journal into nostalgia anecdotes");
  } catch (e) {
    assert(false, `Test 3 failed with error: ${(e as Error).message}`);
  }

  // Test 4: Truncated possessive recovery (e.g., "S Real Sunday" -> "Rose's Real Sunday Pot Roast")
  try {
    const transcript = "If you want to make Rose's real Sunday pot roast, the kind that filled the house during the blizzard of 1968...";
    const recovered = sanitizeRecipeTitle("S Real Sunday", transcript);
    assert(recovered.includes("Rose's"), "Recovers truncated possessive name Rose's from transcript");
    assert(recovered.includes("Sunday"), "Preserves Sunday in title");
    assert(recovered.includes("Pot Roast"), "Adds missing dish noun Pot Roast");
  } catch (e) {
    assert(false, `Test 4 failed with error: ${(e as Error).message}`);
  }

  // Test 5: Action phrase stripping (e.g., "making Rose's Real Sunday" -> "Rose's Real Sunday Pot Roast")
  try {
    const transcript = "If you want to make Rose's real Sunday pot roast, with a 4 pound chuck roast...";
    const cleanedAction = sanitizeRecipeTitle("making Rose's Real Sunday", transcript);
    assert(cleanedAction.startsWith("Rose's"), "Strips leading action verb 'making' and keeps Rose's");
    assert(cleanedAction.includes("Sunday"), "Preserves Sunday");
    assert(cleanedAction.includes("Pot Roast"), "Enriches with Pot Roast from transcript");
  } catch (e) {
    assert(false, `Test 5 failed with error: ${(e as Error).message}`);
  }

  // Test 6: Pure apostrophe cut-off "'s Real Sunday"
  try {
    const transcript = "We are cooking Rose's real Sunday dinner.";
    const recoveredApostrophe = sanitizeRecipeTitle("'s Real Sunday", transcript);
    assert(recoveredApostrophe.startsWith("Rose's"), "Recovers person name from leading apostrophe-s");
    assert(recoveredApostrophe.includes("Sunday"), "Preserves remainder words");
  } catch (e) {
    assert(false, `Test 6 failed with error: ${(e as Error).message}`);
  }

  // Test 7: Rejection of invalid structures
  try {
    const invalidJson = '{"foo": "bar"}';
    cleanAndParseGemmaResponse(invalidJson);
    assert(false, "Rejects malformed JSON lacking title, ingredients, or instructions");
  } catch {
    assert(true, "Properly throws validation error for schema mismatch");
  }

  console.log(`\n📋 Test Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
