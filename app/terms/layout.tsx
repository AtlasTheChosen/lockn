import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - LockN',
  description: 'LockN Terms of Service. Rules and guidelines for using the LockN language learning service.',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
