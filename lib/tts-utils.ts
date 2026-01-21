/**
 * Text preprocessing for Text-to-Speech
 * 
 * This function cleans and normalizes text to ensure better TTS output:
 * - Preserve important diacritics and accent marks
 * - Clean up whitespace and formatting
 * - Remove or replace problematic characters
 * - Fix known issues that cause word skipping and mispronunciation
 */
export function preprocessTextForTTS(text: string, language?: string): string {
  // Text validation - return early for invalid input
  if (!text || typeof text !== 'string') return '';
  
  // Check if text is only whitespace
  if (text.trim().length === 0) return '';
  
  let processed = text;
  const originalLength = processed.length;
  
  // 1. Normalize Unicode (NFC form - composed characters)
  // This ensures proper handling of accented characters (é, ñ, etc.)
  processed = processed.normalize('NFC');
  
  // 2. CRITICAL FIX: Remove leading spaces after punctuation (known cause of word skipping)
  // Pattern: punctuation followed by space(s) - remove the space
  // This prevents TTS from skipping the next word
  processed = processed.replace(/([.,!?;:])\s+/g, '$1 ');
  
  // 3. Handle structured formats (Key: Value) - convert colons to dashes or periods
  // OpenAI TTS has issues with colons, especially in structured data
  // Pattern: word(s) followed by colon and space - convert colon to dash
  processed = processed.replace(/(\w+):\s+(\w)/g, '$1 - $2');
  // Handle remaining colons (not in structured format) - replace with periods
  processed = processed.replace(/:/g, '.');
  
  // 4. Normalize different types of quotes and apostrophes
  // Convert smart quotes to regular quotes/apostrophes for better TTS handling
  processed = processed
    .replace(/[""]/g, '"')  // Smart double quotes
    .replace(/['']/g, "'")  // Smart single quotes/apostrophes
    .replace(/['‚]/g, "'"); // Other apostrophe variants
  
  // 5. Better parentheses handling - add spaces around parentheses for clarity
  // Pattern: (word) or word(word) - normalize to ( word ) or word ( word )
  processed = processed.replace(/(\w)\(/g, '$1 (');  // Add space before opening paren
  processed = processed.replace(/\)(\w)/g, ') $1');  // Add space after closing paren
  // Remove multiple spaces created by the above
  processed = processed.replace(/\s+/g, ' ');
  
  // 6. Normalize dashes (preserve em-dash meaning, but use hyphen for better TTS)
  // Convert en-dash and em-dash to regular hyphens
  // But preserve hyphens in words (like compound words)
  processed = processed.replace(/[–—]/g, '-');
  
  // 7. Handle multiple consecutive punctuation - keep only the first
  // This prevents TTS from pausing too long or misreading punctuation
  processed = processed.replace(/[.,!?;]{2,}/g, (match) => match[0]);
  
  // 8. Handle multiple newlines/blank lines - replace with single space
  processed = processed.replace(/\n\s*\n/g, ' ');
  
  // 9. Remove or replace emoji and special symbols that might confuse TTS
  // Remove common emoji ranges (keep text, remove graphical characters)
  processed = processed.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Emoji
  processed = processed.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Miscellaneous symbols
  processed = processed.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  
  // 10. Language-specific preprocessing rules
  if (language) {
    const langLower = language.toLowerCase();
    
    // Spanish: Handle inverted question marks and exclamation marks
    if (langLower === 'spanish' || langLower.includes('spanish')) {
      processed = processed.replace(/[¿¡]/g, ''); // Remove inverted marks, TTS handles them poorly
    }
    
    // French: Handle guillemets (French quotation marks)
    if (langLower === 'french' || langLower.includes('french')) {
      processed = processed.replace(/[«»]/g, '"'); // Convert to regular quotes
    }
    
    // Japanese/Chinese: Ensure proper spacing (may not apply here, but good to have)
    if (langLower === 'japanese' || langLower === 'mandarin' || langLower === 'chinese') {
      // These languages typically don't use spaces, so minimal processing
      // But ensure no accidental spaces are removed between characters
    }
  }
  
  // 11. Clean up extra whitespace (but preserve single spaces)
  processed = processed.trim().replace(/\s+/g, ' ');
  
  // 12. Remove zero-width characters that might interfere
  processed = processed.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // 13. Split very long texts at sentence boundaries if needed
  // OpenAI TTS API limit is 4096 characters, but we want to keep it shorter for better quality
  const MAX_LENGTH = 3000;
  if (processed.length > MAX_LENGTH) {
    // Try to split at sentence boundaries
    const sentences = processed.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 1) {
      let splitText = '';
      for (const sentence of sentences) {
        if ((splitText + sentence).length <= MAX_LENGTH) {
          splitText += sentence + ' ';
        } else {
          break; // Stop at first sentence that would exceed limit
        }
      }
      if (splitText.trim().length > 0) {
        processed = splitText.trim();
      }
      // If still too long, just truncate (better than failing)
      if (processed.length > MAX_LENGTH) {
        processed = processed.substring(0, MAX_LENGTH).trim();
      }
    } else {
      // No sentence boundaries, just truncate
      processed = processed.substring(0, MAX_LENGTH).trim();
    }
  }
  
  // Final validation - ensure we have valid text after processing
  if (processed.trim().length === 0) {
    // If processing resulted in empty string, return original (shouldn't happen, but safety)
    return text.trim();
  }
  
  return processed;
}
