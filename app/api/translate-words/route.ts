import { NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  const openai = getOpenAI();
  let text: string | undefined;
  let sourceLanguage = 'Spanish';
  let targetLanguage = 'English';

  try {
    const body = await request.json();
    text = body.text;
    sourceLanguage = body.sourceLanguage || 'Spanish';
    targetLanguage = body.targetLanguage || 'English';

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    if (!openai) {
      console.error('[Translate Words] OpenAI API key not configured');
      return NextResponse.json({ translations: [] });
    }

    // Log translation request for debugging
    console.log(`[Translate Words] Request: ${sourceLanguage} -> ${targetLanguage}, text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    const isEnglishToEnglish = sourceLanguage === 'English' && targetLanguage === 'English';

    const systemPrompt = isEnglishToEnglish
      ? `You are a language learning assistant helping users understand nuanced English meanings.

For EVERY word in the English text (including articles, prepositions, etc.), provide:
1. The primary contextual meaning
2. 2-4 common alternative meanings/contexts if the word has multiple uses
3. For verbs: conjugation information (tense, person, infinitive form)

Example for "was running":
- "was": "past tense of 'to be'", conjugation: "past tense, singular (from infinitive: to be)"
- "running": "moving fast", conjugation: "present participle of 'to run'"

Return ONLY valid JSON in this format:
{
  "translations": [
    {
      "word": "original word",
      "translation": "primary contextual meaning",
      "alternatives": ["alt meaning 1", "alt meaning 2"],
      "conjugation": "tense/form info (only for verbs)"
    }
  ]
}

Include ALL words - do not skip any.`
      : `You are a language translation assistant. Given a phrase in ${sourceLanguage}, provide word-by-word translations to ${targetLanguage}.

For EVERY word in the text (including articles, prepositions, etc.), provide:
1. The primary translation
2. 2-3 common alternative meanings if applicable
3. For verbs: conjugation information (tense, person, infinitive form)

Example for Spanish "estaba corriendo":
- "estaba": "was/were", conjugation: "imperfect tense of 'estar' (to be), 1st/3rd person singular"
- "corriendo": "running", conjugation: "gerund of 'correr' (to run)"

Return ONLY valid JSON in this format:
{
  "translations": [
    {
      "word": "original word",
      "translation": "primary translation",
      "alternatives": ["alt meaning 1", "alt meaning 2"],
      "conjugation": "tense/form info (only for verbs)"
    }
  ]
}

Include ALL words - do not skip any.`;

    const userPrompt = isEnglishToEnglish
      ? `Provide contextual meanings, alternatives, and verb conjugation info for EVERY word in this English text: "${text}"`
      : `Translate EVERY word in this ${sourceLanguage} text to ${targetLanguage}, including verb conjugation info: "${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ translations: [] });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ translations: [] });
      }
    }

    const translations = parsed.translations || [];
    
    // Log result for debugging
    if (translations.length === 0) {
      console.warn(`[Translate Words] No translations returned for ${sourceLanguage} -> ${targetLanguage}, text: "${text.substring(0, 50)}"`);
    } else {
      console.log(`[Translate Words] Success: ${translations.length} words translated`);
    }
    
    return NextResponse.json({ translations });
  } catch (error: any) {
    console.error(`[Translate Words] Error translating ${sourceLanguage} -> ${targetLanguage}:`, error);
    console.error('[Translate Words] Error details:', {
      message: error.message,
      stack: error.stack,
      text: text?.substring(0, 50),
    });
    return NextResponse.json({ translations: [] });
  }
}
