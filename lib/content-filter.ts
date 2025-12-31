// Banned words list - comprehensive list of slurs and offensive terms
const BANNED_WORDS = [
  // Racial slurs
  'nigger', 'nigga', 'negro', 'coon', 'spic', 'spick', 'wetback', 'beaner', 'chink', 
  'gook', 'slope', 'zipperhead', 'jap', 'paki', 'raghead', 'towelhead',
  'kike', 'heeb', 'hymie', 'redskin', 'injun', 'squaw',
  'darkie', 'sambo', 'jiggaboo', 'porchmonkey',
  // Homophobic slurs
  'faggot', 'fag', 'dyke', 'tranny', 'shemale',
  // Other offensive terms
  'retard', 'retarded',
  // Nazi/hate group references
  'nazi', 'kkk', 'white power', 'heil',
];

// Additional explicit content patterns
const EXPLICIT_PATTERNS = [
  /\b(porn|xxx|nude|naked|horny)\b/i,
  /\b(rape|molest)\b/i,
  /\b(holocaust denial|supremac(y|ist))\b/i,
  /\b(terrorist|terrorism|bomb making|drug deal)\b/i,
];

// Character substitutions for leetspeak detection
const CHAR_SUBSTITUTIONS: Record<string, string> = {
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's',
  '6': 'g', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
  '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l', '¥': 'y',
};

// Normalize text to catch leetspeak and special characters
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  // Replace character substitutions
  for (const [char, replacement] of Object.entries(CHAR_SUBSTITUTIONS)) {
    normalized = normalized.split(char).join(replacement);
  }
  
  // Remove spaces, underscores, dashes, dots, and other separators
  normalized = normalized.replace(/[\s_\-\.·•‧]+/g, '');
  
  // Remove repeated characters (e.g., "niggggger" -> "niger")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  
  return normalized;
}

// Check if text contains any banned words
function containsBannedWord(text: string): boolean {
  const normalized = normalizeText(text);
  
  for (const word of BANNED_WORDS) {
    const normalizedWord = normalizeText(word);
    if (normalized.includes(normalizedWord)) {
      return true;
    }
  }
  
  return false;
}

const HISTORICAL_CONTEXT_PATTERNS = [
  /\b(historical|history|museum|educational|academic|study|research|documentary)\b/i,
  /\b(world war|civil rights|slavery abolition|discrimination awareness)\b/i,
];

export interface ContentFilterResult {
  isAppropriate: boolean;
  reason?: string;
}

export function checkContentAppropriateness(text: string): ContentFilterResult {
  // Check for banned words with leetspeak detection
  if (containsBannedWord(text)) {
    return {
      isAppropriate: false,
      reason: 'This content contains inappropriate language.'
    };
  }

  const hasHistoricalContext = HISTORICAL_CONTEXT_PATTERNS.some(pattern =>
    pattern.test(text)
  );

  // Check explicit patterns
  for (const pattern of EXPLICIT_PATTERNS) {
    if (pattern.test(text)) {
      if (hasHistoricalContext) {
        continue;
      }

      return {
        isAppropriate: false,
        reason: 'This content appears to contain inappropriate material.'
      };
    }
  }

  return { isAppropriate: true };
}
