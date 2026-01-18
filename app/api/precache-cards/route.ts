import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import OpenAI from 'openai';

// Initialize clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Generate audio cache key
function getAudioCacheKey(text: string, language: string, voiceGender: string): string {
  return createHash('md5')
    .update(`${text.toLowerCase().trim()}-${language}-${voiceGender}-openai`)
    .digest('hex');
}

// Generate grammar breakdown for a card
async function generateGrammarBreakdown(
  openai: OpenAI,
  phrase: string,
  translation: string,
  targetLanguage: string,
  nativeLanguage: string
): Promise<any> {
  const systemPrompt = `You are a language learning expert. Break down this ${targetLanguage} phrase to help a ${nativeLanguage} speaker truly understand and remember it.

Return ONLY valid JSON:
{
  "wordBreakdown": [
    {
      "word": "word in ${targetLanguage}",
      "meaning": "${nativeLanguage} meaning",
      "grammar": "grammatical role (verb-present, noun-fem, etc.)"
    }
  ],
  "grammarPattern": "The reusable grammar rule this phrase demonstrates. Explain WHY it works this way.",
  "patternExamples": ["2-3 other common phrases using this same pattern"],
  "cognateHint": "Any ${targetLanguage} words here that share roots with ${nativeLanguage} words (or empty string if none)",
  "commonMistake": "What learners typically get wrong with this grammar/vocab and why",
  "memoryTrick": "ONLY include if genuinely clever - a memorable way to remember the grammar pattern or a tricky word. Leave empty string if nothing clever comes to mind."
}

CRITICAL: wordBreakdown MUST include EVERY word in the phrase - articles, pronouns, prepositions, conjunctions, and contractions. NO word should be skipped.

Focus on teaching PATTERNS that unlock many sentences, not just this one phrase. Be concise.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Phrase: "${phrase}"\nTranslation: "${translation}"` },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = completion.choices[0].message.content;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  }
}

/**
 * Preprocess text for OpenAI TTS to avoid known issues:
 * - Replace colons with periods (prevents word skipping)
 * - Remove/reduce blank lines (prevents truncation)
 * - Normalize punctuation for better pronunciation
 */
function preprocessTextForTTS(text: string): string {
  return text
    // Replace colons with periods (known issue: TTS skips words after colons)
    .replace(/:/g, '.')
    // Replace multiple newlines/blank lines with single space (prevents truncation)
    .replace(/\n\s*\n/g, ' ')
    // Trim and clean up extra whitespace
    .trim()
    .replace(/\s+/g, ' ');
}

// Generate and cache TTS audio
async function generateAndCacheAudio(
  openai: OpenAI,
  supabase: any,
  cardId: string,
  text: string,
  language: string,
  voiceGender: string = 'female'
): Promise<string | null> {
  const cacheKey = getAudioCacheKey(text, language, voiceGender);
  const fileName = `${cacheKey}.mp3`;

  // Check if audio already exists
  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
  const publicUrl = urlData?.publicUrl;

  if (publicUrl) {
    try {
      const response = await fetch(publicUrl);
      if (response.ok) {
        console.log(`[Precache] Audio exists: ${cacheKey.substring(0, 8)}`);
        return publicUrl;
      }
    } catch (e) {
      // Continue to generate
    }
  }

  // Preprocess text to avoid TTS misreading issues
  const processedText = preprocessTextForTTS(text);

  // Generate new audio
  const voice = voiceGender === 'male' ? 'onyx' : 'nova';
  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voice,
    input: processedText,
    response_format: 'mp3',
  });

  const audioBuffer = await mp3Response.arrayBuffer();

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(fileName, Buffer.from(audioBuffer), {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('[Precache] Audio upload error:', uploadError);
    return null;
  }

  const { data: newUrlData } = supabase.storage.from('audio').getPublicUrl(fileName);
  console.log(`[Precache] Audio generated: ${cacheKey.substring(0, 8)}`);
  return newUrlData?.publicUrl || null;
}

export async function POST(request: NextRequest) {
  try {
    const { stackId, cardIds, targetLanguage, nativeLanguage = 'English' } = await request.json();

    if (!stackId && !cardIds) {
      return NextResponse.json({ error: 'stackId or cardIds required' }, { status: 400 });
    }

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cards that need caching
    let query = supabase
      .from('flashcards')
      .select('id, target_phrase, native_translation, grammar_breakdown, audio_url, card_stacks!inner(target_language, native_language)');

    if (stackId) {
      query = query.eq('stack_id', stackId);
    } else if (cardIds) {
      query = query.in('id', cardIds);
    }

    const { data: cards, error: fetchError } = await query;

    if (fetchError || !cards) {
      console.error('[Precache] Failed to fetch cards:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    console.log(`[Precache] Processing ${cards.length} cards for stack ${stackId || 'multiple'}`);

    let audioGenerated = 0;
    let breakdownGenerated = 0;
    let errors = 0;

    // Process cards in parallel batches (max 3 concurrent)
    const batchSize = 3;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (card: any) => {
        const cardLanguage = targetLanguage || card.card_stacks?.target_language || 'Spanish';
        const cardNativeLanguage = nativeLanguage || card.card_stacks?.native_language || 'English';
        const updates: any = {};

        try {
          // Generate grammar breakdown if not cached
          if (!card.grammar_breakdown) {
            const breakdown = await generateGrammarBreakdown(
              openai,
              card.target_phrase,
              card.native_translation,
              cardLanguage,
              cardNativeLanguage
            );
            if (breakdown) {
              updates.grammar_breakdown = breakdown;
              breakdownGenerated++;
            }
          }

          // Generate audio if not cached
          if (!card.audio_url) {
            const audioUrl = await generateAndCacheAudio(
              openai,
              supabase,
              card.id,
              card.target_phrase,
              cardLanguage
            );
            if (audioUrl) {
              updates.audio_url = audioUrl;
              audioGenerated++;
            }
          }

          // Update card if we have new data
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('flashcards')
              .update(updates)
              .eq('id', card.id);

            if (updateError) {
              console.error(`[Precache] Failed to update card ${card.id}:`, updateError);
              errors++;
            }
          }
        } catch (cardError) {
          console.error(`[Precache] Error processing card ${card.id}:`, cardError);
          errors++;
        }
      }));
    }

    console.log(`[Precache] Complete: ${audioGenerated} audio, ${breakdownGenerated} breakdowns, ${errors} errors`);

    return NextResponse.json({
      success: true,
      processed: cards.length,
      audioGenerated,
      breakdownGenerated,
      errors,
    });
  } catch (error: any) {
    console.error('[Precache] Error:', error);
    return NextResponse.json({ error: error.message || 'Precache failed' }, { status: 500 });
  }
}

// GET endpoint to check cache status for a stack
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stackId = searchParams.get('stackId');

  if (!stackId) {
    return NextResponse.json({ error: 'stackId required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: cards, error } = await supabase
    .from('flashcards')
    .select('id, grammar_breakdown, audio_url')
    .eq('stack_id', stackId);

  if (error || !cards) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }

  const total = cards.length;
  const withBreakdown = cards.filter((c: any) => c.grammar_breakdown).length;
  const withAudio = cards.filter((c: any) => c.audio_url).length;

  return NextResponse.json({
    total,
    cached: {
      breakdown: withBreakdown,
      audio: withAudio,
    },
    needsCaching: {
      breakdown: total - withBreakdown,
      audio: total - withAudio,
    },
    complete: withBreakdown === total && withAudio === total,
  });
}
