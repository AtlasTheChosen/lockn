import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userAnswer, correctAnswer, targetLanguage, nativeTranslation } = await request.json();

    if (!userAnswer || !correctAnswer || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = `You are a language learning assistant grading a student's translation answer.

The student was asked to translate "${nativeTranslation}" into ${targetLanguage}.

Correct answer: "${correctAnswer}"
Student's answer: "${userAnswer}"

Grade this answer with the following criteria:
- PASS if the meaning is correct, even with minor spelling mistakes or small grammatical errors
- PASS if they used a valid alternative phrasing that conveys the same meaning
- FAIL only if the meaning is wrong or significantly different

Respond in this exact JSON format:
{
  "passed": true or false,
  "correction": "only include if there are spelling/grammar issues to fix, otherwise null",
  "feedback": "brief encouraging feedback about their answer (1-2 sentences max)"
}

Be lenient and encouraging. Language learning is about communication, not perfection.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    return NextResponse.json({
      passed: result.passed ?? false,
      correction: result.correction || null,
      feedback: result.feedback || 'Keep practicing!',
    });
  } catch (error: any) {
    console.error('Grade answer error:', error);
    return NextResponse.json(
      { error: 'Failed to grade answer', details: error.message },
      { status: 500 }
    );
  }
}




