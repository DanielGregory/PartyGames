// Content banks for the built-in game modes.

export const LOCATIONS: { name: string; roles: string[] }[] = [
  { name: "Airplane", roles: ["Pilot", "Flight Attendant", "Air Marshal", "First Class Passenger", "Economy Passenger", "Mechanic"] },
  { name: "Bank", roles: ["Teller", "Security Guard", "Manager", "Robber", "Customer", "Armored Car Driver"] },
  { name: "Beach", roles: ["Lifeguard", "Surfer", "Tourist", "Ice Cream Vendor", "Photographer", "Volleyball Player"] },
  { name: "Casino", roles: ["Dealer", "Bouncer", "High Roller", "Waitress", "Pit Boss", "Tourist"] },
  { name: "Circus Tent", roles: ["Ringmaster", "Clown", "Acrobat", "Animal Trainer", "Juggler", "Ticket Seller"] },
  { name: "Corporate Party", roles: ["CEO", "Assistant", "IT Guy", "Intern", "Client", "Security"] },
  { name: "Crusader Army", roles: ["Knight", "King", "Priest", "Archer", "Servant", "Cook"] },
  { name: "Day Spa", roles: ["Masseuse", "Manicurist", "Stylist", "Client", "Receptionist", "Owner"] },
  { name: "Embassy", roles: ["Ambassador", "Security Guard", "Diplomat", "Tourist", "Refugee", "Secretary"] },
  { name: "Hospital", roles: ["Surgeon", "Nurse", "Patient", "Anesthesiologist", "Intern", "Visitor"] },
  { name: "Hotel", roles: ["Bellhop", "Manager", "Housekeeper", "Guest", "Doorman", "Concierge"] },
  { name: "Military Base", roles: ["General", "Private", "Sniper", "Tank Engineer", "Medic", "Officer"] },
  { name: "Movie Studio", roles: ["Director", "Actor", "Cameraman", "Stunt Double", "Screenwriter", "Producer"] },
  { name: "Ocean Liner", roles: ["Captain", "Bartender", "Waiter", "Musician", "Passenger", "Mechanic"] },
  { name: "Passenger Train", roles: ["Conductor", "Engineer", "First Class Passenger", "Cook", "Stoker", "Restaurant Chef"] },
  { name: "Pirate Ship", roles: ["Captain", "First Mate", "Cook", "Cabin Boy", "Cannoneer", "Prisoner"] },
  { name: "Polar Station", roles: ["Scientist", "Explorer", "Doctor", "Mechanic", "Cook", "Communications Officer"] },
  { name: "Police Station", roles: ["Detective", "Officer", "Criminal", "Lawyer", "Journalist", "Chief"] },
  { name: "Restaurant", roles: ["Chef", "Waiter", "Customer", "Food Critic", "Manager", "Dishwasher"] },
  { name: "School", roles: ["Teacher", "Student", "Principal", "Janitor", "Nurse", "Coach"] },
  { name: "Space Station", roles: ["Commander", "Engineer", "Scientist", "Doctor", "Pilot", "Alien"] },
  { name: "Supermarket", roles: ["Cashier", "Manager", "Customer", "Stock Clerk", "Butcher", "Security Guard"] },
  { name: "Theater", roles: ["Director", "Actor", "Usher", "Ticket Collector", "Stagehand", "Critic"] },
  { name: "University", roles: ["Professor", "Student", "Dean", "Janitor", "Librarian", "Athlete"] },
  { name: "Zoo", roles: ["Zookeeper", "Veterinarian", "Tourist", "Tour Guide", "Photographer", "Food Vendor"] },
];

