import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import NotificationCenter from './NotificationCenter';
import IEMatrixLogo from '../IEMatrixLogo';

interface MobileHeaderProps {
  hideBranding?: boolean;
  hideActions?: boolean;
}

export default function MobileHeader({ hideBranding = false, hideActions = false }: MobileHeaderProps) {
  const navigate = useNavigate();

  if (hideBranding && hideActions) return null;

  return (
    <div className="md:hidden flex items-center justify-between mb-4 px-2">
      {!hideBranding && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 py-2 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          {/* Authentic Logo Implementation for Mobile */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <IEMatrixLogo size={52} className="relative z-10" />
          </div>

          <span className="text-2xl min-[380px]:text-3xl min-[420px]:text-4xl font-black tracking-tighter frosted-header uppercase leading-none mt-1">
            IE MATRIX
          </span>
        </motion.div>
      )}

      {!hideActions && (
        <div className="flex items-center gap-4 ml-auto">
          <NotificationCenter />

          {/* Theme Toggle Shortcut */}
          <ThemeToggle className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all border-4 border-background p-0" />
        </div>
      )}
    </div>
  );
}
