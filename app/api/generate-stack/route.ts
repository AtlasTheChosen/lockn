import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS, NON_LATIN_LANGUAGES, LANGUAGE_SCRIPTS, ROMANIZATION_NAMES } from '@/lib/constants';

const VALID_STACK_SIZES = {
  FREE: [5],
  PREMIUM: [10, 25, 50],
};
import { DEBUG_SERVER } from '@/lib/debug';
import { checkContentAppropriateness } from '@/lib/content-filter';

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

function getDifficultyInstructions(level: string): string {
  const instructions: Record<string, string> = {
    A1: `A1 (Beginner) Level - STRICT REQUIREMENTS:
GRAMMAR: Only simple present ("I am", "you are") and basic past tense ("I was", "I went")
VOCABULARY: Maximum 500 most common words. NO abstract concepts. Concrete, everyday items only.
SENTENCE LENGTH: 3-5 words maximum per phrase
FORBIDDEN: Idioms, slang, compound sentences, subordinate clauses, conditional forms, subjunctive
REQUIRED: Direct, literal, single-action phrases
Examples: "Hello", "Thank you", "I want water", "Where is bathroom?", "How much?"
TONE: Simple, direct, polite basics only`,

    A2: `A2 (Elementary) Level - STRICT REQUIREMENTS:
GRAMMAR: Present, past, simple future only. Basic connectors (and, but, because). No perfect tenses.
VOCABULARY: Common 1000-1500 words. Simple everyday topics. No specialized or abstract vocabulary.
SENTENCE LENGTH: 5-8 words maximum
FORBIDDEN: Complex idioms, cultural references, passive voice, advanced conditionals
ALLOWED: Basic polite phrases, simple descriptions, common expressions
Examples: "Can I have the menu?", "I would like coffee please", "What time does it close?"
TONE: Polite, simple, everyday conversation`,

    B1: `B1 (Intermediate) Level - STRICT REQUIREMENTS:
GRAMMAR: Present perfect, past continuous, simple conditionals. Compound sentences with clear connectors.
VOCABULARY: 2000-2500 words. Handle familiar topics. Some workplace/academic vocabulary.
SENTENCE LENGTH: 8-12 words average
FORBIDDEN: Advanced idioms, subtle cultural references, complex passive constructions
ALLOWED: Common idioms, everyday slang, straightforward explanations
Examples: "I've been thinking about it", "Would you mind if I asked?", "It depends on the situation"
TONE: Natural conversation, clear explanations, everyday social interaction`,

    B2: `B2 (Upper Intermediate) Level - STRICT REQUIREMENTS:
GRAMMAR: All tenses including past perfect, conditionals, complex clauses. Sophisticated connectors.
VOCABULARY: 3000-4000 words. Abstract concepts, nuanced meanings, contextual vocabulary.
SENTENCE LENGTH: 10-15 words, complex structures
REQUIRED: Contextual idioms, contemporary slang, implied meanings, register awareness
ALLOWED: Indirect communication, subtlety, cultural references
Examples: "That being said, I'm inclined to believe...", "Not to mention the fact that...", "To be perfectly honest..."
TONE: Nuanced, sophisticated, context-appropriate`,

    C1: `C1 (Advanced) Level - STRICT REQUIREMENTS:
GRAMMAR: Full mastery of all grammatical structures. Native-like precision with subtle distinctions.
VOCABULARY: 5000+ words. Technical, specialized, abstract. Rich idiomatic expressions.
SENTENCE LENGTH: Variable, natural flow with complex embedding
REQUIRED: Cultural references, figurative language, subtle implications, native speaker patterns
ALLOWED: Complex idioms, wordplay, sophisticated humor, register shifts
Examples: "Come to think of it...", "That's beside the point", "I'm on the fence about this one"
TONE: Natural native fluency, cultural awareness, sophisticated expression`,

    C2: `C2 (Proficient) Level - STRICT REQUIREMENTS:
GRAMMAR: Native-like mastery. Precise, subtle, creative use of all structures.
VOCABULARY: 8000+ words. Literary expressions, proverbs, sophisticated wordplay, cultural depth.
SENTENCE LENGTH: Natural variation, rhetorical sophistication
REQUIRED: Advanced idioms, literary allusions, subtle humor, complete register mastery
ALLOWED: Creative language use, figurative expressions, complex cultural references
Examples: "That ship has sailed", "Reading between the lines", "The elephant in the room", "Time flies when you're having fun"
TONE: Native speaker precision, literary quality, complete cultural fluency`
  };

  return instructions[level] || instructions.B1;
}

