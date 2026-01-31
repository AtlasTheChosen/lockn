'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleContext';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('footer.backToHome')}
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('footer.privacyTitle')}
          </h1>
          <p className="text-sm sm:text-base mt-2" style={{ color: 'var(--text-secondary)' }}>
            Last updated: 2026. This policy describes how LockN collects, uses, and protects your information.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>Information we collect</CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                We collect information you provide when you create an account (email, display name), when you use the service (learning preferences, progress data), and technical information such as device type and IP address for security and analytics.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>How we use your information</CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                We use your information to provide and improve the LockN service, personalize your experience, process payments, send important account or product updates, and to comply with legal obligations.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>Data retention</CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">
                We retain your account and learning data for as long as your account is active. You may request deletion of your data by contacting us or through your account settings.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>Contact</CardTitle>
            </CardHeader>
            <CardContent style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm sm:text-base">For privacy-related questions or requests, contact us at support@lockn.app.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
