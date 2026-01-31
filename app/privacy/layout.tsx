import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - LockN',
  description: 'LockN Privacy Policy. How we collect, use, and protect your information.',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
