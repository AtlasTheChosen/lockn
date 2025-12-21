import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function POST(req: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      { breakdown: 'AI explanations are not available. Please configure OpenAI API key.' },
      { status: 200 }
    );
  }

  try {
    const { targetPhrase, nativeTranslation, language, exampleSentence } = await req.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a language learning expert. Provide a comprehensive breakdown of phrases to help learners understand them deeply. Include:
- Grammar (tense, structure, conjugations)
- Mnemonics (memory aids)
- Regional/dialect notes
- Cultural context
- Pronunciation tips (phonetic or IPA if helpful)
- Common mistakes to avoid
- Etymology if interesting
- Related idioms or variations

Keep it concise but thorough. Format with clear sections using headers like "Grammar:", "Cultural Context:", etc.`,
        },
        {
          role: 'user',
          content: `Explain this ${language} phrase in detail:

Phrase: "${targetPhrase}"
Translation: "${nativeTranslation}"
Example: "${exampleSentence}"

Provide a comprehensive breakdown for a language learner.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const breakdown = completion.choices[0]?.message?.content || 'Unable to generate breakdown.';

    return NextResponse.json({ breakdown });
  } catch (error) {
    console.error('Error generating phrase breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to generate breakdown' },
      { status: 500 }
    );
  }
}
