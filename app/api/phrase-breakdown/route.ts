import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  const openai = getOpenAI();

  try {
    const { phrase, translation, targetLanguage = 'Spanish', nativeLanguage = 'English', cardId } = await request.json();

    if (!phrase || !translation) {
      return NextResponse.json({ error: 'Missing phrase or translation' }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json({ 
        wordBreakdown: [],
        grammarPattern: 'API key not configured',
        patternExamples: [],
        cognateHint: '',
        commonMistake: '',
        memoryTrick: ''
      });
    }

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

CRITICAL: wordBreakdown MUST include EVERY word in the phrase - articles (the, a, le, la, el, un, une), pronouns (I, you, he, je, tu, il, yo, tú), prepositions (to, of, à, de, a), conjunctions (and, but, et, y), and contractions. NO word should be skipped. If a word is an article, explain its gender/number agreement. If it's a contraction, explain what words it combines.

Focus on teaching PATTERNS that unlock many sentences, not just this one phrase. Connect to ${nativeLanguage} cognates when possible. Be concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Phrase: "${phrase}"
Translation: "${translation}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ 
        wordBreakdown: [],
        grammarPattern: '',
        patternExamples: [],
        cognateHint: '',
        commonMistake: '',
        memoryTrick: ''
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ 
          wordBreakdown: [],
          grammarPattern: '',
          patternExamples: [],
          cognateHint: '',
          commonMistake: '',
          memoryTrick: ''
        });
      }
    }

    // Cache the breakdown in the database if cardId is provided
    if (cardId && parsed && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('flashcards')
          .update({ grammar_breakdown: parsed })
          .eq('id', cardId);
        console.log(`[Breakdown API] Cached for card ${cardId}`);
      } catch (cacheError) {
        console.warn('[Breakdown API] Failed to cache:', cacheError);
      }
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Breakdown error:', error);
    return NextResponse.json({ 
      wordBreakdown: [],
      grammarPattern: '',
      patternExamples: [],
      cognateHint: '',
      commonMistake: '',
      memoryTrick: ''
    });
  }
}





