export interface SRSResult {
  mastery_level: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: Date;
}

export function calculateNextReview(
  currentMasteryLevel: number,
  currentEaseFactor: number,
  currentIntervalDays: number,
  quality: number
): SRSResult {
  let masteryLevel = currentMasteryLevel;
  let easeFactor = currentEaseFactor;
  let intervalDays = currentIntervalDays;

  if (quality >= 3) {
    if (masteryLevel === 0) {
      intervalDays = 1;
      masteryLevel = 1;
    } else if (masteryLevel === 1) {
      intervalDays = 6;
      masteryLevel = 2;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
      masteryLevel = Math.min(5, masteryLevel + 1);
    }

    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  } else {
    masteryLevel = Math.max(0, masteryLevel - 1);
    intervalDays = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    mastery_level: masteryLevel,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    next_review_date: nextReviewDate,
  };
}

export function getQualityFromGrade(
  isCorrect: boolean,
  isSoftPass: boolean
): number {
  if (isCorrect) return 5;
  if (isSoftPass) return 4;
  return 2;
}
