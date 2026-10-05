import { IRecipe } from '../types/recipe';

export const INITIAL_RECIPES: IRecipe[] = [
  {
    id: 'blizzard-apple-skillet-cake-1974',
    title: "Grandma Eleanor's 1974 Blizzard Apple Skillet Cake",
    category: 'Desserts & Sweets',
    prepTime: '20 mins',
    cookTime: '45 mins',
    servings: '8 servings',
    servingsCount: 8,
    difficulty: 'Easy',
    ingredients: [
      { item: 'Tart Baking Apples (Honeycrisp or Granny Smith)', imperial: '4 medium, peeled & sliced', metric: '600 g', notes: 'Cut into 1/4-inch crescents' },
      { item: 'Unsalted Butter', imperial: '6 tbsp (separated)', metric: '85 g', notes: '4 tbsp for skillet glaze, 2 tbsp melted for batter' },
      { item: 'Dark Brown Sugar', imperial: '1/2 cup packed', metric: '100 g', notes: 'For caramelized bottom crust' },
      { item: 'Ground Ceylon Cinnamon', imperial: '1.5 tsp', metric: '4 g', notes: 'Divided between apples and batter' },
      { item: 'Ground Nutmeg', imperial: '1/4 tsp freshly grated', metric: '1 g' },
      { item: 'All-Purpose Flour', imperial: '1 1/2 cups', metric: '190 g' },
      { item: 'Granulated Sugar', imperial: '3/4 cup', metric: '150 g' },
      { item: 'Baking Powder', imperial: '1 1/2 tsp', metric: '6 g' },
      { item: 'Kosher Salt', imperial: '1/2 tsp', metric: '3 g' },
      { item: 'Whole Milk', imperial: '1/2 cup room temp', metric: '120 ml' },
      { item: 'Large Farm Eggs', imperial: '2 eggs', metric: '2 whole eggs' },
      { item: 'Pure Vanilla Extract', imperial: '1 tsp', metric: '5 ml' },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Melt 4 tablespoons of butter in a 10-inch heavy cast-iron skillet over medium heat on the stove top. Stir in brown sugar and 1/2 tsp cinnamon until bubbly.',
        tip: "Grandma always said: 'If the skillet doesn't hiss softly when the brown sugar hits, your heat is too cowardly!'"
      },
      {
        stepNumber: 2,
        instruction: 'Remove skillet from heat. Arrange apple slices in concentric circles over the melted brown sugar caramel.',
        tip: 'Pack them tightly, as they will shrink and soften as the skillet bakes.'
      },
      {
        stepNumber: 3,
        instruction: 'In a mixing bowl, whisk together flour, granulated sugar, baking powder, salt, remaining cinnamon, and nutmeg.',
      },
      {
        stepNumber: 4,
        instruction: 'In a separate measuring pitcher, whisk eggs, milk, vanilla, and the remaining 2 tbsp melted butter. Pour wet ingredients into dry, folding just until combined.',
        tip: 'Do not overmix; lumps are fine and keep the crumb tender.'
      },
      {
        stepNumber: 5,
        instruction: 'Gently spread batter over the arranged apples. Bake at 350°F (175°C) for 40 to 45 minutes until golden brown and a toothpick inserted in the center comes out clean.',
      },
      {
        stepNumber: 6,
        instruction: 'Let rest in skillet for 10 minutes, then run a knife around the edges and invert onto a wide ceramic platter while warm.',
        tip: 'Wear oven mitts and invert with confidence in one swift flip.'
      }
    ],
    nostalgia: {
      summary: 'Born during the legendary Great Midwest Blizzard of 1974 when power lines snapped across the county and the family huddled around the wood-burning cookstove.',
      anecdotes: [
        "The snow was up to the porch eaves, four feet deep. Power died at 3 in the afternoon, so Eleanor lit kerosene lamps and pulled out the old Lodge skillet.",
        "Uncle Jimmy tried to shovel the driveway in his wool hunting socks and lost a boot in the drift, while little Sarah sat on the flour bin playing with dough scraps.",
        "We ate this cake hot straight from the cast iron with tin mugs of hot cider while the wind howled outside against the rattling kitchen windowpanes."
      ],
      familyMembersMentioned: ['Grandma Eleanor', 'Uncle Jimmy', 'Sarah', 'Grandpa Walter'],
      historicalContext: 'January 1974 Blizzard in rural Michigan; kerosene lamps and cast iron cooking.',
      emotionalTone: 'Cozy, resilient, heartwarming',
      secretFamilyTip: 'Never wash the skillet with soap afterward—rub it down with kosher salt and a drop of lard while still lukewarm.'
    },
    rawTranscript: "Now turn that recorder on, let me get my glasses... Okay, so this was January seventy-four, the big blizzard. You couldn't see the red barn across the road! The power lines snapped around three o'clock, just when Jimmy was trying to shovel the tractor path. Walter came in freezing, and Jimmy had lost his boot in the snowdrift! I said, 'Well, we're not starving.' I had four Honeycrisp apples in the root cellar, nice and firm. I pulled out my mother's cast iron skillet—the number eight Lodge with the smooth bottom. Melted down four tablespoons of fresh butter, dumped in the dark brown sugar till it smelled like toffee. Laid the apples down in a pretty spiral... Sarah was laughing on the floor with the dog. Then a quick batter, just flour, two eggs, a splash of cream because the milk was frozen on the back porch! We baked it right on the top rack of the wood stove. When you flip that cake upside down, the brown sugar is glassy and caramel-crisp. Jimmy ate three slices before taking off his snow pants.",
    audioDurationSeconds: 142,
    engineUsed: 'Gemma 2 (Heritage Restorer Pipeline)',
    createdAt: '2026-10-01T14:32:00.000Z',
    updatedAt: '2026-10-01T14:32:00.000Z'
  },
  {
    id: 'nonna-rosa-sunday-slow-ragu-1968',
    title: "Nonna Rosa's Sunday 6-Hour Slow Ragù alla Bolognese",
    category: 'Sunday Dinners',
    prepTime: '40 mins',
    cookTime: '6 hrs',
    servings: '10 servings',
    servingsCount: 10,
    difficulty: 'Heirloom Master',
    ingredients: [
      { item: 'Ground Beef Chuck (coarse grind)', imperial: '1 1/2 lbs', metric: '680 g' },
      { item: 'Ground Pork Shoulder or Veal', imperial: '1 lb', metric: '450 g' },
      { item: 'Cured Pancetta', imperial: '6 oz finely minced', metric: '170 g', notes: 'Rendered slowly for savory base fat' },
      { item: 'Yellow Onions', imperial: '2 medium, brunoise minced', metric: '300 g' },
      { item: 'Carrots', imperial: '3 medium, peeled and fine dice', metric: '200 g' },
      { item: 'Celery Ribs', imperial: '3 stalks, finely minced', metric: '150 g' },
      { item: 'Dry Italian Red Wine (Chianti or Barbera)', imperial: '1 1/2 cups', metric: '350 ml' },
      { item: 'Whole San Marzano Canned Tomatoes', imperial: '2 large cans (28 oz each)', metric: '1.6 kg', notes: 'Hand-crushed in a ceramic bowl' },
      { item: 'Whole Milk', imperial: '1 1/4 cups', metric: '300 ml', notes: 'Stirred in before the wine to tenderize the meat fibers' },
      { item: 'Parmigiano-Reggiano Cheese Rind', imperial: '1 whole rind (3-inch)', metric: '50 g', notes: 'Nonna’s golden flavor secret' },
      { item: 'Fresh Bay Leaves', imperial: '3 leaves', metric: '3 leaves' },
      { item: 'Whole Nutmeg', imperial: '1/3 whole seed freshly grated', metric: '2 g' },
      { item: 'Coarse Sea Salt & Black Pepper', imperial: 'To taste', metric: 'To taste' },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'In a wide enamelled Dutch oven, render the minced pancetta over low heat until crispy and golden, about 10 minutes.',
        tip: 'Never rush pancetta rendering—this liquid gold is the backbone of the soffritto.'
      },
      {
        stepNumber: 2,
        instruction: 'Add the minced onion, carrot, and celery. Sweat gently over low heat for 20 minutes until translucent and aromatic, stirring with a wooden paddle.',
      },
      {
        stepNumber: 3,
        instruction: 'Increase heat to medium. Add beef and pork, breaking into small pebbles with a wooden spoon. Brown thoroughly until juices evaporate and the meat sizzles.',
      },
      {
        stepNumber: 4,
        instruction: 'Pour in the whole milk and freshly grated nutmeg. Simmer until the milk has almost completely cooked into the meat (about 15 minutes).',
        tip: "Nonna's rule: The milk breaks down acid and keeps the ground meat silky soft over hours of simmering."
      },
      {
        stepNumber: 5,
        instruction: 'Add the red wine and scrape up any caramelized bits on the bottom. Simmer until wine is reduced by half.',
      },
      {
        stepNumber: 6,
        instruction: 'Stir in the hand-crushed tomatoes, Parmigiano rind, and bay leaves. Bring to a gentle sputter, then drop heat to the lowest setting. Cover partially with lid ajar.',
      },
      {
        stepNumber: 7,
        instruction: 'Simmer for 5 to 6 hours, stirring every 30 minutes. If sauce looks too dry, add a ladle of warm beef stock or water. Remove bay leaves and cheese rind before serving over fresh tagliatelle.',
        tip: 'The sauce is finished when a ruby ring of savory oil pools naturally around the spoon.'
      }
    ],
    nostalgia: {
      summary: 'The holy Sunday ritual in Nonna’s Bensonhurst Brooklyn brownstone, beginning at 6:30 AM after early Mass while opera played on the kitchen radio.',
      anecdotes: [
        "Grandpa Tony would sneak into the kitchen before church in his undershirt to dip the heel of a sesame semolina loaf into the bubbling pot; Nonna would swat his hand with a wooden spoon but always left a second heel ready for him.",
        "The kitchen windows would fog up with rich tomato and wine vapor by 10 AM, and neighbors on 73rd street would smell the soffritto from their front stoops.",
        "Every grandchild had to take one turn stirring the pot counter-clockwise 'to wake up the herbs' before they were allowed out on the sidewalk with their skateboards."
      ],
      familyMembersMentioned: ['Nonna Rosa', 'Grandpa Tony', 'Little Marco', 'Aunt Maria'],
      historicalContext: '1968 Italian-American Brooklyn; Sunday family gatherings with folding card tables.',
      emotionalTone: 'Soulful, bustling, deeply affectionate',
      secretFamilyTip: 'Never throw away Parmesan rinds—keep them in a glass jar in the freezer and drop one into every long simmer.'
    },
    rawTranscript: "Listen to me, you write this down because nobody makes it right anymore! You don't use tomato paste out of a can like those fancy television cooks. In 1968, on 73rd Street, Sunday started at six thirty in the morning. Tony would turn on the opera on the Philco radio. I had my heavy blue pot on the back burner. You start with pancetta, let the fat coat the cast iron. Then the holy trinity—onion, carrot, celery, cut tiny, tiny like grains of rice! You cook the meat until it browns, then you put the whole milk first. Yes, milk! The American ladies thought I was crazy, but Bologna style always puts milk before wine so the beef stays like velvet. Then the Chianti. Then the hand-crushed San Marzanos. And you drop in the cheese rind! Tony would try to steal the bread heel, dip it right in... I'd hit him with the wooden spoon, 'Tony, it's not ready, you'll ruin your communion!' But he'd wink and eat it anyway. It simmers six hours. If you rush it, don't bother inviting anyone to your table.",
    audioDurationSeconds: 215,
    engineUsed: 'Gemma 2 (Heritage Restorer Pipeline)',
    createdAt: '2026-10-02T10:15:00.000Z',
    updatedAt: '2026-10-02T10:15:00.000Z'
  },
  {
    id: 'uncle-mateo-hatch-green-chile-stew-1982',
    title: "Uncle Mateo's Fire-Roasted Hatch Green Chile Stew",
    category: 'Soups & Stews',
    prepTime: '30 mins',
    cookTime: '2 hrs',
    servings: '8 servings',
    servingsCount: 8,
    difficulty: 'Medium',
    ingredients: [
      { item: 'Pork Shoulder (Boston Butt)', imperial: '2 1/2 lbs, cut into 1-inch cubes', metric: '1.1 kg' },
      { item: 'Lard or Bacon Drippings', imperial: '2 tbsp', metric: '30 ml' },
      { item: 'Yellow Onion', imperial: '1 large, chopped', metric: '250 g' },
      { item: 'Garlic Cloves', imperial: '6 cloves, minced', metric: '20 g' },
      { item: 'Fire-Roasted Hatch Green Chiles', imperial: '2 cups peeled, seeded & chopped', metric: '350 g', notes: 'Medium or hot autumn roast' },
      { item: 'Russet Potatoes', imperial: '3 large, peeled and cut into 3/4-inch dice', metric: '600 g' },
      { item: 'All-Purpose Flour', imperial: '3 tbsp', metric: '25 g', notes: 'To dust and thicken' },
      { item: 'Rich Chicken or Pork Stock', imperial: '5 cups', metric: '1.2 L' },
      { item: 'Dried Mexican Oregano', imperial: '1 tbsp crushed between palms', metric: '3 g' },
      { item: 'Ground Cumin', imperial: '1 tsp', metric: '3 g' },
      { item: 'Fresh Cilantro & Warm Corn Tortillas', imperial: 'For serving', metric: 'For serving' },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Pat pork cubes thoroughly dry with paper towels and toss with flour, salt, and pepper in a bowl.',
      },
      {
        stepNumber: 2,
        instruction: 'Melt lard in a heavy stockpot over medium-high heat. Brown the pork in batches until deep golden-brown crust forms on all sides. Transfer to a plate.',
        tip: "Uncle Mateo: 'Crowding the pan turns pork gray and sad; give each piece its own dancing space!'"
      },
      {
        stepNumber: 3,
        instruction: 'In the remaining pan drippings, sauté the chopped onions until golden edges appear. Stir in minced garlic and cumin for 1 minute until fragrant.',
      },
      {
        stepNumber: 4,
        instruction: 'Pour in a splash of stock to deglaze the pot, scraping up all browned pork bits. Return pork and any accumulated juices to the pot.',
      },
      {
        stepNumber: 5,
        instruction: 'Add the chopped roasted Hatch chiles, remaining stock, and crushed Mexican oregano. Bring to a boil, then reduce heat to low, cover, and simmer for 1 hour until pork is tender.',
      },
      {
        stepNumber: 6,
        instruction: 'Add diced potatoes. Simmer uncovered for 25 to 30 minutes until potatoes are fork-tender and the stew has thickened into a rich, velvety broth. Ladle into bowls with warm tortillas.',
      }
    ],
    nostalgia: {
      summary: 'The centerpiece of every September chile harvest in Albuquerque, roasted over mesquite drums with smoke drifting through the foothills.',
      anecdotes: [
        "In autumn of '82, Mateo brought back two burlap sacks of freshly roasted Big Jim chiles tied to the tailgate of his Chevy truck, smelling like heaven.",
        "Aunt Carmen would sit on the back patio with plastic bread bags over her hands so her fingertips wouldn't burn while peeling the blackened skins.",
        "We'd dip piping hot buttered flour tortillas directly into the pot before the stew was even finished cooking."
      ],
      familyMembersMentioned: ['Uncle Mateo', 'Aunt Carmen', 'Cousin Roberto'],
      historicalContext: 'New Mexico Autumn harvest, September 1982; outdoor chile roasting and family tailgate feasts.',
      emotionalTone: 'Vibrant, spicy, joyous',
      secretFamilyTip: 'Rub dried oregano vigorously between both palms right over the bubbling pot—it releases the essential oils instantly.'
    },
    rawTranscript: "Aw man, you hear that sizzle? September eighty-two, I drove my old C-10 pickup straight down to the valley near Hatch. You could smell the roasting from five miles away on the highway—that sweet, charred green chile perfume. I loaded two fifty-pound burlap sacks in the bed. Got back to Albuquerque, Carmen and Roberto were already setting out the folding chairs. Carmen always wore those sandwich baggies on her hands because if you touched your eyes with Hatch chile oil, you were done for the day! We chopped up the pork shoulder, seared it dark in bacon fat. You don't use store-bought powdered chile for this, no sir. You need the charred flecks right in the pot. We put in the Idaho spuds from the market, let it simmer till the pork surrendered. We tore off hot tortillas and scooped it like spoons right under the cottonwood tree while the sun was setting orange behind the Sandias.",
    audioDurationSeconds: 180,
    engineUsed: 'Gemma 2 (Heritage Restorer Pipeline)',
    createdAt: '2026-10-03T16:20:00.000Z',
    updatedAt: '2026-10-03T16:20:00.000Z'
  },
  {
    id: 'baba-sofia-cardamom-honey-babka-1959',
    title: "Baba Sofia's Honey Glazed Cardamom Brioche Babka",
    category: 'Baking & Breads',
    prepTime: '50 mins (plus rise)',
    cookTime: '35 mins',
    servings: '12 slices',
    servingsCount: 12,
    difficulty: 'Heirloom Master',
    ingredients: [
      { item: 'Whole Milk', imperial: '3/4 cup warmed to 105°F', metric: '180 ml' },
      { item: 'Active Dry Yeast', imperial: '1 packet (2 1/4 tsp)', metric: '7 g' },
      { item: 'Wildflower Honey', imperial: '1/3 cup', metric: '115 g' },
      { item: 'Egg Yolks (at room temperature)', imperial: '4 yolks + 1 whole egg for wash', metric: '4 yolks' },
      { item: 'Bread Flour or Strong Flour', imperial: '3 1/4 cups', metric: '420 g' },
      { item: 'Freshly Crushed Green Cardamom Pods', imperial: '1 1/2 tsp ground seeds', metric: '4 g', notes: 'Pounded in a stone mortar' },
      { item: 'European Unsalted Butter', imperial: '10 tbsp softened & cubed', metric: '140 g' },
      { item: 'Fine Sea Salt', imperial: '1 tsp', metric: '5 g' },
      { item: 'Grated Orange Zest', imperial: 'Zest of 1 organic orange', metric: 'Zest of 1 orange' },
      { item: 'Toasted Slivered Almonds & Pearl Sugar', imperial: '1/4 cup each for topping', metric: '30 g each' },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Whisk warm milk, yeast, and 1 tablespoon of honey in a bowl. Let stand for 8 minutes until foamy and smelling like beer.',
      },
      {
        stepNumber: 2,
        instruction: 'In a stand mixer or wooden bowl, combine flour, crushed cardamom, salt, and orange zest. Add yeast mixture, remaining honey, and the 4 egg yolks.',
      },
      {
        stepNumber: 3,
        instruction: 'Knead on low speed for 6 minutes until a smooth dough forms, then add softened butter one tablespoon at a time, allowing each cube to incorporate before adding the next.',
        tip: "Baba Sofia's secret: 'The dough will look sticky and breathless, but keep kneading—the butter will weave into silky gold silk.'"
      },
      {
        stepNumber: 4,
        instruction: 'Cover bowl with a damp linen tea towel and let rise in a warm draft-free corner for 1.5 to 2 hours until doubled in size.',
      },
      {
        stepNumber: 5,
        instruction: 'Divide dough into 3 equal ropes. Braid tightly together on a floured surface, tucking both ends neatly underneath. Place into a buttered 9x5-inch loaf tin.',
      },
      {
        stepNumber: 6,
        instruction: 'Let rise for second proof (45 mins). Brush with beaten egg wash, scatter pearl sugar and slivered almonds, and bake at 350°F (175°C) for 30 to 35 minutes until deep mahogany gold.',
      },
      {
        stepNumber: 7,
        instruction: 'Warm 2 tablespoons of honey with a drop of orange blossom water and brush over the hot loaf right as it leaves the oven for a high-gloss finish.',
      }
    ],
    nostalgia: {
      summary: 'Woven for festive spring mornings and holiday reunions, perfuming the entire woodframe house with cardamom and caramelized citrus peel.',
      anecdotes: [
        "Baba Sofia kept her green cardamom pods inside an old metal tea tin from the old country, wrapped in parchment so the scent wouldn't escape.",
        "She would never allow anyone to slam the front door while the dough was proofing by the radiator, claiming 'the dough will get frightened and catch a chill.'",
        "We would tear off warm braided strands by hand, never using a knife, while sipping dark black tea with plum jam."
      ],
      familyMembersMentioned: ['Baba Sofia', 'Grandfather Lev', 'Tanya'],
      historicalContext: '1959 immigrant kitchen in Chicago; Eastern European holiday baking tradition.',
      emotionalTone: 'Reverent, nostalgic, celebratory',
      secretFamilyTip: 'Never use ground cardamom from a supermarket jar—crack the green husks with the flat of a knife and crush the black seeds right before kneading.'
    },
    rawTranscript: "Shh, close the screen door quietly! I always told Tanya, you slam that door, the yeast gets scared and the bread sinks like a stone! This was fifty-nine, our second winter in Chicago. Lev bought me twenty pounds of stone-ground flour from the mill on Milwaukee Avenue. My cardamom came in the little tin Lev's mother had packed in her trunk in nineteen twenty. I would crack the green shells with the meat mallet—oh, when that spice hit the warm milk and honey, you forgot all about the gray slush outside. Four yellow egg yolks from the Polish market on Division Street. You must knead until the butter vanishes into the gluten. When it came out of the oven, we never touched it with a steel knife; you tear the braid with your fingers, steam coming up, sweet and fragrant. Lev would sit at the kitchen table with his spectacles on, smile, and say 'Now we are truly home.'",
    audioDurationSeconds: 195,
    engineUsed: 'Gemma 2 (Heritage Restorer Pipeline)',
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z'
  }
];
