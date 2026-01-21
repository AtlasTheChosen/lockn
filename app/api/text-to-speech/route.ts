import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { preprocessTextForTTS } from '@/lib/tts-utils';

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

export async function POST(request: NextRequest) {
  try {
    const { text, language, voiceGender = 'female', cardId } = await request.json();

    // Validate text input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
    }
    
    // Check if text is only whitespace
    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'Text cannot be empty or whitespace only' }, { status: 400 });
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
    const processedText = preprocessTextForTTS(text, language);
    
    // Log preprocessing changes for debugging (only if text changed significantly)
    if (processedText !== text.trim() && Math.abs(processedText.length - text.length) > 5) {
      console.log(`[TTS OpenAI] Preprocessing: "${text.substring(0, 50)}..." → "${processedText.substring(0, 50)}..." (length: ${text.length} → ${processedText.length})`);
    }

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
