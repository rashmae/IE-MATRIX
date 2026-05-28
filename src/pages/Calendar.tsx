import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  List as ListIcon,
  LayoutGrid,
  Info,
  Download,
  Share2,
  X,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Filter,
  AlertTriangle,
  Tag,
  Circle,
  TrendingUp,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  FolderLock
} from 'lucide-react';
import Sidebar from '@/src/components/layout/Sidebar';
import BottomNav from '@/src/components/layout/BottomNav';
import { User, CalendarEvent } from '@/src/types/index';
import { CALENDAR_EVENTS } from '@/src/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

import { useAuth } from '@/src/context/AuthContext';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';

interface CalendarTask {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'academic' | 'personal' | 'thesis' | 'exam' | 'general';
  description?: string;
  createdAt: string;
}

export default function CalendarPage() {
  const { profile: user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Tasks-related states synced with LocalStorage
  const [tasks, setTasks] = useLocalStorage<CalendarTask[]>('calendar_tasks', [
    {
      id: 'task-1',
      title: 'Formulate Simplex Bounds (OR-HW1)',
      dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.min(28, new Date().getDate())).padStart(2, '0')}`,
      completed: false,
      priority: 'high',
      category: 'academic',
      description: 'Finish questions 1-5 regarding Slack Variables and Corner Point Feasibility.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Analyze RULA Ergonomic Posture Checklist',
      dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.min(28, new Date().getDate() + 1)).padStart(2, '0')}`,
      completed: false,
      priority: 'medium',
      category: 'exam',
      description: 'Audit shoulders, wrists, neck, and upper trunk angles on factory layouts.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-3',
      title: 'Draft plant layout simulation models',
      dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-18`,
      completed: true,
      priority: 'low',
      category: 'thesis',
      description: 'Generate flow process diagrams for Cebu local metal casting lines.',
      createdAt: new Date().toISOString()
    }
  ]);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskCategory, setTaskCategory] = useState<'academic' | 'personal' | 'thesis' | 'exam' | 'general'>('academic');
  const [taskDesc, setTaskDesc] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  // Audio Chime synthesizer for completing tasks!
  const playTaskChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 100);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title!");
      return;
    }

    const finalDueDate = taskDueDate || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    const newTask: CalendarTask = {
      id: `task-${Math.random().toString(36).substring(2, 9)}`,
      title: taskTitle.trim(),
      dueDate: finalDueDate,
      completed: false,
      priority: taskPriority,
      category: taskCategory,
      description: taskDesc.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate('');
    setShowTaskForm(false);
    toast.success("Task scheduled successfully!");
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          playTaskChime();
          toast.success(`Task completed: "${t.title}" 🎉`);
        }
        return { ...t, completed: nextCompleted };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.error("Task removed from scheduler.");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return CALENDAR_EVENTS.filter(e => e.date === dateStr);
  };

  const getEventColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic': return 'bg-ctu-maroon';
      case 'event': return 'bg-ctu-gold';
      case 'holiday': return 'bg-green-600';
      case 'reminder': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      <Sidebar user={user} />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-36 lg:pb-10 overflow-x-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl frosted-header font-black tracking-tighter leading-[0.9] py-2">Calendar</h1>
            <p className="text-foreground/40 mt-1 sm:mt-2 text-xs sm:text-base md:text-xl font-medium tracking-tight">Academic schedule for the 2nd Semester AY 2025-2026.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => toast.success("Connected to Google Calendar")}
              className="px-6 py-3 rounded-2xl neumorphic-raised hover:neumorphic-pressed text-xs font-bold text-foreground transition-all flex items-center gap-2 group"
            >
              <Share2 size={16} className="text-ctu-gold group-hover:rotate-12 transition-transform" />
              Sync to Calendar
            </button>
            
            <button 
              onClick={() => toast.success("Calendar exported as .ics")}
              className="p-3 rounded-2xl neumorphic-raised hover:neumorphic-pressed text-foreground transition-all"
              aria-label="Download calendar as iCal file"
            >
              <Download size={20} />
            </button>

            <div className="flex neumorphic-pressed p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('month')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'month' ? "bg-ctu-gold text-white shadow-lg" : "text-foreground/40 hover:text-foreground")}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-ctu-gold text-white shadow-lg" : "text-foreground/40 hover:text-foreground")}
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>
      </div>

        {viewMode === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Calendar Grid */}
            <Card className="neumorphic-card border-none lg:col-span-8" id="calendar-month-grid-wrapper">
              <CardHeader className="flex flex-row items-center justify-between border-b border-foreground/5 pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <CalendarDays className="text-ctu-gold" size={24} />
                  <span>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setCurrentDate(new Date());
                      setSelectedDayEvents(null);
                      setSelectedDate(null);
                    }}
                    className="hidden sm:block px-4 py-2 neumorphic-raised hover:neumorphic-pressed rounded-xl text-[10px] font-black uppercase tracking-widest text-ctu-gold transition-all"
                  >
                    Back to Today
                  </button>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 neumorphic-raised hover:neumorphic-pressed rounded-lg transition-all" aria-label="Previous Month"><ChevronLeft size={20} /></button>
                    <button onClick={nextMonth} className="p-2 neumorphic-raised hover:neumorphic-pressed rounded-lg transition-all" aria-label="Next Month"><ChevronRight size={20} /></button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b border-foreground/5 bg-foreground/[0.01]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-4 text-center text-xs font-bold text-foreground/45 uppercase tracking-widest">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square border-r border-b border-foreground/5 bg-foreground/[0.01]" />
                  ))}
                  {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    
                    const cellDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayTasks = tasks.filter(t => t.dueDate === cellDateStr);
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div 
                        key={day} 
                        onClick={() => {
                          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          setSelectedDate(dateStr);
                          setSelectedDayLabel(new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString(undefined, { dateStyle: 'full' }));
                          setSelectedDayEvents(events);
                        }}
                        className={cn(
                          "aspect-square border-r border-b border-foreground/5 p-1.5 sm:p-2.5 relative group hover:bg-foreground/[0.02] transition-colors cursor-pointer flex flex-col justify-between overflow-hidden",
                          (events.length > 0 || dayTasks.length > 0) && "hover:shadow-inner"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-all",
                            isToday ? "bg-ctu-gold text-white shadow-md scale-110" : "text-foreground/60"
                          )}>
                            {day}
                          </span>
                          
                          {dayTasks.length > 0 && (
                            <span className="text-[9px] font-black font-mono text-ctu-gold bg-ctu-gold/10 px-1 py-0.2 rounded shrink-0">
                              {dayTasks.filter(t => !t.completed).length} Tasks
                            </span>
                          )}
                        </div>

                        {/* Interactive mini view indicators */}
                        <div className="mt-1 space-y-1 overflow-hidden pointer-events-none max-h-[70%]">
                          {/* Standard Events listing dots */}
                          {events.slice(0, 2).map(e => (
                            <div 
                              key={e.id} 
                              className={cn("h-1 rounded-sm w-full opacity-90", getEventColor(e.category))} 
                              title={`Event: ${e.title}`} 
                            />
                          ))}
                          {events.length > 2 && (
                            <p className="text-[8px] text-foreground/30 font-bold leading-none shrink-0">+ {events.length - 2} Events</p>
                          )}
                          
                          {/* Tasks bullet listings (dashed or strike-through styles) */}
                          {dayTasks.slice(0, 2).map(t => (
                            <div 
                              key={t.id} 
                              className={cn(
                                "h-1 rounded-sm w-full border border-current text-[10px] truncate flex items-center gap-1 font-semibold pl-1 uppercase tracking-tighter shrink-0",
                                t.completed 
                                  ? "bg-foreground/10 border-foreground/15 text-foreground/30 line-through scale-95" 
                                  : t.priority === 'high' 
                                    ? "bg-ctu-maroon/10 text-ctu-maroon border-ctu-maroon" 
                                    : t.priority === 'medium' 
                                      ? "bg-ctu-gold/15 text-ctu-gold border-ctu-gold" 
                                      : "bg-blue-500/10 text-blue-500 border-blue-400"
                              )}
                              title={`Task: ${t.title}`}
                            >
                              <span className="text-[6px] shrink-0">✓</span>
                              <span className="truncate text-[7px] font-mono">{t.title}</span>
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <p className="text-[8px] text-ctu-gold/55 font-bold leading-none shrink-0">+ {dayTasks.length - 2} Work Items</p>
                          )}
                        </div>

                        {(events.length > 0 || dayTasks.length > 0) && (
                          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-ctu-gold animate-pulse" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Side Panel: Integrated Google Tasks list & Legend */}
            <div className="lg:col-span-4 space-y-8 flex flex-col" id="calendar-google-tasks-drawer">
              
              {/* INTERACTIVE TO DO LIST PANEL (The Google Calendar Tasks Drawer equivalent!) */}
              <div className="neumorphic-card p-5 sm:p-6 bg-foreground/[0.01] border border-foreground/5 rounded-[2rem] flex flex-col relative overflow-hidden">
                <div className="absolute w-32 h-32 blur-[4rem] bg-ctu-gold/10 -top-10 -right-10 rounded-full opacity-40 pointer-events-none" />
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-foreground/5 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-ctu-gold/10 flex items-center justify-center text-ctu-gold shrink-0">
                      <CheckSquare size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-foreground leading-none">My Task List</h3>
                      <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-bold mt-0.5">
                        {tasks.filter(t => !t.completed).length} pending allocations
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className={cn(
                      "p-2 rounded-xl transition-all tap-target border border-foreground/5 flex items-center justify-center",
                      showTaskForm ? "bg-destructive/10 text-destructive" : "bg-ctu-gold/10 text-ctu-gold hover:bg-ctu-gold/20"
                    )}
                    title="Add new to-do task"
                  >
                    {showTaskForm ? <X size={15} /> : <Plus size={15} />}
                  </button>
                </div>

                {/* Sub Quick-Add task overlay panel */}
                <AnimatePresence>
                  {showTaskForm && (
                    <motion.form 
                      onSubmit={handleAddTask}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-foreground/[0.02] p-4 rounded-2xl border border-foreground/5 mb-4 flex flex-col gap-3"
                    >
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-ctu-gold italic flex items-center gap-1">
                        <Plus size={10} /> Schedule Google task
                      </h4>
                      <div>
                        <input
                          type="text"
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="What needs to be done?"
                          className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/35 focus:outline-none focus:border-ctu-maroon transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Due Date</label>
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={(e) => setTaskDueDate(e.target.value)}
                            className="w-full h-9 px-2 text-xs font-semibold rounded-lg bg-background border border-foreground/10 text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Category</label>
                          <select
                            value={taskCategory}
                            onChange={(e) => setTaskCategory(e.target.value as any)}
                            className="w-full h-9 px-2 text-[10px] font-bold rounded-lg bg-background border border-foreground/10 text-foreground"
                          >
                            <option value="academic">💼 Academic</option>
                            <option value="exam">📝 Exam study</option>
                            <option value="thesis">🎓 Thesis lab</option>
                            <option value="personal">🏠 Personal</option>
                            <option value="general">📎 General</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-foreground/45 col-span-3">Priority</label>
                        {(['high', 'medium', 'low'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTaskPriority(p)}
                            className={cn(
                              "py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border",
                              taskPriority === p 
                                ? "bg-ctu-gold/25 border-ctu-gold text-ctu-gold font-black" 
                                : "bg-transparent border-foreground/5 text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <div>
                        <textarea
                          placeholder="Add details, links, or criteria notes..."
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 text-xs font-semibold rounded-xl bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none focus:border-ctu-maroon transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-9 rounded-xl bg-ctu-gold text-white text-xs font-black uppercase tracking-widest shadow-md hover:bg-ctu-gold/95 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} />
                        Add to Calendar
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Filter and search controllers */}
                <div className="space-y-3 mb-4 bg-foreground/[0.01] p-2 rounded-xl border border-foreground/5">
                  <div className="flex gap-2 relative">
                    <input
                      type="text"
                      placeholder="Search Scheduled tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 px-2.5 pl-7 text-[10px] font-semibold rounded-lg bg-background border border-foreground/10 text-foreground placeholder-foreground/30 focus:outline-none"
                    />
                    <Filter className="absolute left-2.5 top-2.5 text-foreground/30" size={12} />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-foreground/45 hover:text-foreground text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 items-center justify-between">
                    {/* Status filter tabs */}
                    <div className="flex bg-foreground/5 rounded-md p-0.5 shrink-0">
                      {[
                        { id: 'pending', label: 'Pending' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'all', label: 'All' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setStatusFilter(tab.id as any)}
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all",
                            statusFilter === tab.id ? "bg-background text-foreground shadow-sm font-black" : "text-foreground/40 hover:text-foreground"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Category quick filters */}
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-transparent text-[8px] font-black text-foreground/50 border-none outline-none focus:ring-0 cursor-pointer text-right uppercase tracking-wider"
                    >
                      <option value="all">📁 All Roles</option>
                      <option value="academic">Academic</option>
                      <option value="exam">Exams</option>
                      <option value="thesis">Thesis</option>
                      <option value="personal">Personal</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                {/* Tasks List container */}
                <div className="flex-1 space-y-3 max-h-[290px] overflow-y-auto pr-1">
                  {(() => {
                    const filteredTasks = tasks.filter(t => {
                      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
                      if (statusFilter === 'pending' && t.completed) return false;
                      if (statusFilter === 'completed' && !t.completed) return false;
                      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                      return true;
                    });

                    return filteredTasks.length > 0 ? (
                      filteredTasks.map(task => {
                        const daysOffset = Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        let dateTag = task.dueDate;
                        if (daysOffset === 0) dateTag = 'Today';
                        else if (daysOffset === 1) dateTag = 'Tomorrow';

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "p-3 rounded-xl border flex gap-3 transition-all relative text-left group",
                              task.completed 
                                ? "bg-foreground/[0.01] border-foreground/[0.03] text-foreground/35 line-through opacity-75" 
                                : "bg-foreground/[0.03] border-foreground/5 text-foreground hover:bg-foreground/[0.05]"
                            )}
                          >
                            {/* Priority ribbon highlight */}
                            <div className={cn(
                              "absolute top-0 bottom-0 left-0 w-1 rounded-l-md shrink-0",
                              task.completed 
                                ? "bg-foreground/20" 
                                : task.priority === 'high' 
                                  ? "bg-ctu-maroon" 
                                  : task.priority === 'medium' 
                                    ? "bg-ctu-gold" 
                                    : "bg-blue-500"
                            )} />

                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="self-start mt-0.5 text-ctu-gold shrink-0 transition-transform hover:scale-105 active:scale-90 tap-target"
                              title={task.completed ? "Mark pending" : "Complete task"}
                            >
                              {task.completed ? <CheckCircle className="text-green-600 animate-in zoom-in-50" size={16} /> : <Circle className="text-foreground/30" size={16} />}
                            </button>

                            {/* Text detail */}
                            <div className="flex-1 space-y-1 min-w-0">
                              <h4 className={cn("text-xs font-bold leading-tight truncate text-foreground", task.completed && "text-foreground/45")}>
                                {task.title}
                              </h4>
                              
                              {task.description && (
                                <p className="text-[10px] text-foreground/45 leading-relaxed font-semibold pr-3 truncate group-hover:whitespace-normal group-hover:break-words transition-all">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge className={cn("text-[8px] uppercase font-black px-1.5 py-0 border-none",
                                  task.category === 'academic' ? 'bg-ctu-maroon/10 text-ctu-maroon' :
                                  task.category === 'exam' ? 'bg-ctu-gold/15 text-ctu-gold' :
                                  task.category === 'thesis' ? 'bg-green-600/10 text-green-600' :
                                  'bg-foreground/10 text-foreground/60'
                                )}>
                                  {task.category}
                                </Badge>

                                <span className={cn(
                                  "text-[8px] font-mono font-extrabold flex items-center gap-1",
                                  daysOffset <= 1 && !task.completed ? "text-ctu-maroon animate-pulse font-black" : "text-foreground/35"
                                )}>
                                  📅 {dateTag}
                                </span>
                              </div>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 self-center rounded-lg bg-destructive/[0.03] border border-destructive/5 text-destructive hover:bg-destructive/15 hover:scale-102 transition-all tap-target shrink-0"
                              title="Delete task item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 bg-foreground/[0.01] border border-dashed border-foreground/5 rounded-2xl">
                        <CheckCircle2 size={24} className="mx-auto text-foreground/15 mb-2" />
                        <p className="text-[10px] text-foreground/40 font-semibold italic">No matching scheduled tasks found.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Legend Side Panel */}
              <div className="neumorphic-card p-6">
                <h3 className="text-base font-bold flex items-center gap-2.5 mb-5">
                  <Info size={18} className="text-ctu-gold shrink-0" />
                  <span>Calendar Categories</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Academic', color: 'bg-ctu-maroon' },
                    { label: 'Events/Work', color: 'bg-ctu-gold' },
                    { label: 'Holidays', color: 'bg-green-600' },
                    { label: 'Reminders', color: 'bg-blue-500' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-2.5 text-xs font-bold text-foreground/70">
                      <div className={cn("w-3 h-3 rounded-full shadow-sm shrink-0", l.color)} />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Happenings & Due Items */}
              <div className="neumorphic-card p-6 flex-1">
                <h3 className="text-base font-bold mb-5 flex items-center gap-2 justify-between">
                  <span>Today's Commitments</span>
                  <span className="text-[9px] font-mono font-black italic bg-ctu-maroon/10 text-ctu-maroon px-2 py-0.5 rounded">
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </h3>
                
                <div className="space-y-4 max-h-[250px] overflow-y-auto">
                  {(() => {
                    const todayEventsStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    const todayEventsList = CALENDAR_EVENTS.filter(e => e.date === todayEventsStr);
                    const todayTasksList = tasks.filter(t => t.dueDate === todayEventsStr && !t.completed);

                    return (todayEventsList.length > 0 || todayTasksList.length > 0) ? (
                      <>
                        {/* Render standard events */}
                        {todayEventsList.map(e => (
                          <div key={e.id} className="p-4 rounded-xl neumorphic-pressed border-l-4 border-ctu-maroon">
                            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-ctu-maroon bg-ctu-maroon/5 px-2 py-0.5 rounded inline-block mb-1.5">Official Event</span>
                            <h4 className="text-xs font-bold text-foreground">{e.title}</h4>
                            <p className="text-[10px] text-foreground/60 mt-1 font-medium">{e.description}</p>
                          </div>
                        ))}

                        {/* Render active tasks due today */}
                        {todayTasksList.map(t => (
                          <div key={t.id} className="p-4 rounded-xl neumorphic-pressed border-l-4 border-ctu-gold flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-ctu-gold bg-ctu-gold/10 px-2 py-0.5 rounded inline-block mb-1.5">Your Tasks due</span>
                              <h4 className="text-xs font-bold text-foreground">{t.title}</h4>
                              {t.description && <p className="text-[10px] text-foreground/60 mt-1 truncate max-w-[180px]">{t.description}</p>}
                            </div>
                            <button
                              onClick={() => handleToggleTask(t.id)}
                              className="p-1 rounded bg-ctu-gold/10 text-ctu-gold hover:bg-ctu-gold/20 shrink-0 tap-target"
                              title="Quick completed check"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-xs text-foreground/45 italic font-medium py-6 text-center">No official events or pending tasks scheduled for today.</p>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {CALENDAR_EVENTS.map((event) => (
              <Card key={event.id} className="neumorphic-card border-none overflow-hidden">
                <CardContent className="p-0 flex">
                  <div className={cn("w-3 shrink-0", getEventColor(event.category))} />
                  <div className="p-8 flex-1 flex items-center gap-8">
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-3xl neumorphic-pressed shrink-0">
                      <span className="text-xs font-bold uppercase text-foreground/40 tracking-widest">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-3xl font-bold text-foreground leading-none mt-1">{new Date(event.date).getDate()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={cn("text-[10px] uppercase font-bold border-none px-3 py-1 rounded-full", 
                          event.category === 'academic' ? 'bg-ctu-maroon/10 text-ctu-maroon' :
                          event.category === 'holiday' ? 'bg-green-600/10 text-green-600' :
                          'bg-ctu-gold/10 text-ctu-gold'
                        )}>
                          {event.category}
                        </Badge>
                        <span className="text-xs text-foreground/40 font-bold">{new Date(event.date).getFullYear()}</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                      <p className="text-sm text-foreground/60 mt-1 font-medium">{event.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <DialogContent className="sm:max-w-[450px] h-[85dvh] overflow-y-auto overscroll-contain neumorphic-card border-none p-6 sm:p-8">
            <DialogHeader className="border-b border-foreground/5 pb-4">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">{selectedDayLabel}</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-ctu-gold mt-1.5 flex items-center gap-1.5">
                <CalendarIcon size={12} />
                Day Schedule & Task Allocations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {/* Event Section */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 flex items-center gap-1.5 border-b border-foreground/5 pb-1">
                  <Badge className="bg-ctu-maroon text-white font-mono text-[8px] px-1 py-0 pointer-events-none">CTU</Badge>
                  Official Institutional Events
                </h4>

                {(() => {
                  const dayEvents = selectedDate ? CALENDAR_EVENTS.filter(e => e.date === selectedDate) : [];
                  return dayEvents.length > 0 ? (
                    <div className="space-y-4">
                      {dayEvents.map(event => (
                        <div key={event.id} className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/5 border-l-4 border-ctu-maroon">
                          <h5 className="text-xs sm:text-sm font-black text-foreground mb-1">{event.title}</h5>
                          <p className="text-[11px] text-foreground/60 leading-relaxed font-semibold">{event.description}</p>
                          <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-foreground/5">
                            <div className="flex items-center gap-2 text-[9px] font-bold text-foreground/45 uppercase shrink-0">
                              <Clock size={12} className="text-ctu-gold shrink-0" />
                              Whole Day Schedule
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-[9px] font-bold text-foreground/45 uppercase shrink-0">
                                <MapPin size={12} className="text-ctu-maroon shrink-0" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-foreground/35 italic font-medium py-3">No institutional events scheduled for this day.</p>
                  );
                })()}
              </div>

              {/* Tasks Section */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 flex items-center gap-1.5 border-b border-foreground/5 pb-1 justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-ctu-gold" />
                    Personal Tasks & Due Work
                  </span>
                  {selectedDate && (
                    <button
                      onClick={() => {
                        setTaskDueDate(selectedDate);
                        setShowTaskForm(true);
                      }}
                      className="text-[9px] font-black uppercase tracking-wider text-ctu-gold underline hover:no-underline"
                    >
                      + Add Task
                    </button>
                  )}
                </h4>

                {(() => {
                  const dayTasks = selectedDate ? tasks.filter(t => t.dueDate === selectedDate) : [];
                  return dayTasks.length > 0 ? (
                    <div className="space-y-3">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={cn(
                            "p-3 rounded-xl border flex gap-3 items-center justify-between transition-all",
                            task.completed ? "bg-foreground/[0.01] border-foreground/[0.03] text-foreground/35 line-through opacity-75" : "bg-foreground/[0.03] border-foreground/5"
                          )}
                        >
                          <div className="flex gap-2.5 items-center min-w-0">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="text-ctu-gold self-center tap-target shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle className="text-green-600 shrink-0" size={16} />
                              ) : (
                                <Circle className="text-foreground/30 shrink-0" size={16} />
                              )}
                            </button>
                            <div className="min-w-0">
                              <p className={cn("text-xs font-bold truncate text-foreground", task.completed && "text-foreground/45")}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-[10px] text-foreground/45 truncate max-w-[200px] font-medium leading-none">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn("text-[8px] uppercase font-black px-1 py-0 border-none shrink-0",
                              task.priority === 'high' ? 'bg-ctu-maroon text-white' : 'bg-ctu-gold text-foreground'
                            )}>
                              {task.priority}
                            </Badge>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-all shrink-0 tap-target"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center rounded-xl bg-foreground/[0.01] border border-dashed border-foreground/5">
                      <p className="text-[11px] text-foreground/40 italic font-medium">No tasks scheduled for this day.</p>
                      <button
                        onClick={() => {
                          if (selectedDate) {
                            setTaskDueDate(selectedDate);
                            setShowTaskForm(true);
                          }
                        }}
                        className="text-[10px] font-bold text-ctu-gold underline mt-1 block mx-auto"
                      >
                        Create a Task to study
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}