export const FIB_PROMPTS: { question: string; answer: string }[] = [
  { question: "What is the only food that never spoils?", answer: "Honey" },
  { question: "What was the first fruit ever eaten on the moon?", answer: "Peach" },
  { question: "What do you call a group of flamingos?", answer: "A flamboyance" },
  { question: "What is the national sport of Japan?", answer: "Sumo wrestling" },
  { question: "What is the most stolen food in the world?", answer: "Cheese" },
  { question: "What was Napoleon Bonaparte's favorite dessert?", answer: "Apple pie" },
  { question: "What is a group of unicorns called?", answer: "A blessing" },
  { question: "What is the fear of long words called?", answer: "Hippopotomonstrosesquippedaliophobia" },
  { question: "What did people used to use before alarm clocks were invented?", answer: "A knocker-upper" },
  { question: "What is the loudest animal on Earth?", answer: "The sperm whale" },
  { question: "What color is a polar bear's skin?", answer: "Black" },
  { question: "What was the original name for the search engine Google?", answer: "BackRub" },
  { question: "What is the tallest breed of dog?", answer: "Great Dane" },
  { question: "What everyday item was invented by mistake in 1968 at 3M?", answer: "The Post-it note" },
  { question: "What is the world's largest desert?", answer: "Antarctica" },
  { question: "What animal's fingerprints are so similar to humans' that they can confuse a crime scene?", answer: "Koalas" },
  { question: "What is the most common street name in the United States?", answer: "Second Street" },
  { question: "How many hearts does an octopus have?", answer: "Three" },
  { question: "What was the first product to have a UPC barcode scanned at a store?", answer: "Wrigley's gum" },
  { question: "What is the only mammal capable of true flight?", answer: "The bat" },
];

