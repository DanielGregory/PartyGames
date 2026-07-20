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
