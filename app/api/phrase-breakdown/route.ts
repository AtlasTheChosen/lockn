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

  try {
    const { phrase, translation, targetLanguage = 'Spanish', nativeLanguage = 'English' } = await request.json();

    if (!phrase || !translation) {
      return NextResponse.json({ error: 'Missing phrase or translation' }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json({ 
        wordBreakdown: [],
        grammarNotes: 'API key not configured',
        mnemonic: '',
        culturalContext: '',
        usageTips: ''
      });
    }

    const systemPrompt = `You are a language learning expert helping users deeply understand ${targetLanguage} phrases. Given a phrase and its ${nativeLanguage} translation, provide a comprehensive breakdown to help memorization and understanding.

Return ONLY valid JSON in this exact format:
{
  "wordBreakdown": [
    {
      "word": "original word in ${targetLanguage}",
      "meaning": "${nativeLanguage} meaning",
      "grammar": "grammatical role (e.g., 'verb - present tense', 'noun - feminine', 'preposition')"
    }
  ],
  "grammarNotes": "Brief explanation of any important grammar structures used in this phrase",
  "mnemonic": "A creative, memorable trick to remember this phrase (use wordplay, visual associations, stories, or sound-alikes)",
  "culturalContext": "When and where native speakers would typically use this phrase, any cultural nuances",
  "usageTips": "Practical tips on when to use this phrase, formality level, common situations"
}

Make the mnemonic creative, memorable, and even funny if appropriate. It should help the learner remember both the phrase AND its meaning.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Break down this ${targetLanguage} phrase for a ${nativeLanguage} speaker:

Phrase: "${phrase}"
Translation: "${translation}"

Provide word-by-word breakdown, grammar notes, a memorable mnemonic, cultural context, and usage tips.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ 
        wordBreakdown: [],
        grammarNotes: '',
        mnemonic: '',
        culturalContext: '',
        usageTips: ''
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
          grammarNotes: '',
          mnemonic: '',
          culturalContext: '',
          usageTips: ''
        });
      }
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Breakdown error:', error);
    return NextResponse.json({ 
      wordBreakdown: [],
      grammarNotes: '',
      mnemonic: '',
      culturalContext: '',
      usageTips: ''
    });
  }
}





