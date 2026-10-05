export interface ISampleStory {
  id: string;
  title: string;
  teller: string;
  relationship: string;
  decade: string;
  dishName: string;
  description: string;
  durationText: string;
  durationSeconds: number;
  sampleTranscript: string;
}

export const SAMPLE_AUDIO_STORIES: ISampleStory[] = [
  {
    id: 'grandma-peach-cobbler',
    title: "Auntie Mae's Cast Iron Bourbon Peach Cobbler",
    teller: "Auntie Mae",
    relationship: "Great-Aunt",
    decade: "Summer of 1978",
    dishName: "Cast Iron Bourbon Peach Cobbler",
    description: "Recounting the July heatwave in Georgia and peaches picked straight from the roadside orchard in a bushel basket.",
    durationText: "2m 14s",
    durationSeconds: 134,
    sampleTranscript: "Turn that gadget on, let Auntie tell you how it really went down. It was seventy-eight, July in Savannah, so hot the asphalt was sticking to our sandals. Uncle Joe stopped by Mr. Miller's orchard and brought back two bushel baskets of Elberta peaches, so ripe the syrup was leaking through the wood slats. I said, 'Joe, we got to cook these before the flies throw a revival meeting!' So I dragged out the big 12-inch Griswold skillet. We sliced up about six cups of peaches, tossed them with three-quarter cup of turbinado sugar, a fat pinch of cinnamon, and Joe sneaked in two tablespoons of his sipping bourbon when my back was turned—which turned out to be the smartest thing he ever did! For the crust, don't use no pie dough. It's a sweet drop batter—cup and a half of self-rising flour, cup of sugar, whole stick of melted sweet cream butter, and a cup of buttermilk. You pour the melted butter in the hot skillet, dump the batter in the center, and spoon the peaches right on top. Do NOT stir it! As it bakes at three-seventy-five, the batter floats up around the fruit and forms this crispy, sugary cloud. Little Marcus ate half the skillet with a scoop of vanilla churned ice cream right on the porch steps."
  },
  {
    id: 'abuela-albondigas',
    title: "Abuela Carlota's Minted Albóndigas Soup",
    teller: "Abuela Carlota",
    relationship: "Abuela / Grandmother",
    decade: "Winter of 1969",
    dishName: "Sopa de Albóndigas con Hierbabuena",
    description: "A restorative winter broth with fragrant spearmint leaves from the backyard terracotta pot and rice-studded meatballs.",
    durationText: "1m 58s",
    durationSeconds: 118,
    sampleTranscript: "Ay mi vida, put the phone down and listen. When your papá was a little boy in sixty-nine, he caught that terrible cough during the December rains in East LA. The doctor gave him syrups that tasted like tin, but Abuela knows better. I went out back to my terracotta pot where the hierbabuena—the fresh spearmint—grows even in the cold. You need ground beef and pork, half and half, one pound each. And here is what everyone forgets: you uncooked long-grain white rice, one third cup, mixed directly into the meat with one beaten egg, two cloves of crushed garlic, salt, and lots of finely chopped mint leaves. When you roll the albóndigas the size of golf balls, you drop them into a boiling pot of chicken broth simmered with charred tomatoes, Mexican oregano, and sliced zucchini, carrots, and sweet corn on the cob cut into small rounds. As the soup simmers for thirty-five minutes, the rice inside the meatballs cooks and sprouts out like little porcupine spines! Your papá drank three bowls of that minted broth, fell asleep under the wool blanket, and the fever broke before the morning church bells."
  },
  {
    id: 'grandpa-smoked-brisket-chili',
    title: "Grandpa Earl's Firehouse Tailgate Chili",
    teller: "Grandpa Earl",
    relationship: "Grandpa",
    decade: "Fall 1985",
    dishName: "Smoked Brisket & Poblano Red Chili",
    description: "Station 4 firehouse chili contest winner, made with leftover oak-smoked brisket cubes and black coffee.",
    durationText: "2m 30s",
    durationSeconds: 150,
    sampleTranscript: "Check the mic? All right, Earl here. Now, nineteen eighty-five, Station Four annual chili cook-off. Captain Higgins was bragging about his bean chili, but real Texas chili don't have no kidney beans—fight me on it! Here's the winning secret: I took two pounds of leftover oak-smoked brisket flat, cubed up into half-inch dice. Browned it with one pound of coarse coarse ground chuck in bacon grease. Tossed in two diced yellow onions and three charred poblano peppers—poblano gives that smoky, deep hum without blowing your head off. Four cloves of garlic. Then the chili powder: don't use that grocery store blend with garlic salt in it. Use two tablespoons of pure ancho powder, one tablespoon cumin, a tablespoon of smoked paprika, and a teaspoon of Mexican oregano. Then the secret weapon: one twelve-ounce bottle of dark Shiner bock beer, a half cup of strong morning black coffee, and two tablespoons of masa harina mixed with warm water to thicken it up at the very end. Let that sucker bubble for two and a half hours on the back station burner. Chief Miller took one spoonful, blew his whistle, and handed me the engraved copper ladle on the spot."
  }
];
