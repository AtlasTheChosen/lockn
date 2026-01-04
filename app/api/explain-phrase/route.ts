import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DEBUG_SERVER } from '@/lib/debug';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function POST(req: NextRequest) {
  const apiStartTime = Date.now();
  DEBUG_SERVER.api('=== Explain Phrase API: Request received ===');

  if (!openai) {
    DEBUG_SERVER.apiError('OpenAI not configured');
    return NextResponse.json(
      { breakdown: 'AI explanations are not available. Please configure OpenAI API key.' },
      { status: 200 }
    );
  }

  try {
    const requestBody = await req.json();
    const { targetPhrase, nativeTranslation, language, exampleSentence } = requestBody;
    
    DEBUG_SERVER.api('Explain phrase parameters', {
      language,
      phrasePreview: targetPhrase?.substring(0, 30),
    });

    const openaiStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a language learning expert. Break down phrases to help learners understand and remember them. Include:

**Grammar:** Explain the structure, tense, conjugations - and WHY it works this way

**Pattern:** Show 2-3 other phrases using the same grammar pattern (this unlocks many sentences, not just one)

**Cognates:** Any words that share roots with English (free vocabulary!)

**Watch Out:** Common mistakes learners make with this grammar/vocab

**Memory Trick:** ONLY if genuinely clever - skip this section entirely if nothing good comes to mind

Keep it concise. Focus on teaching reusable patterns, not isolated facts.`,
        },
        {
          role: 'user',
          content: `Break down this ${language} phrase:

Phrase: "${targetPhrase}"
Translation: "${nativeTranslation}"
${exampleSentence ? `Example: "${exampleSentence}"` : ''}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    DEBUG_SERVER.timing('OpenAI completion', openaiStartTime);
    const breakdown = completion.choices[0]?.message?.content || 'Unable to generate breakdown.';
    
    DEBUG_SERVER.api('Breakdown generated', {
      hasBreakdown: !!breakdown,
      length: breakdown.length,
    });
    DEBUG_SERVER.timing('Total explain phrase API time', apiStartTime);

    return NextResponse.json({ breakdown });
  } catch (error: any) {
    DEBUG_SERVER.apiError('Explain phrase exception', error);
    DEBUG_SERVER.timing('Total explain phrase API time (failed)', apiStartTime);
    return NextResponse.json(
      { error: 'Failed to generate breakdown' },
      { status: 500 }
    );
  }
}
