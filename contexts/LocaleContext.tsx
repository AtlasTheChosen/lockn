'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { SUPPORTED_UI_LOCALES, getLocaleDisplayName } from '@/lib/constants';
import arMessages from '@/messages/ar.json';
import daMessages from '@/messages/da.json';
import deMessages from '@/messages/de.json';
import elMessages from '@/messages/el.json';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import fiMessages from '@/messages/fi.json';
import frMessages from '@/messages/fr.json';
import heMessages from '@/messages/he.json';
import hiMessages from '@/messages/hi.json';
import idMessages from '@/messages/id.json';
import itMessages from '@/messages/it.json';
import jaMessages from '@/messages/ja.json';
import koMessages from '@/messages/ko.json';
import nlMessages from '@/messages/nl.json';
import noMessages from '@/messages/no.json';
import plMessages from '@/messages/pl.json';
import ptMessages from '@/messages/pt.json';
import ruMessages from '@/messages/ru.json';
import svMessages from '@/messages/sv.json';
import thMessages from '@/messages/th.json';
import trMessages from '@/messages/tr.json';
import viMessages from '@/messages/vi.json';
import zhMessages from '@/messages/zh.json';

const STORAGE_KEY = 'lockn-ui-locale';

/** Brand name: never translate. LockN persists in all language interfaces. */
export const BRAND_NAME = 'LockN';

export const SUPPORTED_LOCALES = SUPPORTED_UI_LOCALES;
export type LocaleCode = string;

type MessageMap = Record<string, Record<string, string>>;

const MESSAGES_MAP: Partial<Record<string, MessageMap>> = {
  ar: arMessages as MessageMap,
  da: daMessages as MessageMap,
  de: deMessages as MessageMap,
  el: elMessages as MessageMap,
  en: enMessages as MessageMap,
  es: esMessages as MessageMap,
  fi: fiMessages as MessageMap,
  fr: frMessages as MessageMap,
  he: heMessages as MessageMap,
  hi: hiMessages as MessageMap,
  id: idMessages as MessageMap,
  it: itMessages as MessageMap,
  ja: jaMessages as MessageMap,
  ko: koMessages as MessageMap,
  nl: nlMessages as MessageMap,
  no: noMessages as MessageMap,
  pl: plMessages as MessageMap,
  pt: ptMessages as MessageMap,
  ru: ruMessages as MessageMap,
  sv: svMessages as MessageMap,
  th: thMessages as MessageMap,
  tr: trMessages as MessageMap,
  vi: viMessages as MessageMap,
  zh: zhMessages as MessageMap,
};

const EN_MESSAGES = MESSAGES_MAP.en!;

/** Map browser language to supported UI locale (all app learning languages). */
const BROWSER_LOCALE_MAP: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  fr: 'fr',
  'fr-fr': 'fr',
  de: 'de',
  'de-de': 'de',
  it: 'it',
  'it-it': 'it',
  pt: 'pt',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  ja: 'ja',
  'ja-jp': 'ja',
  ko: 'ko',
  'ko-kr': 'ko',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  ar: 'ar',
  'ar-sa': 'ar',
  ru: 'ru',
  'ru-ru': 'ru',
  hi: 'hi',
  'hi-in': 'hi',
  tr: 'tr',
  'tr-tr': 'tr',
  nl: 'nl',
  'nl-nl': 'nl',
  pl: 'pl',
  'pl-pl': 'pl',
  sv: 'sv',
  'sv-se': 'sv',
  no: 'no',
  'nb-no': 'no',
  da: 'da',
  'da-dk': 'da',
  fi: 'fi',
  'fi-fi': 'fi',
  el: 'el',
  'el-gr': 'el',
  he: 'he',
  'he-il': 'he',
  th: 'th',
  'th-th': 'th',
  vi: 'vi',
  'vi-vn': 'vi',
  id: 'id',
  'id-id': 'id',
};

function mapBrowserToLocale(browserLang: string): LocaleCode {
  const normalized = browserLang.split('-').map((s) => s.toLowerCase()).join('-');
  return BROWSER_LOCALE_MAP[normalized] ?? 'en';
}

function getInitialLocaleFromClient(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  return mapBrowserToLocale(navigator.language || 'en');
}

export { getLocaleDisplayName };

type Messages = Record<string, Record<string, string>>;

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  t: (key: string) => string;
  messages: Messages | null;
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useSession();
  const [locale, setLocaleState] = useState<LocaleCode>('en');
  const [ready, setReady] = useState(false);

  const messages = MESSAGES_MAP[locale] ?? EN_MESSAGES;

  // Resolve initial locale: profile > localStorage > navigator > en
  useEffect(() => {
    const fromStorageOrBrowser = getInitialLocaleFromClient();
    setLocaleState(fromStorageOrBrowser);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!profile?.preferred_ui_language) return;
    const preferred = profile.preferred_ui_language.toLowerCase();
    if (SUPPORTED_LOCALES.includes(preferred)) {
      setLocaleState(preferred);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, preferred);
      }
    }
  }, [profile?.preferred_ui_language]);

  const setLocale = useCallback(
    async (next: LocaleCode) => {
      setLocaleState(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      if (user) {
        try {
          await fetch('/api/account/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredUiLanguage: next }),
          });
        } catch (e) {
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.warn('[LocaleContext] Failed to persist preferred_ui_language:', e);
          }
        }
      }
    },
    [user]
  );
  const t = useCallback(
    (key: string): string => {
      const value = getNested(messages as Record<string, unknown>, key);
      if (value != null) return value;
      const fallback = getNested(EN_MESSAGES as Record<string, unknown>, key);
      if (fallback != null) return fallback;
      return key;
    },
    [messages]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t, messages, ready }),
    [locale, setLocale, t, messages, ready]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Default context for SSR/prerender when provider is not yet mounted (e.g. static export). */
const defaultLocaleValue: LocaleContextValue = {
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
  messages: EN_MESSAGES,
  ready: true,
};

export function useLocale() {
  const ctx = useContext(LocaleContext);
  return ctx ?? defaultLocaleValue;
}

export function useTranslation() {
  const { t, locale, setLocale, ready } = useLocale();
  return { t, locale, setLocale, ready };
}
