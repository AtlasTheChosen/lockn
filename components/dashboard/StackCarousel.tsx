'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress-simple';
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react';

interface Stack {
  id: string;
  title: string;
  scenario: string;
  language: string;
  total_cards: number;
  mastered_count: number;
  created_at: string;
  is_completed: boolean;
  last_reviewed?: string;
}

interface StackCarouselProps {
  stacks: Stack[];
}

export default function StackCarousel({ stacks }: StackCarouselProps) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 640px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 3 },
    },
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const getProgress = (stack: Stack) => {
    return Math.round((stack.mastered_count / stack.total_cards) * 100);
  };

  if (stacks.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Continue Learning</h2>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No active stacks</h3>
              <p className="text-slate-400 mb-6">Generate one to start your learning journey!</p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Stack
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Continue Learning</h2>
        {stacks.length > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {stacks.map((stack) => {
            const progress = getProgress(stack);
            return (
              <div
                key={stack.id}
                className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(33.333%-0.667rem)] min-w-0"
              >
                <Card className="bg-slate-800 border-slate-700 hover:border-blue-500/50 transition-all h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {stack.language}
                      </Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        {progress}%
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-lg line-clamp-2">
                      {stack.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-slate-300">
                            {stack.mastered_count}/{stack.total_cards} cards
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        onClick={() => router.push(`/stack/${stack.id}`)}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
