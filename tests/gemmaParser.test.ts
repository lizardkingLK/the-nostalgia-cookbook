import { cleanAndParseGemmaResponse, ParsedGemmaOutput } from '../src/lib/gemma';

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

  // Test 3: Rejection of invalid structures
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
