// Excludes visually-confusable letters (I, O) to keep codes easy to read and type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().slice(0, 4);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z]{4}$/.test(code);
}
