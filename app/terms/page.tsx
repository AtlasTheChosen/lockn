'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleContext';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('footer.backToHome')}
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('footer.termsTitle')}
          </h1>
          <p className="text-sm sm:text-base mt-2" style={{ color: 'var(--text-secondary)' }}>
            Last updated: 2026. By using LockN, you agree to these terms.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>
                Acceptance of terms
              </CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                By accessing or using LockN, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>
                Use of the service
              </CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                You agree to use LockN only for lawful purposes and in accordance with these terms. You may not misuse the service, attempt to gain unauthorized access, or use it in any way that could harm the service or other users.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>
                Account responsibility
              </CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                You are responsible for maintaining the confidentiality of your account and for all activity that occurs under your account. You must notify us immediately of any unauthorized use.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                For questions about these terms, contact us at support@lockn.app.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
