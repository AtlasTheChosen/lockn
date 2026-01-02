import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// ElevenLabs voice IDs - Native accent voices for each language
// Using eleven_multilingual_v2 model which produces authentic accents

const FEMALE_VOICES: Record<string, string> = {
  'default': 'EXAVITQu4vr4xnSDxMaL',      // Sarah - warm, calm female (English)
  'English': 'EXAVITQu4vr4xnSDxMaL',      // Sarah - American English
  'Spanish': 'XB0fDUnXU5powFXDhCwa',      // Charlotte - Spanish accent
  'French': 'ThT5KcBeYPX3keUQqHPh',       // Dorothy - French accent
  'German': 'XrExE9yKIg1WjnnlVkGX',       // Matilda - German accent
  'Italian': 'LcfcDJNUP1GQjkzn1xUU',      // Emily - Italian accent
  'Portuguese': 'jBpfuIE2acCO8z3wKNLl',   // Gigi - Portuguese/Brazilian accent
  'Japanese': 'g5CIjZEefAph4nQFvHAz',     // Mimi - Japanese accent
  'Korean': 'jsCqWAovK2LkecY7zXl4',       // Freya - Korean accent  
  'Mandarin': 'oWAxZDx7w5VEj9dCyTzz',     // Grace - Mandarin accent
  'Russian': 'XrExE9yKIg1WjnnlVkGX',      // Matilda - Russian accent
  'Arabic': 'EXAVITQu4vr4xnSDxMaL',       // Sarah (multilingual)
  'Hindi': 'EXAVITQu4vr4xnSDxMaL',        // Sarah (multilingual)
  'Dutch': 'pFZP5JQG7iQjIQuC4Bku',        // Lily - Dutch accent
  'Polish': 'EXAVITQu4vr4xnSDxMaL',       // Sarah (multilingual)
  'Turkish': 'EXAVITQu4vr4xnSDxMaL',      // Sarah (multilingual)
};

const MALE_VOICES: Record<string, string> = {
  'default': 'TX3LPaxmHKxFdv7VOQHJ',      // Liam - calm, natural male (English)
  'English': 'TX3LPaxmHKxFdv7VOQHJ',      // Liam - British English
  'Spanish': 'VR6AewLTigWG4xSOukaG',      // Arnold - Spanish accent
  'French': 'IKne3meq5aSn9XLyUdCD',       // Charlie - French accent
  'German': 'GBv7mTt0atIp3Br8iCZE',       // Thomas - German accent
  'Italian': 'ODq5zmih8GrVes37Dizd',      // Patrick - Italian accent
  'Portuguese': 'TX3LPaxmHKxFdv7VOQHJ',   // Liam (multilingual) - Brazilian accent
  'Japanese': 'ZQe5CZNOzWyzPSCn5a3c',     // James - Japanese accent
  'Korean': 'bIHbv24MWmeRgasZH58o',       // Will - Korean accent
  'Mandarin': 'N2lVS1w4EtoT3dr4eOWO',     // Callum - Mandarin accent
  'Russian': 'GBv7mTt0atIp3Br8iCZE',      // Thomas (multilingual)
  'Arabic': 'TX3LPaxmHKxFdv7VOQHJ',       // Liam (multilingual)
  'Hindi': 'TX3LPaxmHKxFdv7VOQHJ',        // Liam (multilingual)
  'Dutch': 'onwK4e9ZLuTAKqWW03F9',        // Daniel - Dutch accent
  'Polish': 'TX3LPaxmHKxFdv7VOQHJ',       // Liam (multilingual)
  'Turkish': 'TX3LPaxmHKxFdv7VOQHJ',      // Liam (multilingual)
};

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const CACHE_DIR = path.join(process.cwd(), '.audio-cache');

// Create cache directory if it doesn't exist
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Generate a cache key from text, language, and voice settings
function getCacheKey(text: string, language: string, voiceGender: string): string {
  const hash = createHash('md5')
    .update(`${text.toLowerCase().trim()}-${language}-${voiceGender}`)
    .digest('hex');
  return hash;
}

export async function POST(request: NextRequest) {
  try {
    const { text, language, voiceGender = 'female' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Check cache first
    ensureCacheDir();
    const cacheKey = getCacheKey(text, language || 'default', voiceGender);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.mp3`);

    // Return cached audio if it exists
    if (existsSync(cachePath)) {
      console.log(`[TTS Cache] HIT: "${text.substring(0, 30)}..." (${cacheKey.substring(0, 8)})`);
      const cachedAudio = readFileSync(cachePath);
      return new NextResponse(cachedAudio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    console.log(`[TTS Cache] MISS: "${text.substring(0, 30)}..." - fetching from ElevenLabs`);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' }, 
        { status: 500 }
      );
    }

    // Select the best voice for this language and gender
    const voiceMap = voiceGender === 'male' ? MALE_VOICES : FEMALE_VOICES;
    const voiceId = voiceMap[language] || voiceMap['default'];

    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate speech' }, 
        { status: response.status }
      );
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Save to cache
    try {
      writeFileSync(cachePath, Buffer.from(audioBuffer));
      console.log(`[TTS Cache] SAVED: ${cacheKey.substring(0, 8)} (${audioBuffer.byteLength} bytes)`);
    } catch (cacheError) {
      console.error('[TTS Cache] Failed to save:', cacheError);
      // Continue even if caching fails
    }
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Cache': 'MISS',
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
