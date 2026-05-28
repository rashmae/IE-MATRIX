import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Pin, 
  Calendar, 
  Clock,
  ChevronRight,
  Filter,
  X,
  Sparkles,
  Users,
  Bell,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Sidebar from '@/src/components/layout/Sidebar';
import BottomNav from '@/src/components/layout/BottomNav';
import { User, Announcement, AnnouncementCategory } from '@/src/types/index';
import { ANNOUNCEMENTS } from '@/src/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function Bulletin() {
  const { profile, loading: authLoading } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'All'>('All');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate('/login');
    }

    if (profile) {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
        } else {
          setAnnouncements(ANNOUNCEMENTS);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching announcements:", error);
        setAnnouncements(ANNOUNCEMENTS);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [profile, authLoading, navigate]);

  const filteredAnnouncements = announcements.filter(a => 
    selectedCategory === 'All' || a.category === selectedCategory
  ).sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  // High-fidelity Category styling profiles matching the reference page design
  const categoryMeta: Record<AnnouncementCategory, {
    label: string, 
    color: string, 
    textColor: string, 
    borderColor: string, 
    gradient: string,
    icon: React.ReactNode
  }> = {
    academic: { 
      label: 'Academics', 
      color: 'bg-ctu-maroon/[0.08] text-ctu-maroon border-ctu-maroon/20', 
      textColor: 'text-ctu-maroon',
      borderColor: 'border-ctu-maroon/20',
      gradient: 'from-ctu-maroon/[0.04] to-transparent',
      icon: <CheckCircle2 size={13} className="text-ctu-maroon" /> 
    },
    event: { 
      label: 'Campus Event', 
      color: 'bg-ctu-gold/[0.1] text-[#a17505] border-ctu-gold/20', 
      textColor: 'text-ctu-gold',
      borderColor: 'border-ctu-gold/20',
      gradient: 'from-ctu-gold/[0.04] to-transparent',
      icon: <Sparkles size={13} className="text-ctu-gold" /> 
    },
    holiday: { 
      label: 'Holiday Break', 
      color: 'bg-emerald-500/[0.08] text-emerald-600 border-emerald-500/20', 
      textColor: 'text-emerald-500',
      borderColor: 'border-emerald-500/20',
      gradient: 'from-emerald-500/[0.03] to-transparent',
      icon: <Clock size={13} className="text-emerald-500" /> 
    },
    reminder: { 
      label: 'Vitals & Reminders', 
      color: 'bg-blue-500/[0.08] text-blue-600 border-blue-500/20', 
      textColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
      gradient: 'from-blue-500/[0.03] to-transparent',
      icon: <AlertCircle size={13} className="text-blue-500" /> 
    },
  };

  // Human-readable formatted relative time helper
  const getRelativeTimeString = (dateStr: string) => {
    try {
      const created = new Date(dateStr);
      const diffMs = new Date().getTime() - created.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return 'Published today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Mock initialed poster entities to show beautiful member avatars like in the photo
  const getPosterAvatar = (category: AnnouncementCategory) => {
    switch (category) {
      case 'academic': return { initials: 'DH', name: 'Dept. Head', color: 'bg-ctu-maroon text-white' };
      case 'event': return { initials: 'SO', name: 'IE Org President', color: 'bg-ctu-gold text-slate-900' };
      case 'holiday': return { initials: 'UR', name: 'HR Office', color: 'bg-emerald-600 text-white' };
      default: return { initials: 'AD', name: 'Academic Dean', color: 'bg-blue-600 text-white' };
    }
  };

  const activePinnedCount = announcements.filter(a => a.isPinned).length;

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 animate-spin rounded-full border-4 border-ctu-gold border-t-transparent" />
          <p className="text-sm font-bold text-foreground/45 uppercase tracking-widest">Loading Bulletin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      <Sidebar user={profile} />
      
      <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-10 pb-36 lg:pb-10 overflow-x-hidden">
        
        {/* Page Title display matching other main sections */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl frosted-header font-black tracking-tighter leading-[0.9] py-2">
            Bulletin Board
          </h1>
          <p className="text-foreground/40 mt-1 sm:mt-2 text-xs sm:text-base md:text-xl font-medium tracking-tight">
            Stay updated with the latest Cebu Technological University guidelines and events.
          </p>
        </div>
        
        {/* ========================================================== */}
        {/* TOP ROW HERO PREVIEW PANEL — INSPIRED BY REFERENCE STYLE   */}
        {/* ========================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10"
        >
          {/* Greeting Notice Dashboard Block */}
          <div className="lg:col-span-2 rounded-[2.2rem] bg-white dark:bg-[#0e141f] p-6 sm:p-8 border border-white dark:border-white/[0.04] shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-ctu-gold/[0.05] via-transparent to-transparent rounded-full pointer-events-none" />
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-gradient-to-tr from-ctu-maroon/[0.03] to-transparent rounded-full pointer-events-none" />
            
            <div className="space-y-4 relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ctu-maroon/5 dark:bg-ctu-maroon/20 border border-ctu-maroon/10 dark:border-ctu-maroon/20">
                <Bell size={12} className="text-ctu-maroon animate-bounce" />
                <span className="text-[9px] font-black tracking-widest text-[#852222] dark:text-rose-300 uppercase">Live Operations Core</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3.5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                  IE Department Newsroom
                </h1>
                <p className="text-xs sm:text-sm text-foreground/50 mt-1 max-w-sm leading-relaxed">
                  Welcome to the official digital bulletin. Important guidelines, updates, and events moderated by Cebu Technological University faculty.
                </p>
              </div>

              {/* Live counts inspired by the status counter widgets */}
              <div className="flex gap-4 pt-1">
                <div className="px-4 py-2 rounded-2xl bg-foreground/[0.02] border border-foreground/[0.05] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-foreground/75">{announcements.length} Total Announcements</span>
                </div>
                {activePinnedCount > 0 && (
                  <div className="px-4 py-2 rounded-2xl bg-ctu-gold/5 border border-ctu-gold/20 flex items-center gap-2">
                    <Pin size={11} className="text-ctu-gold fill-ctu-gold" />
                    <span className="text-xs font-bold text-[#b45309] dark:text-amber-300">{activePinnedCount} Pinned Core</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nice isometric Department Bulletin design illustration */}
            <div className="relative shrink-0 w-32 h-32 items-center justify-center hidden sm:flex">
              <svg viewBox="0 0 120 120" className="w-28 h-28 opacity-90">
                <defs>
                  <linearGradient id="vectorBall" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#852222" />
                  </linearGradient>
                </defs>
                {/* 3D Bulletin Isometric Platform */}
                <ellipse cx="60" cy="80" rx="45" ry="18" fill="rgba(16, 185, 129, 0.08)" />
                <ellipse cx="60" cy="76" rx="35" ry="14" fill="rgba(16, 185, 129, 0.12)" />
                
                {/* Board Stand / Canvas Representation */}
                <rect x="54" y="25" width="12" height="52" rx="3" fill="#1e293b" />
                <polygon points="40,30 80,30 60,65" fill="rgba(133,34,34,0.15)" />
                <rect x="35" y="15" width="50" height="38" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                
                {/* Board Pins */}
                <circle cx="45" cy="24" r="3" fill="#ef4444" />
                <circle cx="75" cy="40" r="3" fill="#fbbf24" />
                <line x1="40" y1="28" x2="52" y2="28" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="40" y1="36" x2="65" y2="36" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="40" y1="44" x2="58" y2="44" stroke="#cbd5e1" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* Quick Date Display block resembling the 10.29 am widget in the photo */}
          <div className="rounded-[2.2rem] bg-white dark:bg-[#0e141f] p-6 sm:p-8 border border-white dark:border-white/[0.04] shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">SYSTIME / PORTAL</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Bookmark size={12} className="text-slate-500" />
              </div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-slate-800 dark:text-emerald-400 tracking-tight">
                {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-xs font-bold text-foreground/45 mt-1">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/40">Status updates active</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </motion.div>

        {/* ========================================================== */}
        {/* FILTER NAVIGATION CHANNELS PLACED LIKE BOARD CATEGORIES    */}
        {/* ========================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Megaphone size={16} className="text-ctu-maroon" />
              Department Notices
            </h3>
            <p className="text-xs text-foreground/40 mt-0.5">Filter announcements by specific university category tags.</p>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar scroll-smooth">
            {(['All', 'academic', 'event', 'holiday', 'reminder'] as const).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-300 tap-target",
                    isActive 
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-105 active-pillar-link" 
                      : "bg-white hover:bg-slate-50 dark:bg-[#0e141f] dark:hover:bg-slate-800 text-foreground/60 border border-slate-100 dark:border-slate-800/60"
                  )}
                >
                  {cat === 'All' ? 'All Notices' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================== */}
        {/* CARDS LIST GRID — MEETS CTU NEUMORPHIC-GRID PHILOSOPHY     */}
        {/* ========================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((ann, idx) => {
              const meta = categoryMeta[ann.category] || {
                label: 'Notice',
                color: 'bg-slate-100 text-slate-600',
                textColor: 'text-slate-600',
                borderColor: 'border-slate-200',
                gradient: 'from-slate-50 to-transparent',
                icon: <ChevronRight size={13} />
              };
              const poster = getPosterAvatar(ann.category);

              return (
                <motion.div
                  key={ann.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card 
                    onClick={() => setSelectedAnnouncement(ann)}
                    className="neumorphic-card group border-none hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col relative overflow-hidden"
                  >
                    {/* Top ambient category background gradient */}
                    <div className={cn("absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-40 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none", meta.gradient)} />
                    
                    {/* Pinned visual bar at the very top */}
                    {ann.isPinned && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-ctu-gold animate-pulse z-10" />
                    )}

                    <CardContent className="p-6 sm:p-7 flex flex-col h-full relative z-10">
                      {/* Badge / Pin Header row */}
                      <div className="flex justify-between items-center mb-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase border",
                          meta.color
                        )}>
                          {meta.icon}
                          {meta.label}
                        </span>

                        {ann.isPinned && (
                          <div className="p-1.5 rounded-full bg-ctu-gold/10 border border-ctu-gold/20 text-ctu-gold">
                            <Pin size={12} className="fill-ctu-gold" />
                          </div>
                        )}
                      </div>

                      {/* Title block */}
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-ctu-maroon dark:group-hover:text-ctu-gold transition-colors duration-300 line-clamp-2 leading-tight mb-2.5">
                        {ann.title}
                      </h3>
                      
                      {/* Snippet Content */}
                      <p className="text-xs sm:text-sm text-foreground/50 line-clamp-3 mb-6 flex-1 font-medium leading-relaxed">
                        {ann.content}
                      </p>

                      {/* Footer: Date AND Author display resembling the members view in the photo */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/40">
                        {/* Member avatar tag */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm tracking-wide shrink-0",
                            poster.color
                          )}>
                            {poster.initials}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 dark:text-neutral-200 leading-none">{poster.name}</p>
                            <span className="text-[9px] text-foreground/35 uppercase tracking-wider font-semibold">CTU Faculty</span>
                          </div>
                        </div>

                        {/* Date tracker */}
                        <div className="flex flex-col items-end text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="text-[8px] tracking-normal font-semibold text-[#852222] mt-0.5">{getRelativeTimeString(ann.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State Screen when filters don't match */}
        {filteredAnnouncements.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-[2.2rem] bg-white dark:bg-[#0e141f] border border-dashed border-foreground/10 text-center p-12 mt-10"
          >
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Megaphone size={24} className="text-foreground/30" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-neutral-200">No active notices found</h4>
            <p className="text-xs text-foreground/40 mt-1 max-w-sm mx-auto">
              There are currently no active announcements published inside the "{selectedCategory}" track. Please check back later.
            </p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-4 px-6 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-full text-xs font-bold transition-all hover:scale-105"
            >
              Reset Filters
            </button>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* PREMIUM MODAL DETAIL OVERLAY DISPLAY                       */}
        {/* ========================================================== */}
        <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl h-[80dvh] overflow-y-auto overscroll-contain rounded-[2.2rem] bg-white dark:bg-[#0c121e] border border-foreground/5 text-foreground p-0">
            {selectedAnnouncement && (
              <div className="flex flex-col h-full">
                {/* Decorative Banner Top inside Dialog */}
                <div className={cn(
                  "px-6 sm:px-8 py-8 relative overflow-hidden bg-gradient-to-br",
                  categoryMeta[selectedAnnouncement.category] ? categoryMeta[selectedAnnouncement.category].gradient : "from-slate-100 to-transparent",
                  "border-b border-foreground/5"
                )}>
                  {selectedAnnouncement.isPinned && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-ctu-gold/10 border border-ctu-gold/25 text-[#b45309] font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 z-10 animate-pulse">
                      <Pin size={10} className="fill-ctu-gold text-ctu-gold" /> PINNED Core Notice
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4 pt-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase border",
                      categoryMeta[selectedAnnouncement.category] ? categoryMeta[selectedAnnouncement.category].color : "bg-slate-100 text-slate-600"
                    )}>
                      {categoryMeta[selectedAnnouncement.category] ? categoryMeta[selectedAnnouncement.category].icon : <ChevronRight size={13} />}
                      {categoryMeta[selectedAnnouncement.category] ? categoryMeta[selectedAnnouncement.category].label : 'Notice'}
                    </span>
                  </div>

                  <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-black leading-tight text-slate-900 dark:text-white">
                    {selectedAnnouncement.title}
                  </DialogTitle>
                </div>

                {/* Body Content */}
                <div className="px-6 sm:px-8 py-6 flex-1 text-slate-700 dark:text-slate-300 leading-relaxed font-semibold text-sm sm:text-base whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>

                {/* Footer Content */}
                <div className="px-6 sm:px-8 py-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* User credentials */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-xs", getPosterAvatar(selectedAnnouncement.category).color)}>
                      {getPosterAvatar(selectedAnnouncement.category).initials}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">{getPosterAvatar(selectedAnnouncement.category).name}</p>
                      <p className="text-[10px] text-foreground/40 font-semibold tracking-wider uppercase">Cebu Tech Editorial</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-ctu-maroon" /> {new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => setSelectedAnnouncement(null)}
                      className="px-6 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 text-white rounded-full text-xs font-black transition-all hover:scale-105"
                    >
                      Close Notice
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}

