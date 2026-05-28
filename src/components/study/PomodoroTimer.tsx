import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Check,
  Timer,
  BookOpen,
  Flame,
  Trophy,
  BarChart2,
  History,
  Sparkles,
  Clock,
  PlusCircle,
  Square,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Award,
  Trees,
  Sprout,
  Info,
  Heart,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { IE_SUBJECTS } from '@/src/lib/constants';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/src/context/AuthContext';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface PomodoroLog {
  id: string;
  subjectCode: string;
  subjectName: string;
  durationMinutes: number;
  timestamp: string;
  mode: TimerMode;
  notes?: string;
}

// Forest Tree representational interface
interface ForestTree {
  id: string;
  speciesId: string;
  timestamp: string;
  durationMinutes: number;
  subjectCode: string;
  subjectName: string;
  isWithered: boolean;
}

interface PlantSpecies {
  id: string;
  name: string;
  emoji: string;
  color: string;
  textColor: string;
  description: string;
  iconBg: string;
  fact: string;
}

const PLANT_SPECIES: PlantSpecies[] = [
  {
    id: 'ctu_maroon',
    name: 'CTU Maroon Blossom',
    emoji: '🌸',
    color: '#800000',
    textColor: 'text-ctu-maroon',
    description: 'A beautiful cherry blossom tree matching Cebu Tech Maroon pride.',
    iconBg: 'bg-ctu-maroon/10',
    fact: 'Flowers only when absolute academic rigor and passion align.'
  },
  {
    id: 'gold_ginko',
    name: 'Golden Ginko',
    emoji: '🍁',
    color: '#D4AF37',
    textColor: 'text-ctu-gold',
    description: 'A brilliant golden leaf tree representing endurance, strength, and Cebu sunshine.',
    iconBg: 'bg-ctu-gold/10',
    fact: 'One of the oldest tree species, holding onto wisdom for millions of years.'
  },
  {
    id: 'bonsai_master',
    name: 'Bonsai Masterpiece',
    emoji: '🪴',
    color: '#10B981',
    textColor: 'text-emerald-600',
    description: 'Precision work-study in plant form. Demands continuous high-focus blocks.',
    iconBg: 'bg-emerald-500/10',
    fact: 'Requires meticulous pruning, reflecting the attention to detail in IE method engineering.'
  },
  {
    id: 'bright_sunflower',
    name: 'Golden Sunflower',
    emoji: '🌻',
    color: '#FBBF24',
    textColor: 'text-yellow-500',
    description: 'A radiant sun-seeking flowers keeping your spirits high while reviewing.',
    iconBg: 'bg-yellow-500/10',
    fact: 'Turns its head toward solar energy, mirroring optimization of natural resources.'
  },
  {
    id: 'desert_saguaro',
    name: 'Desert Cactus',
    emoji: '🌵',
    color: '#059669',
    textColor: 'text-emerald-600',
    description: 'Highly resilient against water stress. Perfect for long, dry thesis drafts.',
    iconBg: 'bg-green-600/10',
    fact: 'Stores critical moisture in harsh climates, representing ultimate cognitive stamina.'
  },
  {
    id: 'royal_oak',
    name: 'Royal Oak Tree',
    emoji: '🌳',
    color: '#047857',
    textColor: 'text-emerald-700',
    description: 'Deep-rooted, sturdy oak symbolizing solid structural & system foundations.',
    iconBg: 'bg-teal-600/10',
    fact: 'Takes decades to mature, symbolizing the deep foundation of Cebu industrial engineering.'
  },
  {
    id: 'bamboo_serene',
    name: 'Bamboo of Serenity',
    emoji: '🎋',
    color: '#16A34A',
    textColor: 'text-green-600',
    description: 'Sleek, lightweight, and bendable. Perfect for active scheduling fatigue.',
    iconBg: 'bg-green-500/10',
    fact: 'Bends with Cebu typhoon winds but never breaks, embodying human adaptability.'
  },
  {
    id: 'royal_lavender',
    name: 'Astral Lavender',
    emoji: '🪻',
    color: '#8B5CF6',
    textColor: 'text-violet-500',
    description: 'Soothing essential aromatics which calms down your study fatigue.',
    iconBg: 'bg-violet-500/10',
    fact: 'Scent compounds calm alpha brain waves, facilitating deep operational flow states.'
  }
];

