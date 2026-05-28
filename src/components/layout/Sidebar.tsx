import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  FolderOpen, 
  Megaphone, 
  CalendarDays,
  LogOut,
  User,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/src/types';

interface SidebarProps {
  user: UserType | null;
  hideBranding?: boolean;
  hideActions?: boolean;
}

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Course Catalog', icon: BookOpen, path: '/catalog' },
  { name: 'Study Hub', icon: BrainCircuit, path: '/study' },
  { name: 'My Progress', icon: TrendingUp, path: '/progress' },
  { name: 'Study Resources', icon: FolderOpen, path: '/resources' },
  { name: 'Bulletin Board', icon: Megaphone, path: '/bulletin' },
  { name: 'School Calendar', icon: CalendarDays, path: '/calendar' },
];

import ThemeToggle from '@/src/components/ThemeToggle';
import NotificationCenter from './NotificationCenter';
import { toast } from 'sonner';
import IEMatrixLogo from '../IEMatrixLogo';

import { auth } from '@/src/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Sidebar({ user, hideBranding = false, hideActions = false }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('ctu_hub_session'); // Clean up old storage if any
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Failed to logout');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen bg-background border-r border-foreground/5 sticky top-0 z-10 transition-colors duration-300">
      {/* Logo Area */}
      {!hideBranding && (
        <div className="p-8 pb-3 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Custom High-fidelity Isometric 3D Branding Logo in Sidebar */}
              <div 
                className="relative shrink-0 cursor-pointer" 
                aria-hidden="true" 
                onClick={() => navigate('/dashboard')}
              >
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                <IEMatrixLogo size={56} className="relative z-10" />
              </div>

              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter frosted-header leading-none select-none relative">
                  IE MATRIX
                  <span className="absolute -right-6 -top-1 px-1 py-0.5 bg-ctu-maroon/10 text-[7px] text-ctu-maroon rounded border border-ctu-maroon/20 font-black">v2.0</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground/40 mt-1.5 flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                  System Secure
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Actions (Theme/Notifs) - Grouped Control Strip */}
      <div className="px-6 flex items-center gap-3 mb-6 mt-2">
        {!hideActions && (
          <div className="flex-1 flex items-center gap-1 p-1 neumorphic-pressed rounded-2xl bg-foreground/[0.03]">
            <NotificationCenter />
            <div className="w-px h-6 bg-foreground/10 mx-1 shrink-0" />
            <ThemeToggle className="neumorphic-raised shrink-0 border-none !shadow-none hover:bg-foreground/[0.05] flex-1 rounded-xl h-11" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-3 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-bold transition-all duration-300 tap-target",
              isActive 
                ? "bg-gradient-to-r from-ctu-maroon to-ctu-gold text-white shadow-lg shadow-ctu-maroon/25 reference-pill-link scale-[1.02]" 
                : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03] rounded-full"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} className={cn(isActive ? "text-white" : "text-foreground/45")} />
                <span className="tracking-wide">{item.name}</span>
                {isActive && (
                  <motion.span 
                    layoutId="sidebarActiveIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" 
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
        
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-bold transition-all duration-300 tap-target",
              isActive 
                ? "bg-ctu-maroon text-white shadow-lg shadow-ctu-maroon/25 reference-pill-link scale-[1.02]" 
                : "text-ctu-maroon/70 hover:text-ctu-maroon hover:bg-ctu-maroon/[0.04] rounded-full"
            )}
          >
            {({ isActive }) => (
              <>
                <ShieldCheck size={19} className={cn(isActive ? "text-white" : "text-ctu-maroon/45")} />
                <span className="tracking-wide">Admin Portal</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* User Info */}
      <div className="p-6 border-t border-foreground/5 space-y-3">
        {!hideActions ? (
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 w-full text-left hover:bg-foreground/[0.03] p-3 rounded-3xl border border-foreground/10 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-full bg-ctu-gold flex items-center justify-center text-navy-deep font-bold text-sm shadow-inner group-hover:scale-110 transition-transform">
              {user ? getInitials(user.fullName) : <User size={19} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user?.fullName || 'Guest'}</p>
              <p className="text-[11px] text-foreground/45 truncate font-bold uppercase tracking-wider leading-none">{user?.idNumber || '00-00000-000'}</p>
            </div>
          </button>
        ) : (
          <div className="p-3 rounded-3xl opacity-0 h-[64px]" /> // Placeholder to keep height consistent
        )}
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 px-6 py-3.5 w-full rounded-full text-xs font-bold uppercase tracking-wider text-red-500 border border-red-500/20 hover:bg-red-500/5 transition-all duration-300"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
