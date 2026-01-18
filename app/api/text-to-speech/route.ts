import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// OpenAI TTS voices
// nova - female, clear and friendly
// onyx - male, deep and warm
const VOICE_MAP = {
  female: 'nova',
  male: 'onyx',
} as const;

// Initialize Supabase client with service role for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Generate a cache key from text, language, and voice settings
function getCacheKey(text: string, language: string, voiceGender: string): string {
  const hash = createHash('md5')
    .update(`${text.toLowerCase().trim()}-${language}-${voiceGender}-openai`)
    .digest('hex');
  return hash;
}

/**
 * Preprocess text for OpenAI TTS to improve pronunciation across all languages:
 * - Normalize Unicode for proper character encoding
 * - Handle punctuation that might confuse TTS
 * - Preserve important diacritics and accent marks
 * - Clean up whitespace and formatting
 * - Remove or replace problematic characters
 */
function preprocessTextForTTS(text: string, language?: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const { text, language, voiceGender = 'female', cardId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const cacheKey = getCacheKey(text, language || 'default', voiceGender);
    const fileName = `${cacheKey}.mp3`;

    // Initialize Supabase client for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if audio already exists in Supabase Storage using public URL (faster than signed URL)
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData?.publicUrl;
    
    if (publicUrl) {
      // Fetch directly from public URL (faster than signed URL flow)
      try {
        const cachedResponse = await fetch(publicUrl);
        if (cachedResponse.ok) {
          console.log(`[TTS OpenAI] CACHE HIT: "${text.substring(0, 30)}..." (${cacheKey.substring(0, 8)})`);
          const cachedAudio = await cachedResponse.arrayBuffer();
          return new NextResponse(cachedAudio, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'X-Cache': 'HIT',
              'X-Audio-Hash': cacheKey,
              'X-Audio-Url': publicUrl,
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch (e) {
        // File doesn't exist, continue to generate
      }
    }

    console.log(`[TTS OpenAI] CACHE MISS: "${text.substring(0, 30)}..." - generating with OpenAI`);

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' }, 
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Select voice based on gender
    const voice = VOICE_MAP[voiceGender as keyof typeof VOICE_MAP] || VOICE_MAP.female;

    // Preprocess text to avoid TTS misreading issues
    const processedText = preprocessTextForTTS(text);

    // Generate speech with OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: processedText,
      response_format: 'mp3',
    });

    // Get the audio buffer
    const audioBuffer = await mp3Response.arrayBuffer();
    
    // Upload to Supabase Storage for permanent caching
    let audioUrl: string | null = null;
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, Buffer.from(audioBuffer), {
          contentType: 'audio/mpeg',
          upsert: true, // Overwrite if exists
        });

      if (uploadError) {
        console.error('[TTS OpenAI] Upload error:', uploadError);
      } else {
        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(fileName);
        
        audioUrl = urlData?.publicUrl || null;
        console.log(`[TTS OpenAI] SAVED: ${cacheKey.substring(0, 8)} (${audioBuffer.byteLength} bytes)`);

        // If cardId provided, update the flashcard with the audio URL
        if (cardId && audioUrl) {
          const { error: updateError } = await supabase
            .from('flashcards')
            .update({ audio_url: audioUrl })
            .eq('id', cardId);
          
          if (updateError) {
            console.warn('[TTS OpenAI] Failed to update card audio_url:', updateError);
          } else {
            console.log(`[TTS OpenAI] Updated card ${cardId} with audio URL`);
          }
        }
      }
    } catch (storageError) {
      console.error('[TTS OpenAI] Failed to save:', storageError);
      // Continue even if storage fails - just return the audio
    }
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Cache': 'MISS',
        'X-Audio-Hash': cacheKey, // Return hash for client-side tracking
        'X-Audio-Url': audioUrl || '',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
