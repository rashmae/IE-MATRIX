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
  RefreshCw,
  Award
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

export default function PomodoroTimer() {
  const { profile: user } = useAuth();

  // Timer settings & states
  const [mode, setMode] = useState<TimerMode>('focus');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalDuration, setTotalDuration] = useState(25 * 60); // Total seconds for active mode

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
  const [activePane, setActivePane] = useState<'timer' | 'stats' | 'logs'>('timer');

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
      
      gain.gain.setValueAtTime(0.012, ctx.currentTime); // Very low, subtle ambient volume
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

      // First note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
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
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5 high climax
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.8);
      }, 200);

    } catch (e) {
      console.warn('Completion chime audio error:', e);
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

  // Log session to local state and Firestore Database
  const logSessionCompleted = async (sessionMode: TimerMode, durationMin: number) => {
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

    const newLog: PomodoroLog = {
      id: Math.random().toString(36).substring(2, 9),
      subjectCode: subCode,
      subjectName: subName,
      durationMinutes: durationMin,
      timestamp: new Date().toISOString(),
      mode: sessionMode,
      notes: tasks.filter(t => t.completed).map(t => t.text).join(', ') || undefined
    };

    // Update local state
    setLogs(prev => [newLog, ...prev]);

    // Update Firebase Firestore if user is logged in
    if (user?.uid) {
      try {
        await addDoc(collection(db, 'pomodoroLogs'), {
          userId: user.uid,
          subjectCode: subCode,
          subjectName: subName,
          durationMinutes: durationMin,
          timestamp: serverTimestamp(),
          mode: sessionMode,
          notes: newLog.notes || "",
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Failed to save log to clouds:', err);
      }
    }
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    playCompletedAlarm();

    if (mode === 'focus') {
      toast.success(`Incredible focus lock! You completed a ${focusConfig}-minute focus block on: ${selectedSubjectId === 'general' ? (customSubjectText || 'General IE') : IE_SUBJECTS.find(s => s.id === selectedSubjectId)?.name}`, {
        duration: 6000
      });
      logSessionCompleted('focus', focusConfig);
      resetTimer('shortBreak');
    } else if (mode === 'shortBreak') {
      toast.info('Break completed! Back to the focus block.', { duration: 6000 });
      resetTimer('focus');
    } else if (mode === 'longBreak') {
      toast.info('Long break ended! Ready to optimize more workflows?', { duration: 6000 });
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
    // Resume context in browser if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsActive(!isActive);
  };

  // Skip state
  const skipTimer = () => {
    if (window.confirm("Do you want to skip the current timer?")) {
      if (mode === 'focus') {
        resetTimer('shortBreak');
      } else {
        resetTimer('focus');
      }
    }
  };

  // Calculation for progress circle stroke layout
  const currentTotalSecondsLeft = minutes * 60 + seconds;
  const progressRatio = totalDuration > 0 ? (totalDuration - currentTotalSecondsLeft) / totalDuration : 0;
  const strokeDashOffset = strokeDashArray * (1 - progressRatio);

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

    // Days streak (simplified)
    const uniqueDates = new Set(focusLogs.map(l => l.timestamp.split('T')[0]));
    const streak = uniqueDates.size;

    // Subjects break down percentages
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
      subjectArray
    };
  }, [logs]);

  // Clean log statistics history
  const clearLogsHistory = () => {
    if (window.confirm("Permanently clear your focused study history? This action is irreversible.")) {
      setLogs([]);
      localStorage.removeItem('pomodoro_logs');
      toast.success("History logs database formatted successfully!");
    }
  };

  return (
    <div className="w-full" id="pomodoro-timer-utility-root">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Timer Interface */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 sm:p-10 relative overflow-hidden flex flex-col items-center">
            
            {/* Ambient visual background glow matching state */}
            <div className={cn(
              "absolute w-72 h-72 blur-[9rem] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none transition-all duration-1000",
              mode === 'focus' ? "bg-ctu-maroon" : mode === 'shortBreak' ? "bg-green-500" : "bg-blue-500"
            )} />

            {/* Dashboard Navigation Tabs inside the widget */}
            <div className="flex gap-1.5 p-1 bg-foreground/[0.03] backdrop-blur-xl rounded-2xl w-full max-w-sm mb-8 relative z-10 border border-foreground/5">
              <button
                onClick={() => setActivePane('timer')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'timer'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/80"
                )}
              >
                <Timer size={14} />
                <span>Timer</span>
              </button>
              <button
                onClick={() => setActivePane('stats')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'stats'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/80"
                )}
              >
                <BarChart2 size={14} />
                <span>Stats</span>
              </button>
              <button
                onClick={() => setActivePane('logs')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all tap-target",
                  activePane === 'logs'
                    ? "bg-ctu-maroon text-white shadow-md shadow-ctu-maroon/20"
                    : "text-foreground/45 hover:text-foreground/80"
                )}
              >
                <History size={14} />
                <span>Logs</span>
              </button>
            </div>

            {/* Pane View 1: ACTIVE TIMING ENGINE */}
            {activePane === 'timer' && (
              <div className="w-full flex flex-col items-center relative z-10" id="timer-screen-pane">
                
                {/* Mode Selectors */}
                <div className="flex gap-2 mb-8">
                  {[
                    { id: 'focus', label: 'Focus Block', icon: Flame, color: 'text-ctu-gold' },
                    { id: 'shortBreak', label: 'Short Break', icon: CoffeeCup, color: 'text-green-500' },
                    { id: 'longBreak', label: 'Long Break', icon: PalmTreeIcon, color: 'text-blue-400' }
                  ].map(item => {
                    const isSelected = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => resetTimer(item.id as TimerMode)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border border-transparent tap-target",
                          isSelected 
                            ? "bg-foreground/10 text-foreground shadow-inner border-foreground/5 scale-105 font-black" 
                            : "bg-transparent text-foreground/40 hover:text-foreground/85"
                        )}
                      >
                        <span className={item.color}>●</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Circular Countdown Progress Gauge Visual */}
                <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
                  
                  {/* Background Track SVG circle */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="144"
                      cy="144"
                      r={subCircleRadius}
                      className="stroke-foreground/[0.03] fill-none"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="144"
                      cy="144"
                      r={subCircleRadius}
                      className={cn(
                        "fill-none transition-all duration-300",
                        mode === 'focus' ? "stroke-ctu-maroon" : mode === 'shortBreak' ? "stroke-green-500" : "stroke-blue-500"
                      )}
                      strokeWidth="8"
                      strokeDasharray={strokeDashArray}
                      strokeDashoffset={strokeDashOffset}
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Digital Clock Dial display text */}
                  <div className="absolute flex flex-col items-center select-none">
                    <motion.span 
                      key={`${minutes}-${seconds}`}
                      initial={{ scale: 0.96, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-6xl sm:text-7xl font-mono font-black tracking-tight leading-[1] text-foreground"
                    >
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </motion.span>
                    
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-foreground/35 mt-2 italic">
                      {mode === 'focus' ? 'Deep Work Processing' : 'Relax & Recharge'}
                    </span>
                  </div>
                </div>

                {/* Sub-incremental precision dial controls */}
                <div className="flex gap-3 mb-8">
                  <button
                    onClick={() => modifyTime(-60)}
                    className="p-3.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-xs font-bold transition-all border border-foreground/5 tap-target"
                    title="Subtract 1 min"
                  >
                    - 1m
                  </button>
                  <button
                    onClick={() => modifyTime(60)}
                    className="p-3.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-xs font-bold transition-all border border-foreground/5 tap-target"
                    title="Add 1 min"
                  >
                    + 1m
                  </button>
                  <button
                    onClick={() => modifyTime(300)}
                    className="p-3.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.07] text-foreground/60 hover:text-foreground text-xs font-bold transition-all border border-foreground/5 tap-target"
                    title="Add 5 mins"
                  >
                    + 5m
                  </button>
                </div>

                {/* Core Media Dial Controls (Play, Pause, Reset, Skip, Audio toggles) */}
                <div className="flex items-center gap-5 w-full max-w-sm justify-center mb-8">
                  {/* Sound Alarm Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      "p-3 rounded-xl transition-all tap-target border border-foreground/5",
                      soundEnabled ? "bg-foreground/5 text-foreground/80 hover:bg-foreground/10" : "bg-destructive/10 text-destructive hover:bg-destructive/15"
                    )}
                    title={soundEnabled ? "Sound enabled" : "Muted"}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  {/* Play & Pause Trigger Button */}
                  <button
                    onClick={togglePlay}
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all scale-100 active:scale-95 text-white shadow-xl tap-target",
                      isActive 
                        ? "bg-destructive shadow-destructive/15 hover:bg-destructive/90" 
                        : "bg-ctu-maroon shadow-ctu-maroon/20 hover:scale-[1.05]"
                    )}
                  >
                    {isActive ? <Pause size={26} className="fill-current" /> : <Play size={26} className="fill-current ml-1" />}
                  </button>

                  {/* Reset Timer Button */}
                  <button
                    onClick={() => resetTimer(mode)}
                    className="p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/80 transition-all tap-target border border-foreground/5"
                    title="Reset timer bounds"
                  >
                    <RotateCcw size={16} />
                  </button>

                  {/* Metronome Ticking Toggle */}
                  <button
                    onClick={() => setTickerEnabled(!tickerEnabled)}
                    className={cn(
                      "p-3 rounded-xl transition-all tap-target border border-foreground/5 text-[10px] font-black tracking-widest uppercase",
                      tickerEnabled ? "bg-ctu-gold/20 text-ctu-gold" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                    )}
                    title="Metronome clicking focus engine"
                  >
                    TIC-TOC
                  </button>
                </div>

                {/* Segment: Session Integration Topic Selection */}
                <div className="w-full max-w-sm border-t border-foreground/5 pt-6 bg-foreground/[0.01] p-4 rounded-3xl border border-foreground/5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-ctu-gold shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 italic">Assign Focus Subject Target</span>
                  </div>
                  
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground tracking-tight focus:outline-none focus:border-ctu-maroon active:opacity-90 transition-all"
                  >
                    <option value="general">💼 General Study / Course Planning</option>
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
                        type="text"
                        placeholder="Enter custom focus milestone name..."
                        value={customSubjectText}
                        onChange={(e) => setCustomSubjectText(e.target.value)}
                        className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-ctu-maroon transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Custom Configuration Section Toggle */}
                <div className="w-full max-w-sm mt-4 text-center">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 hover:text-ctu-gold transition-all"
                  >
                    {showConfig ? 'Hide Custom Configuration' : 'Customize presets length'}
                  </button>

                  <AnimatePresence>
                    {showConfig && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-foreground/[0.01] p-4 rounded-3xl border border-foreground/5 mt-3 grid grid-cols-3 gap-3 text-left"
                      >
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Focus</label>
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
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1">S. Break</label>
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
                          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-1">L. Break</label>
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

            {/* Pane View 2: COMPREHENSIVE STATS & CHARTS */}
            {activePane === 'stats' && (
              <div className="w-full relative z-10 space-y-6" id="stats-screen-pane">
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
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/35 block mb-1">Min Blocked</span>
                    <span className="text-3xl font-mono font-black text-foreground">{statsSummary.totalMinutes}</span>
                  </div>
                  <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/35 block mb-1">Pomodoros</span>
                    <span className="text-3xl font-mono font-black text-ctu-gold">{statsSummary.totalBlocks}</span>
                  </div>
                  <div className="bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/35 block mb-1">Daily Run</span>
                    <span className="text-3xl font-mono font-black text-green-500">{statsSummary.streak} <span className="text-sm font-bold block uppercase mt-0.5 text-foreground/50">Days</span></span>
                  </div>
                </div>

                {/* Subjects Allocation bar chart style matrix representation */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 italic">Focus Distribution Across Subjects</h4>
                  
                  {statsSummary.subjectArray.length > 0 ? (
                    <div className="space-y-4">
                      {statsSummary.subjectArray.map((sub, idx) => {
                        const totalFocusMinsAll = statsSummary.totalMinutes || 1;
                        const percentage = Math.round((sub.minutes / totalFocusMinsAll) * 100);
                        return (
                          <div key={idx} className="space-y-1 bg-foreground/[0.01] p-3 rounded-xl border border-foreground/5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-foreground tracking-tight">{sub.code} - {sub.name}</span>
                              <span className="font-mono font-bold text-foreground/60">{sub.minutes} mins ({percentage}%)</span>
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
                      <p className="text-xs text-foreground/40 font-semibold italic">Start and complete focus sessions to build local stats metrics!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pane View 3: CHRONOLOGICAL FLUSH LOGS */}
            {activePane === 'logs' && (
              <div className="w-full relative z-10 space-y-5" id="logs-screen-pane">
                <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ctu-maroon/10 flex items-center justify-center text-ctu-maroon">
                      <History size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Chronology</h3>
                      <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-bold">Chronological logging sheets</p>
                    </div>
                  </div>
                  
                  {logs.length > 0 && (
                    <button
                      onClick={clearLogsHistory}
                      className="text-xs font-bold uppercase tracking-wider text-destructive hover:scale-102 transition-all tap-target flex items-center gap-1.5 p-2 bg-destructive/5 rounded-xl border border-destructive/10"
                    >
                      <Trash2 size={13} />
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {logs.length > 0 ? (
                    logs.map((log) => {
                      const logDate = new Date(log.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div key={log.id} className="p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded-md inline-block">
                              {log.subjectCode}
                            </span>
                            <h4 className="text-xs font-bold text-foreground">{log.subjectName}</h4>
                            <p className="text-[10px] text-foreground/40 font-medium">Completed: {logDate}</p>
                            {log.notes && (
                              <p className="text-[10px] text-ctu-gold font-semibold mt-1 italic">
                                Goals: "{log.notes}"
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-sm font-mono font-black text-ctu-maroon">+{log.durationMinutes} min</span>
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
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 relative overflow-hidden flex flex-col h-full">
            <div className="flex items-center gap-3 border-b border-foreground/5 pb-4 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ctu-gold/10 flex items-center justify-center text-ctu-gold">
                <CheckSquare size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Active Focus Goals</h3>
                <p className="text-[9px] text-foreground/45 uppercase tracking-widest font-bold">Declare targets for the current block</p>
              </div>
            </div>

            {/* List scroll scope */}
            <div className="flex-1 space-y-2.5 max-h-[300px] overflow-y-auto mb-4 pr-1">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-left",
                      task.completed 
                        ? "bg-foreground/[0.01] border-foreground/5 line-through text-foreground/40" 
                        : "bg-foreground/[0.03] border-foreground/5 text-foreground hover:bg-foreground/[0.05]"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2 w-full text-left font-semibold text-xs tap-target"
                    >
                      <div className="shrink-0 text-ctu-maroon">
                        {task.completed ? <CheckCircleIcon size={16} /> : <CircleIcon size={16} />}
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
                  <p className="text-xs text-foreground/40 italic font-medium">Free of goals! Clear as operations air.</p>
                </div>
              )}
            </div>

            {/* Input submit goal form */}
            <form onSubmit={handleAddTask} className="mt-auto pt-4 border-t border-foreground/5 flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Declare a micro study task..."
                className="flex-1 h-10 px-3.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-ctu-maroon transition-all"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-ctu-maroon hover:bg-ctu-maroon/90 text-white flex items-center justify-center transition-all shadow-md active:scale-95 tap-target"
                title="Add goal step"
              >
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Section 2: Science of Focus (IE Method Study) tips */}
          <div className="neumorphic-card rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/5 p-6 relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 border-b border-foreground/5 pb-4 mb-3">
              <div className="w-8 h-8 rounded-lg bg-ctu-maroon/10 flex items-center justify-center text-ctu-maroon">
                <Sparkles size={16} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">IE Efficiency Rules</h4>
            </div>
            
            <ul className="space-y-3 text-[11px] font-medium leading-relaxed text-foreground/60 italic">
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">1.</span>
                <span><strong>Prone Environmental Waste:</strong> Clean your physical layout before beginning. Work-study proves layout optimization blocks reach fatigue by up to 24%.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">2.</span>
                <span><strong>The Metronome Leverage:</strong> Tapping "TIC-TOC" subtle beats leverages auditory pacing, syncing biological task speeds for deep algorithmic reasoning.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-ctu-gold font-bold">3.</span>
                <span><strong>Observe Rest Allowances:</strong> Industrial fatigue guidelines demand 5 minutes rest per 25-min constant stress loads for continuous cognitive yield.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}

// Icon helper components to prevent missing SVG definitions
function CoffeeCup({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 14} 
      height={size || 14} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

function PalmTreeIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 14} 
      height={size || 14} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M13 8c0-2.76-2.24-5-5-5S3 5.24 3 8" />
      <path d="M13 12c0-2.21-1.79-4-4-4s-4 1.79-4 4" />
      <path d="M13 16c0-1.66-1.34-3-3-3s-3 1.34-3 3" />
      <path d="M18 8c0-2.76 2.24-5 5-5s5 2.24 5 8" />
      <path d="M18 12c0-2.21 1.79-4 4-4s4 1.79 4 4" />
      <path d="M18 16c0-1.66 1.34-3-3-3s-3 1.34-3 3" />
      <path d="M12 2v20" />
      <path d="M12 12c0-2.21 1.79-4 4-4" />
      <path d="M12 16c0-1.66 1.34-3 3-3" />
    </svg>
  );
}

function CircleIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 16} 
      height={size || 16} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function CheckCircleIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 16} 
      height={size || 16} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
