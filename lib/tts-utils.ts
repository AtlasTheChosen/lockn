/**
 * Text preprocessing for Text-to-Speech
 * 
 * This function cleans and normalizes text to ensure better TTS output:
 * - Preserve important diacritics and accent marks
 * - Clean up whitespace and formatting
 * - Remove or replace problematic characters
 */
export function preprocessTextForTTS(text: string, language?: string): string {
  if (!text) return '';
  
  let processed = text;
  
  // 1. Normalize Unicode (NFC form - composed characters)
  // This ensures proper handling of accented characters (é, ñ, etc.)
  processed = processed.normalize('NFC');
  
  // 2. Replace colons with periods (known issue: TTS skips words after colons)
  processed = processed.replace(/:/g, '.');
  
  // 3. Normalize different types of quotes and apostrophes
  // Convert smart quotes to regular quotes/apostrophes for better TTS handling
  processed = processed
    .replace(/[""]/g, '"')  // Smart double quotes
    .replace(/['']/g, "'")  // Smart single quotes/apostrophes
    .replace(/['‚]/g, "'"); // Other apostrophe variants
  
  // 4. Normalize dashes (preserve em-dash meaning, but use hyphen for better TTS)
  // Convert en-dash and em-dash to regular hyphens
  processed = processed.replace(/[–—]/g, '-');
  
  // 5. Replace multiple consecutive punctuation with single punctuation
  // This prevents TTS from pausing too long or misreading punctuation
  processed = processed.replace(/[.,!?;]{2,}/g, (match) => match[0]);
  
  // 6. Handle multiple newlines/blank lines - replace with single space
  processed = processed.replace(/\n\s*\n/g, ' ');
  
  // 7. Remove or replace emoji and special symbols that might confuse TTS
  // Remove common emoji ranges (keep text, remove graphical characters)
  processed = processed.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Emoji
  processed = processed.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Miscellaneous symbols
  processed = processed.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  
  // 8. Clean up extra whitespace (but preserve single spaces)
  processed = processed.trim().replace(/\s+/g, ' ');
  
  // 9. Remove zero-width characters that might interfere
  processed = processed.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  return processed;
}
