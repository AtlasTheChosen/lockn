import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const DEMO_CARDS = [
  {
    target_phrase: '¿Qué tal el ambiente?',
    native_translation: "How's the vibe?",
    example_sentence: 'Used when arriving at a social event to check the energy',
    tone_advice: 'Casual',
  },
  {
    target_phrase: '¿Te apetece una copa?',
    native_translation: 'Would you like a drink?',
    example_sentence: 'Friendly invitation to get drinks together',
    tone_advice: 'Friendly',
  },
  {
    target_phrase: 'Qué coincidencia verte aquí',
    native_translation: 'What a coincidence seeing you here',
    example_sentence: 'When you bump into someone unexpectedly',
    tone_advice: 'Playful',
  },
  {
    target_phrase: '¿De dónde eres?',
    native_translation: 'Where are you from?',
    example_sentence: 'Classic conversation starter with someone new',
    tone_advice: 'Polite',
  },
  {
    target_phrase: 'Me encanta este lugar',
    native_translation: 'I love this place',
    example_sentence: 'Sharing positive feelings about the venue',
    tone_advice: 'Enthusiastic',
  },
];

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

const CONTENT_FILTER_PROMPT = `You are a language learning assistant. Generate flashcards for realistic social scenarios.

ALLOWED: Flirting, dating, nightlife, workplace conflicts, casual drinking, romantic contexts, mature conversations.
FORBIDDEN: Explicit sexual content, graphic violence, hate speech, illegal activities.

If a scenario crosses into forbidden territory, refuse politely.`;

export async function POST(request: Request) {
  const openai = getOpenAI();
  try {
    const { scenario, targetLanguage = 'Spanish', nativeLanguage = 'English', stackSize = 5, difficulty = 'B1' } = await request.json();

    if (!scenario) {
      return NextResponse.json({ error: 'Missing scenario' }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file to generate custom content for your selected topic.'
      }, { status: 503 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${CONTENT_FILTER_PROMPT}

Generate exactly ${stackSize} flashcards for a language learning scenario. Each card should be part of a chronological story/conversation that directly relates to the specific scenario provided.

DIFFICULTY LEVEL: ${difficulty} (CEFR standard)
- A1: Beginner - Simple, common phrases
- A2: Elementary - Basic everyday expressions
- B1: Intermediate - Clear standard language on familiar matters
- B2: Upper Intermediate - Complex text and spontaneous interaction
- C1: Advanced - Flexible language for social, academic, and professional purposes
- C2: Proficient - Precise, nuanced language in complex situations

CRITICAL REQUIREMENT: The scenario is "${scenario}". You MUST generate phrases that are EXCLUSIVELY relevant to this exact scenario. Every single phrase must be something someone would actually say in this specific situation. Match the complexity to the ${difficulty} level.

Examples of staying on topic:
- If scenario is "business negotiations in Tokyo", include phrases about meetings, proposals, agreements, professional language
- If scenario is "ordering at a Parisian café", include phrases about food, drinks, ordering, paying, café etiquette
- If scenario is "flirting at a Madrid nightclub", include phrases about introductions, compliments, dancing, drinks, social interactions

Do NOT mix topics. Do NOT include generic travel phrases unless the scenario is about travel. Stay laser-focused on the scenario provided.

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "target_phrase": "phrase in ${targetLanguage}",
      "native_translation": "translation in ${nativeLanguage}",
      "example_sentence": "when/how to use this phrase in the scenario",
      "tone_advice": "tone description (e.g., 'Casual', 'Playful', 'Formal', 'Sarcastic Gen-Z')"
    }
  ]
}

Make the phrases authentic, practical, and specific to the scenario. Include slang and colloquialisms where appropriate.`,
        },
        {
          role: 'user',
          content: `SCENARIO: "${scenario}"

Generate ${stackSize} flashcards in ${targetLanguage} specifically for this scenario.

REQUIREMENT: Every single phrase must be directly useful for the scenario "${scenario}". Build a natural progression through this exact scenario from start to finish.

Imagine you are actually in this situation right now. What would you say? Generate phrases for:
1. Starting/entering the situation
2. Main interactions during the situation
3. Key phrases specific to this context
4. Concluding/leaving the situation
5. Emergency or important phrases for this scenario

Stay STRICTLY on the topic of: ${scenario}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Invalid response format');
    }

    return NextResponse.json({ cards: parsed.cards });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cards' },
      { status: 500 }
    );
  }
}
