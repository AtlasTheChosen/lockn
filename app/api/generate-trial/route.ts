import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DEBUG_SERVER } from '@/lib/debug';
import { checkContentAppropriateness } from '@/lib/content-filter';
import { NON_LATIN_LANGUAGES, LANGUAGE_SCRIPTS, ROMANIZATION_NAMES } from '@/lib/constants';

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
  const apiStartTime = Date.now();
  DEBUG_SERVER.api('=== Generate Trial API: Request received ===');
  
  const openai = getOpenAI();
  if (!openai) {
    DEBUG_SERVER.apiError('OpenAI not configured');
  }

  try {
    const requestBody = await request.json();
    const { scenario, targetLanguage = 'Spanish', nativeLanguage = 'English', stackSize = 5, difficulty = 'B1', scriptPreference } = requestBody;
    
    // Check if target language needs romanization
    const needsRomanization = NON_LATIN_LANGUAGES.includes(targetLanguage);
    const romanizationName = ROMANIZATION_NAMES[targetLanguage] || 'romanization';
    
    DEBUG_SERVER.api('Trial generation parameters', {
      scenario: scenario?.substring(0, 50),
      targetLanguage,
      stackSize,
      difficulty,
      needsRomanization,
      scriptPreference,
    });

    if (!scenario) {
      DEBUG_SERVER.apiError('Missing scenario');
      return NextResponse.json({ error: 'Missing scenario' }, { status: 400 });
    }

    // Check for inappropriate content
    const contentCheck = checkContentAppropriateness(scenario);
    if (!contentCheck.isAppropriate) {
      DEBUG_SERVER.apiError('Inappropriate content detected', null, { scenario: scenario.substring(0, 50), reason: contentCheck.reason });
      return NextResponse.json({ 
        error: 'Inappropriate subject matter requested. Please enter a different topic for language learning.' 
      }, { status: 400 });
    }

    if (!openai) {
      DEBUG_SERVER.apiError('OpenAI not available');
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file to generate custom content for your selected topic.'
      }, { status: 503 });
    }

    // Build script preference instruction for non-Latin languages
    let scriptInstruction = '';
    if (needsRomanization) {
      if (scriptPreference && LANGUAGE_SCRIPTS[targetLanguage]) {
        const scriptOption = LANGUAGE_SCRIPTS[targetLanguage].find(s => s.id === scriptPreference);
        if (scriptOption) {
          scriptInstruction = `\n\n📝 WRITING SYSTEM REQUIREMENT:
Use ${scriptOption.name} (${scriptOption.description}) for all ${targetLanguage} phrases.`;
          
          // Add specific instructions for Japanese script preferences
          if (targetLanguage === 'Japanese') {
            if (scriptPreference === 'hiragana') {
              scriptInstruction += '\n- Use ONLY hiragana (ひらがな). Do NOT use katakana or kanji.';
            } else if (scriptPreference === 'katakana') {
              scriptInstruction += '\n- Use ONLY katakana (カタカナ). Do NOT use hiragana or kanji.';
            } else if (scriptPreference === 'mixed') {
              scriptInstruction += '\n- Use hiragana and katakana appropriately. Do NOT use kanji.';
            } else if (scriptPreference === 'kanji') {
              scriptInstruction += '\n- Use full Japanese writing including kanji where appropriate.';
            }
          } else if (targetLanguage === 'Chinese (Mandarin)') {
            if (scriptPreference === 'simplified') {
              scriptInstruction += '\n- Use ONLY simplified Chinese characters (简体字).';
            } else if (scriptPreference === 'traditional') {
              scriptInstruction += '\n- Use ONLY traditional Chinese characters (繁體字).';
            }
          } else if (targetLanguage === 'Korean') {
            if (scriptPreference === 'hangul') {
              scriptInstruction += '\n- Use ONLY Hangul (한글). Do NOT use Hanja.';
            } else if (scriptPreference === 'mixed') {
              scriptInstruction += '\n- Use Hangul with Hanja where appropriate for advanced vocabulary.';
            }
          } else if (targetLanguage === 'Arabic') {
            if (scriptPreference === 'vocalized') {
              scriptInstruction += '\n- Include full vowel diacritics (harakat) on all words.';
            }
          }
        }
      } else {
        // For non-Latin languages without script options, explicitly require native script
        const nativeScriptInstructions: Record<string, string> = {
          Russian: 'Use Cyrillic alphabet (кириллица) for all Russian phrases. Example: "Привет" not "Privet".',
          Greek: 'Use Greek alphabet (ελληνικό αλφάβητο) for all Greek phrases. Example: "Γεια σου" not "Geia sou".',
          Hindi: 'Use Devanagari script (देवनागरी) for all Hindi phrases. Example: "नमस्ते" not "Namaste".',
          Thai: 'Use Thai script (อักษรไทย) for all Thai phrases. Example: "สวัสดี" not "Sawatdee".',
          Hebrew: 'Use Hebrew alphabet (אלפבית עברי) for all Hebrew phrases. Example: "שלום" not "Shalom".',
        };
        
        if (nativeScriptInstructions[targetLanguage]) {
          scriptInstruction = `\n\n📝 NATIVE SCRIPT REQUIREMENT:
${nativeScriptInstructions[targetLanguage]}
The target_phrase field MUST be in the native script, NOT transliterated to Latin letters.`;
        }
      }
      
      scriptInstruction += `\n\n🔤 ROMANIZATION REQUIREMENT (MANDATORY for ${targetLanguage}):
You MUST include a "romanization" field for every card with the phonetic pronunciation in Latin letters.
- For Japanese: Use standard Romaji (e.g., "Ohayou gozaimasu")
- For Chinese: Use Pinyin with tone marks or numbers (e.g., "Nǐ hǎo" or "Ni3 hao3")
- For Korean: Use Revised Romanization (e.g., "Annyeonghaseyo")
- For Arabic: Use standard transliteration (e.g., "Marhaba")
- For Russian: Use standard transliteration (e.g., "Privet" for Привет)
- For Greek: Use standard romanization (e.g., "Geia sou" for Γεια σου)
- For Hindi: Use standard transliteration (e.g., "Namaste" for नमस्ते)
- For Thai: Use RTGS romanization (e.g., "Sawatdi" for สวัสดี)
- For Hebrew: Use standard transliteration (e.g., "Shalom" for שלום)

📚 CHARACTER BREAKDOWN REQUIREMENT (MANDATORY for ${targetLanguage}):
You MUST include a "character_breakdown" array showing each character with its individual pronunciation.
This helps learners understand how each letter/character sounds.

Example for Russian "Привет":
"character_breakdown": [
  {"character": "П", "romanization": "P"},
  {"character": "р", "romanization": "r"},
  {"character": "и", "romanization": "i"},
  {"character": "в", "romanization": "v"},
  {"character": "е", "romanization": "ye"},
  {"character": "т", "romanization": "t"}
]

Example for Japanese "こんにちは":
"character_breakdown": [
  {"character": "こ", "romanization": "ko"},
  {"character": "ん", "romanization": "n"},
  {"character": "に", "romanization": "ni"},
  {"character": "ち", "romanization": "chi"},
  {"character": "は", "romanization": "wa"}
]

Skip spaces in the breakdown. Each character should map to its phonetic sound.`;
    }

    DEBUG_SERVER.generation('Starting OpenAI trial generation', { model: 'gpt-4o', stackSize, difficulty });
    const openaiStartTime = Date.now();
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
${scriptInstruction}

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "target_phrase": "phrase in ${targetLanguage}",
      "native_translation": "translation in ${nativeLanguage}",${needsRomanization ? `
      "romanization": "phonetic pronunciation in Latin letters (${romanizationName})",
      "character_breakdown": [{"character": "X", "romanization": "x"}, ...],` : ''}
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

    DEBUG_SERVER.timing('OpenAI completion', openaiStartTime);
    const content = completion.choices[0].message.content;
    
    DEBUG_SERVER.generation('OpenAI response received', {
      hasContent: !!content,
      contentLength: content?.length || 0,
    });

    if (!content) {
      DEBUG_SERVER.generationError('No content generated');
      throw new Error('No content generated');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
      DEBUG_SERVER.generation('JSON parsed successfully', { cardCount: parsed.cards?.length });
    } catch (e: any) {
      DEBUG_SERVER.generationError('JSON parse failed, attempting regex', e);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
        DEBUG_SERVER.generation('JSON extracted via regex', { cardCount: parsed.cards?.length });
      } else {
        DEBUG_SERVER.generationError('Failed to extract JSON', null, { contentPreview: content.substring(0, 200) });
        throw new Error('Failed to parse AI response');
      }
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      DEBUG_SERVER.generationError('Invalid response format', null, {
        hasCards: !!parsed.cards,
        isArray: Array.isArray(parsed.cards),
      });
      throw new Error('Invalid response format');
    }

    // Validate card count matches requested stackSize
    const actualCount = parsed.cards.length;
    if (actualCount !== stackSize) {
      console.warn(`[API:generate-trial] Card count mismatch: requested ${stackSize}, got ${actualCount}`);
      
      if (actualCount < stackSize) {
        // If we got fewer cards, throw error
        console.error(`[API:generate-trial] Received ${actualCount} cards but requested ${stackSize}. This should not happen.`);
        throw new Error(`AI generated ${actualCount} cards instead of the requested ${stackSize}. Please try again.`);
      } else {
        // If we got more cards, trim to the exact count
        console.warn(`[API:generate-trial] Received ${actualCount} cards, trimming to ${stackSize}`);
        parsed.cards = parsed.cards.slice(0, stackSize);
      }
    }

    DEBUG_SERVER.timing('Total trial API time', apiStartTime);
    DEBUG_SERVER.api('Trial generation completed', { cardCount: parsed.cards.length });

    return NextResponse.json({ cards: parsed.cards });
  } catch (error: any) {
    DEBUG_SERVER.apiError('Trial generation exception', error);
    DEBUG_SERVER.timing('Total trial API time (failed)', apiStartTime);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cards' },
      { status: 500 }
    );
  }
}
