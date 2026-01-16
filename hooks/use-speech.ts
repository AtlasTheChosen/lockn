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
  onAudioHash?: (hash: string, text: string) => void; // Callback when audio hash is received
}

// Client-side audio cache - persists across component remounts
// Key: "text-language-gender", Value: Blob URL
const audioCache = new Map<string, string>();

function getCacheKey(text: string, language: string, gender: string): string {
  return `${text.toLowerCase().trim()}-${language}-${gender}`;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const { provider = 'browser', gender = 'female', onAudioHash } = options;
  
  // Use refs to always have access to current values
  const providerRef = useRef<TTSProvider>(provider);
  const genderRef = useRef<VoiceGender>(gender);
  const onAudioHashRef = useRef(onAudioHash);
  providerRef.current = provider;
  genderRef.current = gender;
  onAudioHashRef.current = onAudioHash;
  
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

  // OpenAI TTS with multi-tier caching:
  // 1. Card audio_url (permanent, stored in DB) - FREE
  // 2. Client-side memory cache (session-based) - FREE
  // 3. Supabase Storage (server-side persistent) - FREE
  // 4. Generate new with OpenAI TTS (low cost) - only if all caches miss
  const speakWithOpenAI = useCallback(async (
    text: string, 
    language: string = 'English',
    options?: { cardId?: string; audioUrl?: string }
  ) => {
    const currentGender = genderRef.current;
    const cacheKey = getCacheKey(text, language, currentGender);
    
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // TIER 1: Check if card already has cached audio URL (FREE - no API call)
      if (options?.audioUrl) {
        console.log(`[TTS] TIER 1 HIT (Card DB): "${text.substring(0, 20)}..."`);
        const audio = new Audio(options.audioUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          setIsSpeaking(false);
          // If card URL fails, fall through to other tiers
          console.warn('[TTS] Card audio URL failed, trying other tiers');
        };

        try {
          await audio.play();
          return;
        } catch (e) {
          console.warn('[TTS] Card audio playback failed:', e);
          // Continue to other tiers
        }
      }

      // TIER 2: Check client-side memory cache (FREE - instant playback)
      if (audioCache.has(cacheKey)) {
        console.log(`[TTS] TIER 2 HIT (Memory): "${text.substring(0, 20)}..."`);
        const cachedUrl = audioCache.get(cacheKey)!;
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);

        await audio.play();
        return;
      }

      // TIER 3 & 4: Server will check Supabase Storage, then OpenAI
      setIsLoading(true);
      console.log(`[TTS] MISS all client tiers: "${text.substring(0, 20)}..." - calling server`);

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          language, 
          voiceGender: currentGender,
          cardId: options?.cardId, // Pass cardId so server can update the card's audio_url
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      // Check if server returned a permanent URL (stored in Supabase)
      const serverAudioUrl = response.headers.get('X-Audio-Url');
      
      // Extract audio hash for tracking usage across users
      const audioHash = response.headers.get('X-Audio-Hash');
      if (audioHash && onAudioHashRef.current) {
        onAudioHashRef.current(audioHash, text);
      }
      
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      
      // Store in client memory cache
      audioCache.set(cacheKey, blobUrl);
      console.log(`[TTS] STORED in memory: "${text.substring(0, 20)}..." (${audioCache.size} items)`);
      
      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);

      await audio.play();
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      // Fallback to browser TTS
      speakWithBrowser(text, language);
    } finally {
      setIsLoading(false);
    }
  }, [speakWithBrowser]);

  // Main speak function - uses provider setting (reads from ref for latest value)
  // Pass cardId and audioUrl for efficient caching
  const speak = useCallback((
    text: string, 
    language: string = 'English',
    options?: { cardId?: string; audioUrl?: string }
  ) => {
    const currentProvider = providerRef.current;
    
    if (currentProvider === 'elevenlabs') {
      speakWithOpenAI(text, language, options);
    } else {
      speakWithBrowser(text, language);
    }
  }, [speakWithOpenAI, speakWithBrowser]);

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
    speakWithOpenAI,
    stop, 
    isSupported, 
    isSpeaking, 
    isLoading,
    voices 
  };
}
