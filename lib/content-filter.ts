const INAPPROPRIATE_PATTERNS = [
  /\b(sex|sexual|porn|xxx|nude|naked|horny)\b/i,
  /\b(fuck|shit|damn|hell|bitch|ass|bastard|crap)\b/i,
  /\b(n[i1]gg[ae]r|f[a4]gg[o0]t|ch[i1]nk|sp[i1]c|k[i1]ke|towelhead)\b/i,
  /\b(nazi|hitler|holocaust denial|white power|supremac(y|ist))\b/i,
  /\b(rape|molest|assault|abuse|violence)\b/i,
  /\b(terrorist|terrorism|bomb|weapon|drug deal|illegal)\b/i,
];

const HISTORICAL_CONTEXT_PATTERNS = [
  /\b(historical|history|museum|educational|academic|study|research|documentary)\b/i,
  /\b(world war|civil rights|slavery abolition|discrimination awareness)\b/i,
];

export interface ContentFilterResult {
  isAppropriate: boolean;
  reason?: string;
}

export function checkContentAppropriateness(text: string): ContentFilterResult {
  const lowerText = text.toLowerCase();

  const hasHistoricalContext = HISTORICAL_CONTEXT_PATTERNS.some(pattern =>
    pattern.test(text)
  );

  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(text)) {
      if (hasHistoricalContext) {
        continue;
      }

      return {
        isAppropriate: false,
        reason: 'This content appears to contain inappropriate material. Please ensure your scenario is suitable for language learning and does not include explicit, offensive, or hateful content.'
      };
    }
  }

  return { isAppropriate: true };
}
