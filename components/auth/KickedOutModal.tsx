'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LogOut, Smartphone, AlertTriangle } from 'lucide-react';

interface KickedOutModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
}

/**
 * Modal shown when user is logged out because their account was accessed from another device.
 */
export default function KickedOutModal({ isOpen, onAcknowledge }: KickedOutModalProps) {
  if (!isOpen) return null;

  const handleAcknowledge = () => {
    onAcknowledge();
    // Redirect to home/login page
    window.location.href = '/';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md rounded-3xl p-8 text-center"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Icon */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(255, 150, 0, 0.15)' }}
          >
            <div className="relative">
              <Smartphone className="h-10 w-10" style={{ color: 'var(--accent-orange)' }} />
              <div 
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-red)' }}
              >
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-2xl font-display font-bold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Signed Out
          </h2>

          {/* Message */}
          <p 
            className="text-base mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Your account was signed in on another device.
          </p>
          <p 
            className="text-sm mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            For security, only one device can be signed in at a time. Sign in again to continue using FlashDash on this device.
          </p>

          {/* Action Button */}
          <Button
            onClick={handleAcknowledge}
            className="w-full text-white font-bold rounded-2xl py-4 text-base hover:-translate-y-0.5 transition-all active:translate-y-1"
            style={{ 
              backgroundColor: 'var(--accent-green)', 
              boxShadow: '0 4px 0 var(--accent-green-dark)' 
            }}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign In Again
          </Button>

          {/* Help text */}
          <p 
            className="text-xs mt-4"
            style={{ color: 'var(--text-muted)' }}
          >
            If this wasn't you, consider changing your password.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
