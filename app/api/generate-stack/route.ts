import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { FREE_TIER_LIMITS } from '@/lib/constants';

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
  const openai = getOpenAI();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario, targetLanguage, nativeLanguage = 'English', stackSize = 15, difficulty = 'B1', conversationalMode = false } = await request.json();

    if (!scenario || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'AI generation is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.is_banned) {
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

    if (!profile.is_premium && profile.daily_generations_count >= FREE_TIER_LIMITS.DAILY_GENERATIONS) {
      return NextResponse.json(
        { error: 'Daily generation limit reached. Upgrade to Premium for unlimited generations.' },
        { status: 429 }
      );
    }

    const { data: incompleteStacks } = await supabase
      .from('card_stacks')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_completed', false);

    if (
      !profile.is_premium &&
      incompleteStacks &&
      incompleteStacks.length >= FREE_TIER_LIMITS.MAX_INCOMPLETE_STACKS
    ) {
      return NextResponse.json(
        { error: 'Maximum incomplete stacks reached. Complete or delete existing stacks, or upgrade to Premium.' },
        { status: 429 }
      );
    }

    const difficultyGuide = getDifficultyInstructions(difficulty);

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

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "target_phrase": "phrase in ${targetLanguage} at ${difficulty} level",
      "native_translation": "translation in ${nativeLanguage}",
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

    const { data: stack, error: stackError } = await supabase
      .from('card_stacks')
      .insert({
        user_id: user.id,
        title: scenario,
        target_language: targetLanguage,
        native_language: nativeLanguage,
        card_count: parsed.cards.length,
        conversational_mode: conversationalMode,
        cefr_level: difficulty,
      })
      .select()
      .single();

    if (stackError || !stack) {
      throw new Error('Failed to create stack');
    }

    const flashcards = parsed.cards.map((card: any, index: number) => ({
      stack_id: stack.id,
      user_id: user.id,
      card_order: index,
      target_phrase: card.target_phrase,
      native_translation: card.native_translation,
      example_sentence: card.example_sentence,
      tone_advice: card.tone_advice,
    }));

    const { error: cardsError } = await supabase.from('flashcards').insert(flashcards);

    if (cardsError) {
      await supabase.from('card_stacks').delete().eq('id', stack.id);
      throw new Error('Failed to create flashcards');
    }

    await supabase.from('generation_logs').insert({
      user_id: user.id,
      scenario,
      target_language: targetLanguage,
    });

    await supabase
      .from('user_profiles')
      .update({
        daily_generations_count: profile.daily_generations_count + 1,
      })
      .eq('id', user.id);

    return NextResponse.json({ stackId: stack.id, stack, cards: parsed.cards });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate stack' },
      { status: 500 }
    );
  }
}