export default function PomodoroTimer() {
  const { profile: user } = useAuth();

  // Timer settings & states
  const [mode, setMode] = useState<TimerMode>('focus');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalDuration, setTotalDuration] = useState(25 * 60); // Total seconds for active mode

  // Forest-specific states
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('ctu_maroon');
  const [forest, setForest] = useState<ForestTree[]>(() => {
    const saved = localStorage.getItem('pomodoro_forest');
    return saved ? JSON.parse(saved) : [
      {
        id: 'tree-init1',
        speciesId: 'ctu_maroon',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        durationMinutes: 25,
        subjectCode: 'IE-412',
        subjectName: 'Operations Research I',
        isWithered: false
      },
      {
        id: 'tree-init2',
        speciesId: 'bonsai_master',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        durationMinutes: 50,
        subjectCode: 'IE-321',
        subjectName: 'Ergonomics & Work Design',
        isWithered: false
      },
      {
        id: 'tree-init3',
        speciesId: 'desert_saguaro',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        durationMinutes: 15,
        subjectCode: 'CUST-IE',
        subjectName: 'Late night thesis review',
        isWithered: true
      }
    ];
  });

  // Config & customization
  const [focusConfig, setFocusConfig] = useState(25);
  const [shortConfig, setShortConfig] = useState(5);
  const [longConfig, setLongConfig] = useState(15);
  const [showConfig, setShowConfig] = useState(false);

  // Sound toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickerEnabled, setTickerEnabled] = useState(false);

  // Subject allocation
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('general');
  const [customSubjectText, setCustomSubjectText] = useState('');

  // Tasks checklist
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('pomodoro_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Analyze Simplex algorithm bounds', completed: false },
      { id: '2', text: 'Audit motion waste criteria (Therbligs)', completed: false }
    ];
  });
  const [newTaskText, setNewTaskText] = useState('');

  // Analytics & logs
  const [logs, setLogs] = useState<PomodoroLog[]>(() => {
    const saved = localStorage.getItem('pomodoro_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Navigation tabs - Add 'forest' tab!
  const [activePane, setActivePane] = useState<'timer' | 'forest' | 'stats' | 'logs'>('timer');
  const [forestPage, setForestPage] = useState(0);

  // SVG Circular progress layout constants
  const subCircleRadius = 120;
  const strokeDashArray = 2 * Math.PI * subCircleRadius;

  // Sound Synth Synthesizer
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync tasks to localstorage
  useEffect(() => {
    localStorage.setItem('pomodoro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Sync logs to localstorage
  useEffect(() => {
    localStorage.setItem('pomodoro_logs', JSON.stringify(logs));
  }, [logs]);

  // Sync forest to localstorage
  useEffect(() => {
    localStorage.setItem('pomodoro_forest', JSON.stringify(forest));
  }, [forest]);

  // Handle timer presets switching
  useEffect(() => {
    resetTimer(mode);
  }, [focusConfig, shortConfig, longConfig, mode]);

  // Initialize or resume state based on active preset
  const resetTimer = (newMode: TimerMode = mode) => {
    setIsActive(false);
    setMode(newMode);
    let targetMins = 25;
    if (newMode === 'focus') targetMins = focusConfig;
    else if (newMode === 'shortBreak') targetMins = shortConfig;
    else if (newMode === 'longBreak') targetMins = longConfig;

    setMinutes(targetMins);
    setSeconds(0);
    setTotalDuration(targetMins * 60);
  };

  // Metronome Focus Ticker Sound Synthesizer function
  const playTick = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime); // Gentle click frequency
      
      gain.gain.setValueAtTime(0.012, ctx.currentTime); // Very low volume click
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio synthesis failed to initialize:', e);
    }
  };

  // Completion Alarm Sound function (A cheerful dual-tone chime!)
  const playCompletedAlarm = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First note (Arpeggio style)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      // Second note offset
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain2.gain.setValueAtTime(0.14, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.7);
      }, 150);

      // Third note peak
      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain3.gain.setValueAtTime(0.16, ctx.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start();
        osc3.stop(ctx.currentTime + 0.9);
      }, 300);

    } catch (e) {
      console.warn('Completion chime audio error:', e);
    }
  };

  // Sad decay synthesizer on gave-up / withered plant crash
  const playWitherAlarm = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      // Slur or slide pitch downwards
      osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
      osc.frequency.linearRampToValueAtTime(110.00, ctx.currentTime + 1.2); // Sinking pitch to A2
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Wither synthesis error:', e);
    }
  };

  // Real-time ticking system
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(prev => prev - 1);
          if (tickerEnabled) {
            playTick();
          }
        } else if (minutes > 0) {
          setMinutes(prev => prev - 1);
          setSeconds(59);
          if (tickerEnabled) {
            playTick();
          }
        } else {
          // Timer finished!
          handleTimerComplete();
        }
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, tickerEnabled]);

  // Log session as Grown Tree or Withered Trunk
  const registerForestSession = async (isWithered: boolean) => {
    let subCode = 'GEN-IE';
    let subName = 'General study / review';

    if (selectedSubjectId !== 'general') {
      const targetSub = IE_SUBJECTS.find(s => s.id === selectedSubjectId);
      if (targetSub) {
        subCode = targetSub.code;
        subName = targetSub.name;
      }
    } else if (customSubjectText.trim()) {
      subCode = 'CUST-IE';
      subName = customSubjectText.trim();
    }

    const durationDone = isWithered 
      ? Math.max(1, Math.round((totalDuration - (minutes * 60 + seconds)) / 60))
      : focusConfig;

    // Create Forestry Element
    const newTree: ForestTree = {
      id: `tree-${Math.random().toString(36).substring(2, 9)}`,
      speciesId: selectedSpeciesId,
      timestamp: new Date().toISOString(),
      durationMinutes: durationDone,
      subjectCode: subCode,
      subjectName: subName,
      isWithered: isWithered
    };

    setForest(prev => [newTree, ...prev]);

    // Format Traditional Logs for backcompat stats
    const newLog: PomodoroLog = {
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      subjectCode: subCode,
      subjectName: subName,
      durationMinutes: durationDone,
      timestamp: new Date().toISOString(),
      mode: 'focus',
      notes: isWithered 
        ? `⚠️ WITHERED SEED: broke focus early: "${tasks.filter(t => !t.completed).map(t => t.text).join(', ')}"` 
        : `🌲 Successful Forest Grow session: "${tasks.filter(t => t.completed).map(t => t.text).join(', ')}" `
    };

    setLogs(prev => [newLog, ...prev]);

    // Update Firebase Firestore if user is authenticated
    if (user?.uid) {
      try {
        await addDoc(collection(db, 'pomodoroLogs'), {
          userId: user.uid,
          subjectCode: subCode,
          subjectName: subName,
          durationMinutes: durationDone,
          timestamp: serverTimestamp(),
          mode: 'focus',
          notes: newLog.notes || "",
          isWithered: isWithered,
          speciesId: selectedSpeciesId,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Failed to upload logs to cloud storage:', err);
      }
    }
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    playCompletedAlarm();

    if (mode === 'focus') {
      const targetPlantName = PLANT_SPECIES.find(p => p.id === selectedSpeciesId)?.name || 'Plant';
      toast.success(`Incredible Stay-Focused victory! You successfully cultivated a "${targetPlantName}" 🎉 for: ${selectedSubjectId === 'general' ? (customSubjectText || 'General IE') : IE_SUBJECTS.find(s => s.id === selectedSubjectId)?.name}`, {
        duration: 7000
      });
      registerForestSession(false);
      resetTimer('shortBreak');
    } else if (mode === 'shortBreak') {
      toast.info('Break completed! Back to the soil focus block to grow more plants.', { duration: 6000 });
      resetTimer('focus');
    } else if (mode === 'longBreak') {
      toast.info('Long recharge ended! Ready to plant more seeds?', { duration: 6000 });
      resetTimer('focus');
    }
  };

  // Adjust current time manually
  const modifyTime = (amountSeconds: number) => {
    let currentTotal = minutes * 60 + seconds + amountSeconds;
    if (currentTotal < 0) currentTotal = 0;
    
    const newMins = Math.floor(currentTotal / 60);
    const newSecs = currentTotal % 60;
    
    setMinutes(newMins);
    setSeconds(newSecs);
    setTotalDuration(Math.max(1, totalDuration + amountSeconds));
  };

  // Toggle state
  const togglePlay = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsActive(!isActive);
  };

  // Settle Force Wither Action (GIVE UP mechanic in Forest)
  const handleWitherPlant = () => {
    if (mode !== 'focus') {
      resetTimer('focus');
      return;
    }

    const currentSpeciesName = PLANT_SPECIES.find(p => p.id === selectedSpeciesId)?.name || 'plant';
    
    const hasConfirmed = window.confirm(`⚠️ WARNING: Giving up now will wither and KILL your "${currentSpeciesName}"! It will be permanently registered as a dead trunk in your Forest Garden plot. Are you absolutely sure you want to give up studying?`);
    
    if (hasConfirmed) {
      setIsActive(false);
      playWitherAlarm();
      registerForestSession(true);
      toast.error(`Study focus abandoned! Your "${currentSpeciesName}" has died. 🍂 Remember: Be present, stay focused next time!`, {
        duration: 8000
      });
      resetTimer('focus');
    }
  };

  // Calculation for progress circle stroke layout
  const currentTotalSecondsLeft = minutes * 60 + seconds;
  const progressRatio = totalDuration > 0 ? (totalDuration - currentTotalSecondsLeft) / totalDuration : 0;
  const strokeDashOffset = strokeDashArray * (1 - progressRatio);

  // Dynamic Sprout Grow Stages based on completion ratio
  const getGrowthStageGraphic = () => {
    if (mode !== 'focus') {
      return { emoji: '☕', label: 'Coffee Cup break stage', subtext: 'Rest allowance runtime' };
    }
    if (!isActive && progressRatio === 0) {
      const selected = PLANT_SPECIES.find(p => p.id === selectedSpeciesId);
      return { 
        emoji: '🟤', 
        label: `Planting a ${selected?.name || 'Seed'}`, 
        subtext: 'Press Play to sow the seed in fertile local soil' 
      };
    }

    const activeSecsElapsed = totalDuration - currentTotalSecondsLeft;
    const selected = PLANT_SPECIES.find(p => p.id === selectedSpeciesId);
    const flowerEmoji = selected?.emoji || '🌸';

    if (progressRatio < 0.15) {
      return { emoji: '🌱', label: 'Just Germinated Sprout', subtext: 'Root systems anchoring into the study workspace' };
    } else if (progressRatio < 0.45) {
      return { emoji: '🌿', label: 'Growing Sapling Stalks', subtext: 'Sprouting first branches. Stay present!' };
    } else if (progressRatio < 0.75) {
      return { emoji: '🪴', label: 'Cozy Branching Bush', subtext: 'Foliage density increasing. Method design is blooming.' };
    } else if (progressRatio < 0.98) {
      return { emoji: '🌳', label: 'Young Blossom Tree', subtext: 'Buds forming. Completion threshold imminent!' };
    } else {
      return { emoji: flowerEmoji, label: `Magnificent ${selected?.name || 'Blossom'}`, subtext: 'Success! Golden academic harvest accomplished!' };
    }
  };

  const currentStage = getGrowthStageGraphic();

  // Focus tasks helper functions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      text: newTaskText.trim(),
      completed: false
    }]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Stats derivations
  const statsSummary = React.useMemo(() => {
    const focusLogs = logs.filter(l => l.mode === 'focus');
    const totalMin = focusLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const totalBlocks = focusLogs.length;

    // Survival evaluation from Forest list state
    const surviveTrees = forest.filter(f => !f.isWithered);
    const witheredTrees = forest.filter(f => f.isWithered);
    const totalForestSeeds = forest.length || 1;
    const survivalRate = Math.round((surviveTrees.length / totalForestSeeds) * 100);

    // Days streak (simplified)
    const uniqueDates = new Set(focusLogs.map(l => l.timestamp.split('T')[0]));
    const streak = uniqueDates.size;

    // Subjects break down
    const subjectDistribution: Record<string, { minutes: number, name: string, code: string }> = {};
    focusLogs.forEach(l => {
      const key = l.subjectCode || 'GEN-IE';
      if (!subjectDistribution[key]) {
        subjectDistribution[key] = { minutes: 0, name: l.subjectName, code: key };
      }
      subjectDistribution[key].minutes += l.durationMinutes;
    });

    const subjectArray = Object.values(subjectDistribution).sort((a, b) => b.minutes - a.minutes);

    return {
      totalMinutes: totalMin,
      totalBlocks,
      streak,
      survivalRate,
      surviveCount: surviveTrees.length,
      witherCount: witheredTrees.length,
      subjectArray
    };
  }, [logs, forest]);

  // Format Logs History
  const clearLogsHistory = () => {
    if (window.confirm("Permanently wipe clean your focused study forest garden history? This will delete all visual trees and text logs.")) {
      setLogs([]);
      setForest([]);
      localStorage.removeItem('pomodoro_logs');
      localStorage.removeItem('pomodoro_forest');
      toast.success("Focus and visual forestry databases reformatted successfully.");
    }
  };

  return (
    <div className="w-full" id="pomodoro-timer-utility-root">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Timer & Selection Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 sm:p-10 relative overflow-hidden flex flex-col items-center">
            
            {/* Ambient visual background glow matching state */}
            <div className={cn(
              "absolute w-72 h-72 blur-[9rem] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none transition-all duration-1000",
              mode === 'focus' ? "bg-emerald-600/30" : mode === 'shortBreak' ? "bg-teal-500/20" : "bg-blue-500/20"
            )} />

            {/* NEUMORPHIC TOP LEVEL APP NAVIGATION TABS */}
            <div className="flex flex-wrap gap-1 p-1 bg-foreground/[0.03] backdrop-blur-xl rounded-2xl w-full max-w-lg mb-8 relative z-10 border border-foreground/5">
              <button
                onClick={() => setActivePane('timer')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'timer'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/85"
                )}
              >
                <Timer size={13} />
                <span>Timer</span>
              </button>
              
              <button
                onClick={() => setActivePane('forest')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'forest'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/85"
                )}
              >
                <Trees size={13} />
                <span>My Forest</span>
              </button>

              <button
                onClick={() => setActivePane('stats')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'stats'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/85"
                )}
              >
                <BarChart2 size={13} />
                <span>Metrics</span>
              </button>
              
              <button
                onClick={() => setActivePane('logs')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'logs'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/85"
                )}
              >
                <History size={13} />
                <span>History</span>
              </button>
            </div>

            {/* PANE VIEW 1: ACTIVE TIMING CORE */}
            {activePane === 'timer' && (
              <div className="w-full flex flex-col items-center relative z-10" id="timer-screen-pane">
                
                {/* Mode Selectors */}
                <div className="flex gap-2 mb-6">
                  {[
                    { id: 'focus', label: 'Focus Block', color: 'text-ctu-gold' },
                    { id: 'shortBreak', label: 'Coffee Break', color: 'text-teal-400' },
                    { id: 'longBreak', label: 'Deep Recharge', color: 'text-blue-400' }
                  ].map(item => {
                    const isSelected = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        disabled={isActive && mode === 'focus'}
                        onClick={() => resetTimer(item.id as TimerMode)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border border-transparent tap-target",
                          isSelected 
                            ? "bg-foreground/10 text-foreground shadow-inner border-foreground/5 scale-103 font-black" 
                            : "bg-transparent text-foreground/40 hover:text-foreground/85",
                          isActive && mode === 'focus' && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span className={item.color}>●</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Circular Countdown Progress with Realtime Sprout Growth Animation */}
                <div className="relative w-72 h-72 mb-6 flex items-center justify-center">
                  
                  {/* Background Track SVG circle */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="144"
                      cy="144"
                      r={subCircleRadius}
                      className="stroke-foreground/[0.03] fill-none"
                      strokeWidth="10"
                    />
                    <motion.circle
                      cx="144"
                      cy="144"
                      r={subCircleRadius}
                      className={cn(
                        "fill-none transition-all duration-300",
                        mode === 'focus' ? "stroke-emerald-500" : mode === 'shortBreak' ? "stroke-teal-400" : "stroke-blue-400"
                      )}
                      strokeWidth="10"
                      strokeDasharray={strokeDashArray}
                      strokeDashoffset={strokeDashOffset}
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Centered growth visualization container with dynamic emoji growth stages */}
                  <div className="absolute flex flex-col items-center select-none text-center">
                    
                    {/* Plant graphic evolution container */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStage.emoji}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-5xl sm:text-6xl filter drop-shadow-md mb-2 cursor-pointer"
                        title={currentStage.label}
                      >
                        {currentStage.emoji}
                      </motion.div>
                    </AnimatePresence>

                    <motion.span 
                      key={`${minutes}-${seconds}`}
                      initial={{ scale: 0.97, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl sm:text-5xl font-mono font-black tracking-tighter leading-none text-foreground"
                    >
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </motion.span>
                    
                    <span className="text-[9px] uppercase font-black tracking-widest text-foreground/35 mt-1 max-w-[150px] truncate leading-none">
                      {currentStage.label}
                    </span>
                  </div>
                </div>

                {/* Growth Stage advice text banner */}
                <p className="text-[11px] text-center font-bold text-foreground/50 max-w-sm mb-6 leading-relaxed bg-foreground/[0.02] px-4 py-2 rounded-xl border border-foreground/5 shrink-0">
                  🌱 <span className="text-ctu-gold italic">Forest Progress:</span> {currentStage.subtext}
                </p>

                {/* Sub-incremental precision dial controls */}
                <div className="flex gap-2.5 mb-6">
                  <button
                    disabled={isActive}
                    onClick={() => modifyTime(-300)}
                    className="px-3 py-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-[10px] font-black transition-all border border-foreground/5 tap-target disabled:opacity-40"
                    title="Subtract 5 mins"
                  >
                    - 5m
                  </button>
                  <button
                    disabled={isActive}
                    onClick={() => modifyTime(-60)}
                    className="px-3 py-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-[10px] font-black transition-all border border-foreground/5 tap-target disabled:opacity-40"
                    title="Subtract 1 min"
                  >
                    - 1m
                  </button>
                  <button
                    disabled={isActive}
                    onClick={() => modifyTime(60)}
                    className="px-3 py-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-[10px] font-black transition-all border border-foreground/5 tap-target disabled:opacity-40"
                    title="Add 1 min"
                  >
                    + 1m
                  </button>
                  <button
                    disabled={isActive}
                    onClick={() => modifyTime(300)}
                    className="px-3 py-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-[10px] font-black transition-all border border-foreground/5 tap-target disabled:opacity-40"
                    title="Add 5 mins"
                  >
                    + 5m
                  </button>
                </div>

                {/* Core Action triggers (Play, Pause, Wither/Give up, config tools) */}
                <div className="flex items-center gap-4 w-full max-w-sm justify-center mb-8">
                  {/* Alarm Alarm Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      "p-3 rounded-xl transition-all tap-target border border-foreground/5",
                      soundEnabled ? "bg-foreground/5 text-foreground/80 hover:bg-foreground/10" : "bg-destructive/10 text-destructive hover:bg-destructive/15"
                    )}
                    title={soundEnabled ? "Sound active" : "Silent alarm mode"}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  {/* Center PLAY Action */}
                  <button
                    onClick={togglePlay}
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all scale-100 active:scale-95 text-white shadow-xl tap-target",
                      isActive 
                        ? "bg-slate-500 shadow-slate-500/20 hover:bg-slate-600" 
                        : "bg-emerald-600 shadow-emerald-600/20 hover:scale-[1.03] hover:bg-emerald-500"
                    )}
                  >
                    {isActive ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                  </button>

                  {/* Give up & wither button - Critical Forest application mechanic */}
                  <button
                    onClick={handleWitherPlant}
                    className={cn(
                      "p-3 rounded-xl transition-all tap-target border border-foreground/5 font-black text-[10px] tracking-widest",
                      isActive && mode === 'focus'
                        ? "bg-destructive/15 text-destructive border-destructive/20 animate-pulse hover:bg-destructive/25"
                        : "bg-foreground/5 text-foreground/55 hover:text-foreground/80"
                    )}
                    title={isActive && mode === 'focus' ? "Break focus: current seed dies!" : "Reset block"}
                  >
                    {isActive && mode === 'focus' ? 'GIVE UP 🍂' : <RotateCcw size={16} />}
                  </button>

                  <button
                    onClick={() => setTickerEnabled(!tickerEnabled)}
                    className={cn(
                      "p-3 rounded-xl transition-all tap-target border border-foreground/5 text-[9px] font-black tracking-wider uppercase",
                      tickerEnabled ? "bg-ctu-gold/20 text-ctu-gold" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                    )}
                    title="Metronome ticking audio pace ticker"
                  >
                    TIC-TOC
                  </button>
                </div>

                {/* SEED NURSERY: SELECTION CAROUSEL (Choose which species of seed to plant!) */}
                {!isActive && mode === 'focus' && (
                  <div className="w-full max-w-md border-t border-foreground/5 pt-6 mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Sprout size={16} className="text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 italic">Choose Focus Seed Species</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {PLANT_SPECIES.map(plant => {
                        const isSelected = selectedSpeciesId === plant.id;
                        return (
                          <button
                            key={plant.id}
                            type="button"
                            onClick={() => {
                              setSelectedSpeciesId(plant.id);
                              toast.info(`Selected species: ${plant.emoji} ${plant.name}. Let's grow it!`);
                            }}
                            className={cn(
                              "relative py-3 rounded-2xl flex flex-col items-center justify-center border transition-all tap-target",
                              isSelected 
                                ? "bg-foreground/[0.04] border-emerald-500/50 scale-103 shadow-sm ring-1 ring-emerald-500/10" 
                                : "bg-foreground/[0.01] border-foreground/5 hover:bg-foreground/[0.03]"
                            )}
                            title={plant.description}
                          >
                            <span className="text-3xl mb-1">{plant.emoji}</span>
                            <span className="text-[8px] font-black uppercase tracking-tight text-center truncate max-w-[70px] text-foreground/60">
                              {plant.name.split(' ')[0]}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected plant brief explanation card */}
                    {(() => {
                      const sel = PLANT_SPECIES.find(p => p.id === selectedSpeciesId);
                      return sel ? (
                        <div className="mt-3 p-3 rounded-xl bg-foreground/[0.01] border border-foreground/5 text-[10px] flex gap-2 items-center leading-relaxed">
                          <span className="text-2xl">{sel.emoji}</span>
                          <div>
                            <p className="font-extrabold text-foreground">{sel.name}</p>
                            <p className="text-foreground/50 font-medium italic">{sel.fact}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Section Allocation */}
                <div className="w-full max-w-sm border-t border-foreground/5 pt-6 bg-foreground/[0.01] p-4 rounded-3xl border border-foreground/5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-ctu-gold shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 italic">Assign Focus Subject Target</span>
                  </div>
                  
                  <select
                    disabled={isActive}
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground tracking-tight focus:outline-none focus:border-ctu-maroon active:opacity-90 transition-all disabled:opacity-50"
                  >
                    <option value="general">💼 General Study & Focus Allocation</option>
                    {IE_SUBJECTS.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                    <option value="custom">✍️ Custom Topic (Enter Below)</option>
                  </select>

                  {selectedSubjectId === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5"
                    >
                      <input
                        disabled={isActive}
                        type="text"
                        placeholder="Enter custom focus milestone name..."
                        value={customSubjectText}
                        onChange={(e) => setCustomSubjectText(e.target.value)}
                        className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-ctu-maroon transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Config Switcher */}
                <div className="w-full max-w-sm mt-4 text-center">
                  <button
                    disabled={isActive}
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 hover:text-ctu-gold transition-all disabled:opacity-40"
                  >
                    {showConfig ? 'Hide Custom Preset Settings' : 'Configure Preset Session Lengths'}
                  </button>

                  <AnimatePresence>
                    {showConfig && !isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-foreground/[0.01] p-4 rounded-3xl border border-foreground/5 mt-3 grid grid-cols-3 gap-3 text-left"
                      >
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1 font-mono">Focus Block (m)</label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={focusConfig}
                            onChange={(e) => setFocusConfig(Math.max(1, Number(e.target.value)))}
                            className="w-full h-9 px-2 text-xs font-bold rounded-lg bg-background border border-foreground/10 text-center text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1 font-mono">Coffee/Short (m)</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={shortConfig}
                            onChange={(e) => setShortConfig(Math.max(1, Number(e.target.value)))}
                            className="w-full h-9 px-2 text-xs font-bold rounded-lg bg-background border border-foreground/10 text-center text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1 font-mono">Deep/Long Rest (m)</label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={longConfig}
                            onChange={(e) => setLongConfig(Math.max(1, Number(e.target.value)))}
                            className="w-full h-9 px-2 text-xs font-bold rounded-lg bg-background border border-foreground/10 text-center text-foreground"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* PANE VIEW 2: GRAPHICAL FOREST GARDEN GRID */}
            {activePane === 'forest' && (
              <div className="w-full relative z-10 space-y-6 text-left" id="forest-garden-screen-pane">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                      <Trees size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-foreground leading-none">My Garden of Focus</h3>
                      <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-bold mt-1">Visualize your academic milestones in solid soil</p>
                    </div>
                  </div>

                  {/* Summary Indicators */}
                  <div className="flex items-center gap-3">
                    <div className="bg-foreground/5 px-3 py-1.5 rounded-xl border border-foreground/5 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-mono text-foreground/40 leading-none mb-1">Survival Rate</p>
                      <p className="text-sm font-mono font-black text-emerald-500 leading-none">{statsSummary.survivalRate}%</p>
                    </div>
                    
                    <div className="bg-foreground/5 px-3 py-1.5 rounded-xl border border-foreground/5 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-mono text-foreground/40 leading-none mb-1">Cultivated</p>
                      <p className="text-sm font-mono font-black text-ctu-gold leading-none">
                        {statsSummary.surviveCount} <span className="text-[9px] font-semibold text-foreground/40 text-rose-500 group">({statsSummary.witherCount}🍂 d)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description info on Forest behavior */}
                <div className="p-3.5 rounded-2xl bg-foreground/[0.01] border border-foreground/5 text-[11px] leading-relaxed text-foreground/60">
                  🌳 <span className="font-extrabold text-foreground">Stay Focused, Be Present:</span> Every successful study block sprouts and places a healthy plant below. Failing a session turns that plant into a dry trunk (🍂). Establish study blocks often to grow a lush visual garden!
                </div>

                {/* THE GRAPHICAL ISOMETRIC LAND GRID BLOCK */}
                <div className="p-3 sm:p-6 rounded-[2.5rem] bg-gradient-to-br from-[#161B27] to-[#0D1117] border border-foreground/5 shadow-2xl relative overflow-visible flex flex-col items-center justify-center min-h-[420px]">
                  
                  {/* Title or pagination inside the plot box */}
                  <div className="absolute top-4 left-4 sm:left-6 z-20 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider border border-emerald-500/20">
                      PLOT {String.fromCharCode(65 + forestPage)}
                    </span>
                    {Math.ceil(forest.length / 25) > 1 && (
                      <span className="text-[10px] font-extrabold text-foreground/40 font-mono py-1">
                        Page {forestPage + 1} of {Math.ceil(forest.length / 25)}
                      </span>
                    )}
                  </div>

                  {Math.ceil(forest.length / 25) > 1 && (
                    <div className="absolute top-3 right-4 sm:right-6 z-20 flex items-center gap-1.5 bg-foreground/5 p-1 rounded-xl border border-foreground/5">
                      <button
                        onClick={() => setForestPage(prev => Math.max(0, prev - 1))}
                        disabled={forestPage === 0}
                        className="p-1.5 rounded-lg bg-background border border-foreground/5 text-foreground hover:scale-105 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all"
                        title="Prior Island Plot"
                      >
                        <ChevronLeft size={12} className="text-foreground" />
                      </button>
                      <button
                        onClick={() => setForestPage(prev => Math.min(Math.ceil(forest.length / 25) - 1, prev + 1))}
                        disabled={forestPage >= Math.ceil(forest.length / 25) - 1}
                        className="p-1.5 rounded-lg bg-background border border-foreground/5 text-foreground hover:scale-105 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all"
                        title="Next Island Plot"
                      >
                        <ChevronRight size={12} className="text-foreground" />
                      </button>
                    </div>
                  )}

                  {/* 3D Isometric Island Overlay Container */}
                  <div className="w-full max-w-[460px] aspect-[5/4] relative overflow-visible flex items-center justify-center pt-8">
                    
                    {/* SVG 3D Isometric Terrain Geometry */}
                    <svg
                      viewBox="0 0 500 400"
                      className="absolute inset-0 w-full h-full drop-shadow-[0_25px_35px_rgba(0,0,0,0.55)] pointer-events-none"
                    >
                      {/* Ambient Shadow cast beneath the island float */}
                      <ellipse cx="250" cy="355" rx="190" ry="20" fill="black" opacity="0.45" filter="blur(8px)" />

                      {/* Left Wall - Side soil face */}
                      <path
                        d="M 40 160 L 250 280 L 250 345 L 40 225 Z"
                        fill="url(#soil-left-grad)"
                      />
                      
                      {/* Left Wall Texture details */}
                      <circle cx="80" cy="210" r="4" fill="#3e2723" opacity="0.5" />
                      <circle cx="150" cy="260" r="5" fill="#4e342e" opacity="0.6" />
                      <circle cx="210" cy="290" r="3.5" fill="#3e2723" opacity="0.4" />
                      <circle cx="110" cy="235" r="3" fill="#4e342e" opacity="0.5" />

                      {/* Right Wall - Side soil face and shadow */}
                      <path
                        d="M 250 280 L 460 160 L 460 225 L 250 345 Z"
                        fill="url(#soil-right-grad)"
                      />
                      
                      {/* Right Wall Texture details */}
                      <circle cx="290" cy="295" r="4.5" fill="#2d1c14" opacity="0.7" />
                      <circle cx="360" cy="245" r="3" fill="#3e2723" opacity="0.5" />
                      <circle cx="410" cy="205" r="5" fill="#2d1c14" opacity="0.6" />

                      {/* Front Center Edge Crease Highlight line */}
                      <line x1="250" y1="280" x2="250" y2="345" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />

                      {/* Top Face - Flat grass cap rhombus */}
                      <path
                        d="M 250 40 L 460 160 L 250 280 L 40 160 Z"
                        fill="url(#grass-top-grad)"
                      />

                      {/* Grass Thickness highlight lip (rim bevel) */}
                      <path
                        d="M 40 160 L 250 280 L 250 288 L 40 168 Z"
                        fill="#689f38"
                      />
                      <path
                        d="M 250 280 L 460 160 L 460 168 L 250 288 Z"
                        fill="#4e7e26"
                      />

                      {/* Visual Grass Tufts scatter along front borders */}
                      <path d="M 60 160 L 63 154 L 66 160 M 120 195 L 123 189 L 126 195 M 180 235 L 183 228 M 183 228 L 186 235 M 340 210 L 343 204 L 346 210 M 410 175 L 413 169 L 416 175" stroke="#9ccc65" strokeWidth="1.5" fill="none" opacity="0.8" />

                      {/* Grid Lines - dividing the grass rhombus into a 5x5 layout */}
                      {/* Parallel to left-front */}
                      <line x1="82" y1="136" x2="292" y2="256" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="124" y1="112" x2="334" y2="232" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="166" y1="88" x2="376" y2="208" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="208" y1="64" x2="418" y2="184" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Parallel to right-front */}
                      <line x1="82" y1="184" x2="292" y2="64" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="124" y1="208" x2="334" y2="88" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="166" y1="232" x2="376" y2="112" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="208" y1="256" x2="418" y2="136" stroke="rgba(255,255,255,0.32)" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Definitions of beautiful 3D side gradient tags */}
                      <defs>
                        <linearGradient id="grass-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9ccc65" />
                          <stop offset="50%" stopColor="#7cb342" />
                          <stop offset="100%" stopColor="#558b2f" />
                        </linearGradient>

                        <linearGradient id="soil-left-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#8d6e63" />
                          <stop offset="15%" stopColor="#6d4c41" />
                          <stop offset="100%" stopColor="#3e2723" />
                        </linearGradient>

                        <linearGradient id="soil-right-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6d4c41" />
                          <stop offset="15%" stopColor="#5d4037" />
                          <stop offset="100%" stopColor="#271510" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Interactive Billboard Overlay Layer for Plants and Empty Slots */}
                    {Array.from({ length: 25 }).map((_, index) => {
                      const r = Math.floor(index / 5);
                      const c = index % 5;
                      const treeIndex = forestPage * 25 + index;
                      const hasTree = treeIndex < forest.length;
                      
                      // Calculate the exact center of tile (r, c)
                      const u = r + 0.5;
                      const v = c + 0.5;
                      const x = 40 + u * 42 + v * 42;
                      const y = 160 - u * 24 + v * 24;

                      const leftPercent = (x / 500) * 100;
                      const topPercent = (y / 400) * 100;

                      if (hasTree) {
                        const tree = forest[treeIndex];
                        const species = PLANT_SPECIES.find(p => p.id === tree.speciesId);
                        const isDead = tree.isWithered;
                        const dateLabel = new Date(tree.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                        return (
                          <div
                            key={tree.id}
                            className="absolute z-10 select-none group focus:outline-none"
                            style={{
                              left: `${leftPercent}%`,
                              top: `${topPercent}%`,
                              transform: 'translate(-50%, -85%)',
                            }}
                          >
                            {/* Upright billboard plant emoji */}
                            <motion.div
                              initial={{ scale: 0, y: 15 }}
                              animate={{ scale: 1, y: 0 }}
                              whileHover={{ scale: 1.25, y: -5, filter: 'drop-shadow(0 15px 12px rgba(0,0,0,0.35))' }}
                              transition={{ type: 'spring', stiffness: 220, damping: 15 }}
                              className="cursor-pointer text-4xl sm:text-5xl relative drop-shadow-md origin-bottom flex items-center justify-center filter"
                            >
                              <span className={cn(isDead && "grayscale opacity-75 contrast-75 brightness-75")}>
                                {isDead ? '🍂' : (species?.emoji || '🌳')}
                              </span>

                              {/* Tiny pulse effect for high value focus tree */}
                              {!isDead && tree.durationMinutes >= 45 && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                              )}
                            </motion.div>

                            {/* Precise Hover tooltip Card facing user */}
                            <div className="absolute pointer-events-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bottom-full mb-3 left-1/2 -translate-x-1/2 z-40 bg-popover text-popover-foreground text-[10px] p-3 rounded-2xl shadow-2xl border border-foreground/10 w-44 backdrop-blur-md">
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-popover" />
                              <p className="font-extrabold text-foreground truncate">
                                {isDead ? 'Abandoned Session' : (species?.name || 'Grown Focus Plant')}
                              </p>
                              <p className="text-[9px] font-mono mt-0.5 text-ctu-maroon">📚 {tree.subjectCode}</p>
                              <p className="text-[9px] font-semibold text-foreground/50 truncate mb-1">{tree.subjectName}</p>
                              <div className="flex justify-between items-center text-[8px] font-extrabold text-foreground/45 border-t border-foreground/5 pt-1 mt-1.5">
                                <span className="flex items-center gap-0.5 text-emerald-500">⌛ {tree.durationMinutes}m</span>
                                <span>🗓️ {dateLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Empty slot - show soft trigger representing available fertile soil
                        return (
                          <div
                            key={`empty-${index}`}
                            className="absolute z-5 group cursor-pointer"
                            style={{
                              left: `${leftPercent}%`,
                              top: `${topPercent}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            onClick={() => setActivePane('timer')}
                          >
                            {/* A soft, transparent visual boundary outline on the soil ground surface */}
                            <div className="w-6 h-3 rounded-full border border-dashed border-white/15 bg-black/5 hover:border-amber-400/40 hover:bg-amber-400/10 transition-all duration-300 flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-amber-300 font-mono font-black scale-75 leading-none">
                                +
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })}

                    {/* Floating Sprout and Guide when island is completely empty */}
                    {forest.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="bg-background/95 border border-foreground/10 px-5 py-4 rounded-3xl shadow-2xl text-center pointer-events-auto max-w-[280px] backdrop-blur-lg scale-90 sm:scale-100 -translate-y-6">
                          <Sprout className="mx-auto text-emerald-400 animate-bounce mb-2" size={32} />
                          <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-1">Untouched Soil</h4>
                          <p className="text-[10px] text-foreground/50 leading-relaxed font-semibold">
                            Complete focus study blocks to plant unique flora on this 3D isometric garden island!
                          </p>
                          <button
                            onClick={() => setActivePane('timer')}
                            className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] tracking-widest uppercase rounded-xl active:scale-95 transition-all shadow-md"
                          >
                            Plant My First Seed
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            )}

            {/* PANE VIEW 3: COMPREHENSIVE STATS & CHARTS */}
            {activePane === 'stats' && (
              <div className="w-full relative z-10 space-y-6 text-left" id="stats-screen-pane">
                <div className="flex items-center gap-3 border-b border-foreground/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-ctu-gold/10 flex items-center justify-center text-ctu-gold">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Academia Focus Metrics</h3>
                    <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-bold">Your cumulative study metrics</p>
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35 block mb-1">Total Mins</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-foreground">{statsSummary.totalMinutes}</span>
                  </div>
                  <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35 block mb-1">Sessions</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-ctu-gold">{statsSummary.totalBlocks}</span>
                  </div>
                  <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/35 block mb-1">Streak</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">
                      {statsSummary.streak} <span className="text-[10px] font-bold block uppercase text-foreground/50">Days</span>
                    </span>
                  </div>
                </div>

                {/* Subjects Allocation progress block matrix */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 italic">Focus Allocation across CTU topics</h4>
                  
                  {statsSummary.subjectArray.length > 0 ? (
                    <div className="space-y-3">
                      {statsSummary.subjectArray.map((sub, idx) => {
                        const totalFocusMinsAll = statsSummary.totalMinutes || 1;
                        const percentage = Math.round((sub.minutes / totalFocusMinsAll) * 100);
                        return (
                          <div key={idx} className="space-y-1 bg-foreground/[0.01] p-3.5 rounded-2xl border border-foreground/5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-extrabold text-foreground tracking-tight">{sub.code} - {sub.name}</span>
                              <span className="font-mono font-black text-ctu-maroon">{sub.minutes} mins ({percentage}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
                              <div
                                className="h-full bg-ctu-maroon rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-foreground/[0.01] border border-dashed border-foreground/10 rounded-2xl">
                      <Clock size={32} className="mx-auto text-foreground/15 mb-2" />
                      <p className="text-xs text-foreground/40 font-semibold italic">Start and complete focus sessions to build metrics!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PANE VIEW 4: CHRONOLOGICAL FLUSH LOGS */}
            {activePane === 'logs' && (
              <div className="w-full relative z-10 space-y-5 text-left" id="logs-screen-pane">
                <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ctu-maroon/10 flex items-center justify-center text-ctu-maroon">
                      <History size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Chronology</h3>
                      <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-bold">Chronological logs sheets</p>
                    </div>
                  </div>
                  
                  {(logs.length > 0 || forest.length > 0) && (
                    <button
                      onClick={clearLogsHistory}
                      className="text-[10px] font-black uppercase tracking-wider text-destructive hover:scale-102 transition-all tap-target flex items-center gap-1.5 p-2 bg-destructive/5 rounded-xl border border-destructive/10"
                    >
                      <Trash2 size={13} />
                      Purge History
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {logs.length > 0 ? (
                    logs.map((log) => {
                      const logDate = new Date(log.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const isWithered = log.notes?.includes('⚠️ WITHERED');
                      return (
                        <div 
                          key={log.id} 
                          className={cn(
                            "p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            isWithered 
                              ? "bg-red-500/[0.01] border-red-500/10" 
                              : "bg-foreground/[0.01] border-foreground/5"
                          )}
                        >
                          <div className="space-y-1">
                            <span className={cn(
                              "text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded inline-block",
                              isWithered ? "bg-red-500/10 text-red-500" : "bg-foreground/5 text-foreground/60"
                            )}>
                              {log.subjectCode}
                            </span>
                            <h4 className={cn("text-xs font-bold text-foreground", isWithered && "text-foreground/50")}>{log.subjectName}</h4>
                            <p className="text-[10px] text-foreground/40 font-medium">Logged: {logDate}</p>
                            {log.notes && (
                              <p className={cn(
                                "text-[10px] font-semibold mt-1 italic",
                                isWithered ? "text-red-500/70" : "text-ctu-gold"
                              )}>
                                {log.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className={cn(
                              "text-sm font-mono font-black",
                              isWithered ? "text-red-500" : "text-emerald-500"
                            )}>
                              {isWithered ? 'FAILED 🍂' : `+${log.durationMinutes} min`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 bg-foreground/[0.01] border border-dashed border-foreground/10 rounded-2xl">
                      <Clock size={32} className="mx-auto text-foreground/15 mb-2" />
                      <p className="text-xs text-foreground/40 font-semibold italic">No focus logs in current history bounds yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Tasks checklist, Goals, and Guidelines */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Section 1: Session Objectives Checklist */}
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 relative overflow-hidden flex flex-col h-full text-left">
            <div className="flex items-center gap-3 border-b border-foreground/5 pb-4 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ctu-gold/10 flex items-center justify-center text-ctu-gold">
                <CheckSquare size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground leading-none">Focus Targets</h3>
                <p className="text-[9px] text-foreground/45 uppercase tracking-widest font-bold mt-1">Declare goals for the present block</p>
              </div>
            </div>

            {/* List scroll scope */}
            <div className="flex-1 space-y-2.5 max-h-[250px] overflow-y-auto mb-4 pr-1">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-left",
                      task.completed 
                        ? "bg-foreground/[0.01] border-foreground/[0.02] line-through text-foreground/35" 
                        : "bg-foreground/[0.02] border-foreground/5 text-foreground hover:bg-foreground/[0.04]"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2.5 w-full text-left font-bold text-xs tap-target min-w-0"
                    >
                      <div className={cn(
                        "shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                        task.completed ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-foreground/20 text-transparent"
                      )}>
                        ✓
                      </div>
                      <span className="truncate">{task.text}</span>
                    </button>

                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-foreground/35 hover:text-destructive transition-all p-1 tap-target shrink-0"
                      title="Delete goal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-foreground/40 italic font-medium">No active goals. Feel free to declare target steps below.</p>
                </div>
              )}
            </div>

            {/* Input submit goal form */}
            <form onSubmit={handleAddTask} className="mt-auto pt-4 border-t border-foreground/5 flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Declare study step targets..."
                className="flex-1 h-10 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-ctu-maroon transition-all"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-ctu-maroon hover:bg-ctu-maroon/90 text-white flex items-center justify-center transition-all shadow-md active:scale-95 tap-target shrink-0"
                title="Add step"
              >
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Section 2: Science of Focus (IE Method Study) tips */}
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 relative overflow-hidden flex flex-col text-left">
            <div className="flex items-center gap-3 border-b border-foreground/5 pb-4 mb-3">
              <div className="w-8 h-8 rounded-lg bg-ctu-maroon/10 flex items-center justify-center text-ctu-maroon">
                <Sparkles size={16} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">IE Focus Principles</h4>
            </div>
            
            <ul className="space-y-3 text-[11px] font-medium leading-relaxed text-foreground/60 italic">
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">1.</span>
                <span><strong>The Garden of Discipline:</strong> Seeing visual plants grow rewards neural pathways, making study chunks easy and lowering procrastination resistance.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">2.</span>
                <span><strong>Environmental Layout Waste:</strong> Clear distractions from task areas. Clean physical desk limits cognitive exhaustion ratios by 24%.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">3.</span>
                <span><strong>Stay Present Commitment:</strong> Giving up means withered trunks. Keep focus high to establish a survival tree forest with green soil indicators.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