export const TRIVIA_QUESTIONS: {
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
}[] = [
  { question: "What planet is known as the Red Planet?", choices: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
  { question: "Which ocean is the largest?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3 },
  { question: "Who painted the Mona Lisa?", choices: ["Michelangelo", "Da Vinci", "Raphael", "Donatello"], correctIndex: 1 },
  { question: "What is the smallest country in the world?", choices: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], correctIndex: 2 },
  { question: "How many strings does a standard guitar have?", choices: ["4", "5", "6", "7"], correctIndex: 2 },
  { question: "What is the capital of Australia?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], correctIndex: 2 },
  { question: "Which element has the chemical symbol 'O'?", choices: ["Gold", "Oxygen", "Osmium", "Oganesson"], correctIndex: 1 },
  { question: "What year did the Titanic sink?", choices: ["1905", "1912", "1918", "1923"], correctIndex: 1 },
  { question: "Which animal is the fastest land mammal?", choices: ["Lion", "Cheetah", "Gazelle", "Horse"], correctIndex: 1 },
  { question: "What is the hardest natural substance on Earth?", choices: ["Gold", "Quartz", "Diamond", "Iron"], correctIndex: 2 },
  { question: "How many continents are there?", choices: ["5", "6", "7", "8"], correctIndex: 2 },
  { question: "Who wrote 'Romeo and Juliet'?", choices: ["Dickens", "Shakespeare", "Austen", "Hemingway"], correctIndex: 1 },
  { question: "What gas do plants absorb from the atmosphere?", choices: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 2 },
  { question: "What is the largest planet in our solar system?", choices: ["Earth", "Saturn", "Neptune", "Jupiter"], correctIndex: 3 },
  { question: "Which country invented pizza?", choices: ["France", "Greece", "Italy", "Spain"], correctIndex: 2 },
  { question: "What is the capital of Japan?", choices: ["Seoul", "Beijing", "Tokyo", "Bangkok"], correctIndex: 2 },
  { question: "What is the capital of Canada?", choices: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correctIndex: 3 },
  { question: "What is the capital of Egypt?", choices: ["Cairo", "Alexandria", "Giza", "Luxor"], correctIndex: 0 },
  { question: "What is the tallest mountain in the world?", choices: ["K2", "Mount Everest", "Kilimanjaro", "Denali"], correctIndex: 1 },
  { question: "What is the largest animal on Earth?", choices: ["African Elephant", "Blue Whale", "Giraffe", "Great White Shark"], correctIndex: 1 },
  { question: "How many colors are in a rainbow?", choices: ["5", "6", "7", "8"], correctIndex: 2 },
  { question: "Who was the first person to walk on the moon?", choices: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], correctIndex: 2 },
  { question: "What is the chemical formula for water?", choices: ["CO2", "H2O", "O2", "NaCl"], correctIndex: 1 },
  { question: "How many bones are in the adult human body?", choices: ["186", "206", "226", "246"], correctIndex: 1 },
  { question: "What star is at the center of our solar system?", choices: ["The Sun", "Polaris", "Sirius", "Alpha Centauri"], correctIndex: 0 },
  { question: "Which composer wrote the 9th Symphony (\"Ode to Joy\")?", choices: ["Mozart", "Bach", "Beethoven", "Chopin"], correctIndex: 2 },
  { question: "What is the largest rainforest in the world?", choices: ["Congo", "Amazon", "Daintree", "Sundarbans"], correctIndex: 1 },
  { question: "Which continent has the most countries?", choices: ["Asia", "Europe", "South America", "Africa"], correctIndex: 3 },
  { question: "A standard chessboard has how many squares?", choices: ["48", "56", "64", "72"], correctIndex: 2 },
  { question: "A standard piano has how many keys?", choices: ["76", "88", "96", "100"], correctIndex: 1 },
  { question: "What is the chemical symbol for gold?", choices: ["Go", "Gd", "Au", "Ag"], correctIndex: 2 },
  { question: "What is the chemical symbol for silver?", choices: ["Si", "Ag", "Sv", "Sl"], correctIndex: 1 },
  { question: "Which planet is closest to the Sun?", choices: ["Venus", "Earth", "Mercury", "Mars"], correctIndex: 2 },
  { question: "Which planet is the hottest in the solar system?", choices: ["Mercury", "Venus", "Mars", "Jupiter"], correctIndex: 1 },
  { question: "What is the largest hot desert in the world?", choices: ["Gobi", "Kalahari", "Sahara", "Mojave"], correctIndex: 2 },
  { question: "What color is chlorophyll?", choices: ["Red", "Green", "Blue", "Yellow"], correctIndex: 1 },
  { question: "Which sport was invented by James Naismith?", choices: ["Baseball", "Basketball", "Volleyball", "Hockey"], correctIndex: 1 },
  { question: "The FIFA World Cup is held every how many years?", choices: ["2", "3", "4", "5"], correctIndex: 2 },
  { question: "The Summer Olympics are held every how many years?", choices: ["2", "3", "4", "5"], correctIndex: 2 },
  { question: "What is the largest land animal?", choices: ["Rhinoceros", "Hippopotamus", "African Elephant", "Giraffe"], correctIndex: 2 },
  { question: "Which bird is the largest in the world and cannot fly?", choices: ["Emu", "Ostrich", "Penguin", "Cassowary"], correctIndex: 1 },
  { question: "How many players are on a soccer team on the field at once?", choices: ["9", "10", "11", "12"], correctIndex: 2 },
  { question: "How many players are on a basketball team on the court at once?", choices: ["4", "5", "6", "7"], correctIndex: 1 },
  { question: "Which planet is famous for its Great Red Spot?", choices: ["Mars", "Saturn", "Jupiter", "Neptune"], correctIndex: 2 },
  { question: "Which travels faster: light or sound?", choices: ["Sound", "Light", "They're equal", "Depends on altitude"], correctIndex: 1 },
  { question: "A standard violin has how many strings?", choices: ["4", "5", "6", "12"], correctIndex: 0 },
  { question: "In which city is the Colosseum located?", choices: ["Athens", "Rome", "Venice", "Naples"], correctIndex: 1 },
  { question: "The Statue of Liberty was a gift to the US from which country?", choices: ["United Kingdom", "Spain", "France", "Italy"], correctIndex: 2 },
  { question: "The Great Barrier Reef is located off the coast of which country?", choices: ["Brazil", "Australia", "Thailand", "Mexico"], correctIndex: 1 },
  { question: "In which city is the Eiffel Tower located?", choices: ["Lyon", "Marseille", "Paris", "Nice"], correctIndex: 2 },
  { question: "Who wrote the Harry Potter book series?", choices: ["J.K. Rowling", "Suzanne Collins", "Roald Dahl", "C.S. Lewis"], correctIndex: 0 },
  { question: "Who wrote the novel \"1984\"?", choices: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"], correctIndex: 1 },
  { question: "How many chambers does the human heart have?", choices: ["2", "3", "4", "5"], correctIndex: 2 },
  { question: "What is the freezing point of water in Celsius?", choices: ["-10", "0", "10", "32"], correctIndex: 1 },
];

export const MOST_LIKELY_PROMPTS: string[] = [
  "Most likely to become famous",
  "Most likely to survive a zombie apocalypse",
  "Most likely to win the lottery and lose the ticket",
  "Most likely to become a millionaire",
  "Most likely to cry during a movie",
  "Most likely to accidentally start a cult",
  "Most likely to become president",
  "Most likely to be late to their own wedding",
  "Most likely to eat something off the floor",
  "Most likely to talk their way out of a speeding ticket",
  "Most likely to become a famous chef",
  "Most likely to fall asleep at a party",
  "Most likely to send a text to the wrong person",
  "Most likely to become an astronaut",
  "Most likely to win a reality TV show",
  "Most likely to forget their own birthday",
  "Most likely to adopt ten pets",
  "Most likely to go viral on social media",
  "Most likely to become a superhero",
  "Most likely to survive alone in the wilderness",
];

export const HANGMAN_WORDS: string[] = [
  "ELEPHANT", "GUITAR", "VOLCANO", "PENGUIN", "SANDWICH", "TORNADO", "PYRAMID",
  "OCTOPUS", "BICYCLE", "GALAXY", "PANCAKE", "DINOSAUR", "COMPASS", "BLANKET",
  "WATERFALL", "TELESCOPE", "BUTTERFLY", "MARSHMALLOW", "SKATEBOARD", "CACTUS",
  "LIGHTHOUSE", "AVALANCHE", "KANGAROO", "TRUMPET", "GLACIER", "PRETZEL",
  "HAMMOCK", "JELLYFISH", "ORCHESTRA", "CAMPFIRE", "UMBRELLA", "SCORPION",
  "HARMONICA", "PLAYGROUND", "SUBMARINE", "BLIZZARD", "ARMADILLO", "CANYON",
  "FIREFLY", "MOUNTAIN",
];

export const GUESS_WHO_CHARACTERS: { id: string; name: string; emoji: string }[] = [
  { id: "cowboy", name: "Cowboy Cole", emoji: "🤠" },
  { id: "ninja", name: "Ninja Nora", emoji: "🥷" },
  { id: "wizard", name: "Wizard Orin", emoji: "🧙‍♂️" },
  { id: "witch", name: "Witch Hazel", emoji: "🧙‍♀️" },
  { id: "hero", name: "Hero Harlow", emoji: "🦸‍♀️" },
  { id: "villain", name: "Villain Vic", emoji: "🦹‍♂️" },
  { id: "detective", name: "Detective Drake", emoji: "🕵️‍♂️" },
  { id: "astronaut", name: "Astronaut Amir", emoji: "👨‍🚀" },
  { id: "rockstar", name: "Rockstar Rae", emoji: "👩‍🎤" },
  { id: "vampire", name: "Vampire Viktor", emoji: "🧛‍♂️" },
  { id: "mermaid", name: "Mermaid Marina", emoji: "🧜‍♀️" },
  { id: "prince", name: "Prince Percy", emoji: "🤴" },
  { id: "princess", name: "Princess Wren", emoji: "👸" },
  { id: "fairy", name: "Fairy Fiona", emoji: "🧚‍♀️" },
  { id: "genie", name: "Genie Jasper", emoji: "🧞‍♂️" },
  { id: "santa", name: "Santa Stan", emoji: "🎅" },
  { id: "alien", name: "Alien Zeta", emoji: "👽" },
  { id: "clown", name: "Clown Coco", emoji: "🤡" },
  { id: "ghost", name: "Ghost Gus", emoji: "👻" },
  { id: "guard", name: "Guard Gerald", emoji: "💂‍♂️" },
];

// Classic 1992 US "New Boggle" 16-cube letter distribution. "Qu" is a
// single die face representing both letters as one tile.
export const BOGGLE_DICE: string[][] = [
  ["A", "A", "E", "E", "G", "N"],
  ["E", "L", "R", "T", "T", "Y"],
  ["A", "O", "O", "T", "T", "W"],
  ["A", "B", "B", "J", "O", "O"],
  ["E", "H", "R", "T", "V", "W"],
  ["C", "I", "M", "O", "T", "U"],
  ["D", "I", "S", "T", "T", "Y"],
  ["E", "I", "O", "S", "S", "T"],
  ["D", "E", "L", "R", "V", "Y"],
  ["A", "C", "H", "O", "P", "S"],
  ["H", "I", "M", "N", "QU", "U"],
  ["E", "E", "I", "N", "S", "U"],
  ["E", "E", "G", "H", "N", "W"],
  ["A", "F", "F", "K", "P", "S"],
  ["H", "L", "N", "N", "R", "Z"],
  ["D", "E", "I", "L", "R", "X"],
];

// "Big Boggle" (1988) 5x5, 25-cube letter distribution - the standard
// larger board size.
export const BIG_BOGGLE_DICE: string[][] = [
  ["A", "A", "A", "F", "R", "S"],
  ["A", "A", "E", "E", "E", "E"],
  ["A", "A", "F", "I", "R", "S"],
  ["A", "D", "E", "N", "N", "N"],
  ["A", "E", "E", "E", "E", "M"],
  ["A", "E", "E", "G", "M", "U"],
  ["A", "E", "G", "M", "N", "N"],
  ["A", "F", "I", "R", "S", "Y"],
  ["B", "J", "K", "QU", "X", "Z"],
  ["C", "C", "N", "S", "T", "W"],
  ["C", "E", "I", "I", "L", "T"],
  ["C", "E", "I", "L", "P", "T"],
  ["C", "E", "I", "P", "S", "T"],
  ["D", "D", "L", "N", "O", "R"],
  ["D", "H", "H", "L", "O", "R"],
  ["D", "H", "H", "N", "O", "T"],
  ["D", "H", "L", "N", "O", "R"],
  ["E", "I", "I", "I", "T", "T"],
  ["E", "M", "O", "T", "T", "T"],
  ["E", "N", "S", "S", "S", "U"],
  ["F", "I", "P", "R", "S", "Y"],
  ["G", "O", "R", "R", "V", "W"],
  ["H", "I", "P", "R", "R", "Y"],
  ["N", "O", "O", "T", "U", "W"],
  ["O", "O", "O", "T", "T", "U"],
];

// Concrete, drawable prompts for Pictionary - deliberately simpler and more
// literal than HANGMAN_WORDS or the dictionary, since these need to be
// sketchable in under a minute, not just spellable.
export const DRAWING_WORDS: string[] = [
  "Dog", "Cat", "Elephant", "Giraffe", "Penguin", "Octopus", "Butterfly", "Spider",
  "Kangaroo", "Dolphin", "Shark", "Owl", "Snail", "Frog", "Bee", "Snake",
  "House", "Castle", "Lighthouse", "Bridge", "Tent", "Windmill", "Skyscraper", "Igloo",
  "Car", "Airplane", "Bicycle", "Rocket", "Submarine", "Train", "Sailboat", "Hot air balloon",
  "Pizza", "Ice cream cone", "Hamburger", "Birthday cake", "Watermelon", "Taco", "Donut", "Sushi",
  "Sun", "Moon", "Rainbow", "Volcano", "Waterfall", "Tornado", "Lightning bolt", "Snowman",
  "Guitar", "Piano", "Drum", "Trumpet", "Violin", "Microphone", "Headphones", "Saxophone",
  "Robot", "Ghost", "Alien", "Dragon", "Unicorn", "Mermaid", "Wizard", "Vampire",
  "Umbrella", "Backpack", "Sunglasses", "Crown", "Key", "Anchor", "Compass", "Telescope",
  "Soccer ball", "Basketball hoop", "Tennis racket", "Roller coaster", "Skateboard", "Kite", "Fishing rod", "Campfire",
  "Cowboy hat", "Astronaut", "Pirate ship", "Knight in armor", "Superhero", "Ballerina", "Chef", "Firefighter",
  "Toothbrush", "Scissors", "Ladder", "Hammer", "Paintbrush", "Camera", "Clock", "Magnifying glass",
  "Snowflake", "Cactus", "Palm tree", "Mushroom", "Sunflower", "Beehive", "Spider web", "Rain cloud",
  "Brushing teeth", "Riding a bike", "Playing tennis", "Sleeping", "Juggling", "Dancing", "Swimming", "Climbing a ladder",
];

export function pickUnused<T>(bank: T[], used: number[]): { item: T; index: number } {
  const available = bank.map((_, i) => i).filter((i) => !used.includes(i));
  const pool = available.length > 0 ? available : bank.map((_, i) => i);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { item: bank[index], index };
}

export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