export async function POST(request: Request) {
  const apiStartTime = Date.now();
  DEBUG_SERVER.api('=== Generate Stack API: Request received ===');
  
  const openai = getOpenAI();
  if (!openai) {
    DEBUG_SERVER.apiError('OpenAI not configured');
  } else {
    DEBUG_SERVER.api('OpenAI client initialized');
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario, targetLanguage, nativeLanguage = 'English', stackSize = 15, difficulty = 'B1', conversationalMode = false, excludePhrases = [], scriptPreference } = await request.json();
    
    // Validate excludePhrases is an array
    const phrasesToExclude = Array.isArray(excludePhrases) ? excludePhrases : [];
    DEBUG_SERVER.api('Exclude phrases count', { count: phrasesToExclude.length });
    
    // Check if target language needs romanization
    const needsRomanization = NON_LATIN_LANGUAGES.includes(targetLanguage);
    const romanizationName = ROMANIZATION_NAMES[targetLanguage] || 'romanization';
    DEBUG_SERVER.api('Language settings', { targetLanguage, needsRomanization, scriptPreference });

    if (!scenario || !targetLanguage) {
      DEBUG_SERVER.apiError('Missing required fields', null, { scenario: !!scenario, targetLanguage: !!targetLanguage });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      return NextResponse.json(
        { error: 'AI generation is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    DEBUG_SERVER.api('Fetching user profile');
    const profileStartTime = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    DEBUG_SERVER.timing('Profile fetch', profileStartTime);

    if (profileError) {
      DEBUG_SERVER.apiError('Profile fetch error', profileError);
    }

    if (!profile) {
      DEBUG_SERVER.apiError('Profile not found', null, { userId: user.id });
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    DEBUG_SERVER.api('Profile found', {
      isPremium: profile.is_premium,
      isBanned: profile.is_banned,
      dailyGenerations: profile.daily_generations_count,
    });

    if (profile.is_banned) {
      DEBUG_SERVER.apiError('Account suspended', null, { userId: user.id });
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    const now = new Date();
    const resetTime = new Date(profile.daily_generations_reset_at);

    if (now > resetTime) {
      await supabase
        .from('user_profiles')
        .update({
          daily_generations_count: 0,
          daily_generations_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', user.id);

      profile.daily_generations_count = 0;
    }

    // Validate stack size based on tier
    const validSizes = profile.is_premium ? VALID_STACK_SIZES.PREMIUM : VALID_STACK_SIZES.FREE;
    if (!validSizes.includes(stackSize)) {
      DEBUG_SERVER.apiError('Invalid stack size for tier', null, {
        stackSize,
        isPremium: profile.is_premium,
        validSizes,
      });
      return NextResponse.json(
        { error: `Free users can only create 5-card stacks. Upgrade to Premium for 10, 25, or 50 card stacks.` },
        { status: 403 }
      );
    }

    if (!profile.is_premium && profile.daily_generations_count >= FREE_TIER_LIMITS.DAILY_GENERATIONS) {
      DEBUG_SERVER.apiError('Daily generation limit reached', null, {
        count: profile.daily_generations_count,
        limit: FREE_TIER_LIMITS.DAILY_GENERATIONS,
      });
      return NextResponse.json(
        { error: 'Daily generation limit reached. Upgrade to Premium for unlimited generations.' },
        { status: 429 }
      );
    }

    DEBUG_SERVER.api('Checking stacks');
    const stacksStartTime = Date.now();
    
    // For free users: check total stacks (not just incomplete)
    // For premium users: check incomplete stacks (backward compatibility)
    let userStacks;
    let stacksError;
    
    if (profile.is_premium) {
      // Premium: check incomplete stacks only
      const result = await supabase
        .from('card_stacks')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', false);
      userStacks = result.data;
      stacksError = result.error;
    } else {
      // Free: check total stacks
      const result = await supabase
        .from('card_stacks')
        .select('id')
        .eq('user_id', user.id);
      userStacks = result.data;
      stacksError = result.error;
    }
    
    DEBUG_SERVER.timing('Stacks check', stacksStartTime);

    if (stacksError) {
      DEBUG_SERVER.apiError('Stacks check error', stacksError);
    }

    DEBUG_SERVER.api('User stacks count', { count: userStacks?.length || 0, isPremium: profile.is_premium });

    // Free tier: check total stacks limit (hard cap of 3)
    if (!profile.is_premium && userStacks && userStacks.length >= FREE_TIER_LIMITS.MAX_TOTAL_STACKS) {
      DEBUG_SERVER.apiError('Max total stacks reached', null, {
        count: userStacks.length,
        limit: FREE_TIER_LIMITS.MAX_TOTAL_STACKS,
      });
      return NextResponse.json(
        { error: `Maximum ${FREE_TIER_LIMITS.MAX_TOTAL_STACKS} stacks reached. Delete a stack to create a new one, or upgrade to Premium for unlimited stacks.` },
        { status: 429 }
      );
    }

    // Premium tier: check daily stack creation limit (5 per day)
    if (profile.is_premium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString();

      const { data: todayStacks, error: todayStacksError } = await supabase
        .from('card_stacks')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO)
        .lt('created_at', tomorrowISO);

      if (todayStacksError) {
        DEBUG_SERVER.apiError('Today stacks check error', todayStacksError);
      }

      const todayStacksCount = todayStacks?.length || 0;
      DEBUG_SERVER.api('Today stacks count for premium user', { count: todayStacksCount, limit: PREMIUM_TIER_LIMITS.MAX_DAILY_STACKS });

      if (todayStacksCount >= PREMIUM_TIER_LIMITS.MAX_DAILY_STACKS) {
        DEBUG_SERVER.apiError('Max daily stacks reached (premium)', null, {
          count: todayStacksCount,
          limit: PREMIUM_TIER_LIMITS.MAX_DAILY_STACKS,
        });
        return NextResponse.json(
          { error: `You've created ${PREMIUM_TIER_LIMITS.MAX_DAILY_STACKS} stacks today. Delete a stack to create more, or wait until tomorrow.` },
          { status: 429 }
        );
      }
    }

    const difficultyGuide = getDifficultyInstructions(difficulty);
    
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
    
    // Build exclusion instruction if there are phrases to exclude
    const exclusionInstruction = phrasesToExclude.length > 0
      ? `

🚫 CRITICAL DUPLICATE AVOIDANCE REQUIREMENT (MANDATORY):
You MUST NOT generate any phrases that are duplicates or similar to the existing cards listed below.

WHAT COUNTS AS A DUPLICATE (ALL FORBIDDEN):
- Exact same phrase
- Same phrase with minor word changes (e.g., "I want coffee" → "I'd like coffee")
- Same meaning expressed differently (e.g., "How much?" → "What's the price?")
- Same grammatical pattern with different nouns (e.g., "I want water" → "I want juice")
- Phrases that teach the same vocabulary or concept

EXISTING ${phrasesToExclude.length} PHRASES TO AVOID:
${phrasesToExclude.map((p: string) => `- "${p}"`).join('\n')}

REQUIRED: Generate ${stackSize} COMPLETELY NEW phrases that:
- Cover DIFFERENT aspects/moments of the scenario
- Use DIFFERENT vocabulary words
- Teach DIFFERENT grammatical structures
- Are NOT paraphrases of any existing cards above

If you cannot generate ${stackSize} unique phrases without duplicating, generate fewer cards rather than duplicating.`
      : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${CONTENT_FILTER_PROMPT}

Generate exactly ${stackSize} flashcards for a language learning scenario. Each card should be part of a chronological story/conversation that directly relates to the specific scenario provided.

🚨 ABSOLUTE CRITICAL REQUIREMENT - CEFR ${difficulty} Level Strictness:
${difficultyGuide}

⚠️ ZERO TOLERANCE POLICY:
- DO NOT use vocabulary above the ${difficulty} level word count limits
- DO NOT use grammar structures not explicitly allowed for ${difficulty}
- DO NOT exceed the sentence length limits for ${difficulty}
- DO NOT include forbidden elements (idioms for A1/A2, complex structures for beginners)
- Every single phrase MUST be verifiable as ${difficulty}-appropriate

If you generate phrases that are too advanced or too simple for ${difficulty}, the cards will be rejected.

SCENARIO REQUIREMENT:
Generate a chronological narrative stack for '${scenario}'. Use ONLY vocabulary, idioms, slang, and contexts from this specific scenario AT THE ${difficulty} LEVEL. Every phrase must be directly applicable to this exact scenario.
${scriptInstruction}
${exclusionInstruction}

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "target_phrase": "phrase in ${targetLanguage} at ${difficulty} level",
      "native_translation": "translation in ${nativeLanguage}",${needsRomanization ? `
      "romanization": "phonetic pronunciation in Latin letters (${romanizationName})",
      "character_breakdown": [{"character": "X", "romanization": "x"}, ...],` : ''}
      "example_sentence": "when/how to use this phrase in the scenario (${difficulty} appropriate)",
      "tone_advice": "tone description (e.g., 'Casual', 'Playful', 'Formal', 'Sarcastic Gen-Z')"
    }
  ]
}

Verify each phrase meets STRICT ${difficulty} requirements before including it.`,
        },
        {
          role: 'user',
          content: `Generate ${stackSize} flashcards for: "${scenario}" in ${targetLanguage} at CEFR ${difficulty} level.

VERIFICATION CHECKLIST for ${difficulty}:
- ✓ Vocabulary within ${difficulty} word count limits
- ✓ Grammar structures allowed for ${difficulty} only
- ✓ Sentence length matches ${difficulty} requirements
- ✓ Tone and complexity appropriate for ${difficulty}
- ✓ All phrases directly useful for the scenario
- ✓ Natural progression through the scenario
${phrasesToExclude.length > 0 ? `
⚠️ DUPLICATE CHECK (CRITICAL - verify EACH card):
- ✓ NONE of the ${phrasesToExclude.length} existing phrases are repeated
- ✓ No paraphrases or synonymous expressions of existing cards
- ✓ No same-pattern variations (e.g., swapping one noun for another)
- ✓ Each card teaches something NEW not covered in existing cards
Before outputting, verify EACH generated phrase is distinct from ALL ${phrasesToExclude.length} existing phrases.` : ''}

Generate ONLY ${difficulty}-level phrases. If in doubt, err on the side of simplicity for this level.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from markdown code blocks or other formatting
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', parseError);
          console.error('Content received:', content.substring(0, 500));
          throw new Error(`Failed to parse AI response. Content preview: ${content.substring(0, 200)}`);
        }
      } else {
        console.error('No JSON found in response. Content:', content.substring(0, 500));
        throw new Error(`Failed to parse AI response. No valid JSON found. Content preview: ${content.substring(0, 200)}`);
      }
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      console.error('Invalid response format. Parsed:', parsed);
      throw new Error(`Invalid response format. Expected cards array, got: ${JSON.stringify(parsed).substring(0, 200)}`);
    }

    DEBUG_SERVER.api('Creating stack in database');
    console.log('[API:generate-stack] 📦 Creating stack for user:', user.id);
    const stackStartTime = Date.now();
    
    // Capitalize the first letter of each word in the title
    const capitalizedTitle = scenario
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const { data: stack, error: stackError } = await supabase
      .from('card_stacks')
      .insert({
        user_id: user.id,
        title: capitalizedTitle,
        target_language: targetLanguage,
        native_language: nativeLanguage,
        card_count: parsed.cards.length,
        conversational_mode: conversationalMode,
        cefr_level: difficulty,
        script_preference: scriptPreference || null,
      })
      .select()
      .single();
    DEBUG_SERVER.timing('Stack creation', stackStartTime);

    console.log('[API:generate-stack] Stack insert result:', { 
      success: !!stack, 
      stackId: stack?.id,
      error: stackError?.message,
      errorCode: stackError?.code
    });

    if (stackError) {
      DEBUG_SERVER.apiError('Stack creation failed', stackError);
    }

    if (stackError || !stack) {
      DEBUG_SERVER.apiError('Failed to create stack', stackError);
      throw new Error('Failed to create stack: ' + (stackError?.message || 'Unknown error'));
    }

    DEBUG_SERVER.api('Stack created', { stackId: stack.id, cardCount: parsed.cards.length });

    DEBUG_SERVER.api('Creating flashcards');
    console.log('[API:generate-stack] 🃏 Creating', parsed.cards.length, 'flashcards for stack:', stack.id);
    const cardsStartTime = Date.now();
    const flashcards = parsed.cards.map((card: any, index: number) => ({
      stack_id: stack.id,
      user_id: user.id,
      card_order: index,
      target_phrase: card.target_phrase,
      native_translation: card.native_translation,
      example_sentence: card.example_sentence,
      tone_advice: card.tone_advice,
      romanization: card.romanization || null, // Include romanization for non-Latin languages
      character_breakdown: card.character_breakdown || null, // Character-by-character pronunciation
    }));

    console.log('[API:generate-stack] Flashcards to insert:', flashcards.length);
    const { data: insertedCards, error: cardsError } = await supabase.from('flashcards').insert(flashcards).select();
    DEBUG_SERVER.timing('Flashcards creation', cardsStartTime);

    console.log('[API:generate-stack] Flashcards insert result:', {
      success: !cardsError,
      insertedCount: insertedCards?.length,
      error: cardsError?.message,
      errorCode: cardsError?.code
    });

    if (cardsError) {
      DEBUG_SERVER.apiError('Flashcards creation failed', cardsError, { stackId: stack.id });
      console.error('[API:generate-stack] ❌ Flashcards insert failed:', cardsError);
      await supabase.from('card_stacks').delete().eq('id', stack.id);
      DEBUG_SERVER.api('Stack deleted due to flashcards error');
      throw new Error('Failed to create flashcards: ' + cardsError.message);
    }

    console.log('[API:generate-stack] ✅ Flashcards created successfully:', insertedCards?.length);
    DEBUG_SERVER.api('Flashcards created successfully', { count: flashcards.length });

    // Trigger background pre-caching for audio and grammar breakdowns
    // This runs async and doesn't block the response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    fetch(`${baseUrl}/api/precache-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stackId: stack.id,
        targetLanguage,
        nativeLanguage,
      }),
    }).catch(err => {
      console.warn('[API:generate-stack] Pre-caching trigger failed (non-critical):', err.message);
    });
    console.log('[API:generate-stack] 🔄 Triggered background pre-caching for stack:', stack.id);

    DEBUG_SERVER.api('Updating generation logs and profile');
    const { error: logError } = await supabase.from('generation_logs').insert({
      user_id: user.id,
      scenario,
      target_language: targetLanguage,
    });
    if (logError) {
      DEBUG_SERVER.apiError('Generation log insert failed (non-critical)', logError);
    }

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({
        daily_generations_count: profile.daily_generations_count + 1,
      })
      .eq('id', user.id);
    if (profileUpdateError) {
      DEBUG_SERVER.apiError('Profile update failed (non-critical)', profileUpdateError);
    }

    DEBUG_SERVER.timing('Total API request time', apiStartTime);
    DEBUG_SERVER.api('Generation completed successfully', {
      stackId: stack.id,
      cardCount: parsed.cards.length,
    });

    return NextResponse.json({ stackId: stack.id, stack, cards: parsed.cards });
  } catch (error: any) {
    DEBUG_SERVER.apiError('Generation exception', error);
    DEBUG_SERVER.timing('Total API request time (failed)', apiStartTime);
    return NextResponse.json(
      { error: error.message || 'Failed to generate stack' },
      { status: 500 }
    );
  }
}
