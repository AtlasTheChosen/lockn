import { useCallback, useEffect, useState, useRef, useMemo } from 'react';

const LANGUAGE_CODES: Record<string, string[]> = {
  Spanish: ['es-ES', 'es-MX', 'es'],
  French: ['fr-FR', 'fr-CA', 'fr'],
  German: ['de-DE', 'de'],
  Italian: ['it-IT', 'it'],
  Japanese: ['ja-JP', 'ja'],
  Korean: ['ko-KR', 'ko'],
  Mandarin: ['zh-CN', 'zh-TW', 'zh'],
  Portuguese: ['pt-BR', 'pt-PT', 'pt'],
  English: ['en-US', 'en-GB', 'en'],
  Russian: ['ru-RU', 'ru'],
  Arabic: ['ar-SA', 'ar'],
  Hindi: ['hi-IN', 'hi'],
  Dutch: ['nl-NL', 'nl'],
  Polish: ['pl-PL', 'pl'],
  Turkish: ['tr-TR', 'tr'],
  Vietnamese: ['vi-VN', 'vi'],
  Thai: ['th-TH', 'th'],
  Swedish: ['sv-SE', 'sv'],
  Norwegian: ['nb-NO', 'no'],
  Danish: ['da-DK', 'da'],
  Finnish: ['fi-FI', 'fi'],
  Greek: ['el-GR', 'el'],
  Hebrew: ['he-IL', 'he'],
  Indonesian: ['id-ID', 'id'],
  Czech: ['cs-CZ', 'cs'],
  Romanian: ['ro-RO', 'ro'],
  Hungarian: ['hu-HU', 'hu'],
  Ukrainian: ['uk-UA', 'uk'],
};

// Prefer these high-quality voices when available
const PREFERRED_VOICES = [
  'Google', 'Microsoft', 'Natural', 'Neural', 'Premium', 'Enhanced',
  'Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Veena',
];

export type TTSProvider = 'browser' | 'elevenlabs';
export type VoiceGender = 'female' | 'male';

interface UseSpeechOptions {
  provider?: TTSProvider;
  gender?: VoiceGender;
}

// Client-side audio cache - persists across component remounts
// Key: "text-language-gender", Value: Blob URL
const audioCache = new Map<string, string>();

function getCacheKey(text: string, language: string, gender: string): string {
  return `${text.toLowerCase().trim()}-${language}-${gender}`;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const { provider = 'browser', gender = 'female' } = options;
  
  // Use refs to always have access to current values
  const providerRef = useRef<TTSProvider>(provider);
  const genderRef = useRef<VoiceGender>(gender);
  providerRef.current = provider;
  genderRef.current = gender;
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const findBestVoice = useCallback((language: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    const langCodes = LANGUAGE_CODES[language] || [language.toLowerCase()];
    const preferFemale = genderRef.current === 'female';
    
    const matchingVoices = voices.filter(voice => 
      langCodes.some(code => 
        voice.lang.toLowerCase().startsWith(code.toLowerCase())
      )
    );

    if (matchingVoices.length === 0) return null;

    // Try to match gender preference (heuristic based on common voice names)
    const femaleNames = ['female', 'woman', 'samantha', 'karen', 'moira', 'tessa', 'fiona', 'veena', 'sara', 'anna', 'helena', 'maria', 'lucia', 'amelie', 'paulina', 'monica', 'laura', 'yuna', 'mei'];
    const maleNames = ['male', 'man', 'daniel', 'alex', 'tom', 'thomas', 'david', 'jorge', 'juan', 'diego', 'luca', 'markus', 'boris', 'ivan'];
    
    const genderVoices = matchingVoices.filter(voice => {
      const nameLower = voice.name.toLowerCase();
      if (preferFemale) {
        return femaleNames.some(n => nameLower.includes(n)) || !maleNames.some(n => nameLower.includes(n));
      } else {
        return maleNames.some(n => nameLower.includes(n));
      }
    });
    
    const voicesToSearch = genderVoices.length > 0 ? genderVoices : matchingVoices;

    const preferredVoice = voicesToSearch.find(voice =>
      PREFERRED_VOICES.some(pref => 
        voice.name.includes(pref) || voice.voiceURI.includes(pref)
      )
    );

    if (preferredVoice) return preferredVoice;

    const networkVoice = voicesToSearch.find(v => !v.localService);
    if (networkVoice) return networkVoice;

    return voicesToSearch[0] || matchingVoices[0];
  }, [voices]);

  // Browser-based TTS (free)
  const speakWithBrowser = useCallback((text: string, language: string = 'English') => {
    if (!isSupported || typeof window === 'undefined') return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voice = findBestVoice(language);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      const langCodes = LANGUAGE_CODES[language];
      utterance.lang = langCodes?.[0] || 'en-US';
    }

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, findBestVoice]);

  // ElevenLabs TTS (premium) with client-side caching
  const speakWithElevenLabs = useCallback(async (text: string, language: string = 'English') => {
    const currentGender = genderRef.current;
    const cacheKey = getCacheKey(text, language, currentGender);
    
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Check client-side cache first (instant playback)
      if (audioCache.has(cacheKey)) {
        console.log(`[TTS Client Cache] HIT: "${text.substring(0, 20)}..."`);
        const cachedUrl = audioCache.get(cacheKey)!;
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);

        await audio.play();
        return;
      }

      // Not in client cache, fetch from server (may hit server cache)
      setIsLoading(true);
      console.log(`[TTS Client Cache] MISS: "${text.substring(0, 20)}..." - fetching`);

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, voiceGender: currentGender }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Store in client cache (don't revoke URL so it can be reused)
      audioCache.set(cacheKey, audioUrl);
      console.log(`[TTS Client Cache] STORED: "${text.substring(0, 20)}..." (${audioCache.size} items cached)`);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);

      await audio.play();
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback to browser TTS
      speakWithBrowser(text, language);
    } finally {
      setIsLoading(false);
    }
  }, [speakWithBrowser]);

  // Main speak function - uses provider setting (reads from ref for latest value)
  const speak = useCallback((text: string, language: string = 'English') => {
    const currentProvider = providerRef.current;
    
    if (currentProvider === 'elevenlabs') {
      speakWithElevenLabs(text, language);
    } else {
      speakWithBrowser(text, language);
    }
  }, [speakWithElevenLabs, speakWithBrowser]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { 
    speak, 
    speakWithBrowser,
    speakWithElevenLabs,
    stop, 
    isSupported, 
    isSpeaking, 
    isLoading,
    voices 
  };
}
