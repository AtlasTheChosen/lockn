'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/LocaleContext';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t py-4 px-4 sm:px-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link
            href="/"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('footer.home')}
          </Link>
          <span style={{ color: 'var(--text-muted)' }} aria-hidden>|</span>
          <Link
            href="/privacy"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('footer.privacy')}
          </Link>
          <span style={{ color: 'var(--text-muted)' }} aria-hidden>|</span>
          <Link
            href="/terms"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('footer.terms')}
          </Link>
          <span style={{ color: 'var(--text-muted)' }} aria-hidden>|</span>
          <Link
            href="/help"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('footer.help')}
          </Link>
        </nav>
        <p
          className="text-center sm:text-right shrink-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          © LockN {year}
        </p>
      </div>
    </footer>
  );
}
