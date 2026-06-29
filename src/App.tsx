import React, { useState, useEffect, useRef } from 'react';
import { Task, Plan, AppState, Persona } from './types';
import { PERSONAS } from './personas';
import PersonaPicker from './components/PersonaPicker';
import TaskForm from './components/TaskForm';
import CalendarView from './components/CalendarView';
import HelpMeStartModal from './components/HelpMeStartModal';
import { RefreshCw, Clock, ArrowLeft, RotateCcw, AlertCircle, Sparkles, Smile } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'replan_state_v1';

// Helper to get current HH:MM
const getSystemTimeHHMM = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Helper to convert HH:MM to minutes
const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getFriendlyErrorMessageOnClient = (personaId: string) => {
  switch (personaId) {
    case 'yandere':
      return {
        message: "Oh no! The planning core is completely overwhelmed by my devotion to you! It seems the system is crashing because of us. Let's wait a minute and try again, just you and me...",
        voiceLine: "Oh no! The system is overwhelmed by my love. Let's wait a moment and try again."
      };
    case 'kuudere':
      return {
        message: "System overload detected. High-demand latency exceeds standard thresholds. Recommendation: Wait 30 seconds and initiate another planning request. I will remain on standby.",
        voiceLine: "System overload detected. Recommendation: Initiate another attempt shortly."
      };
    case 'deredere':
      return {
        message: "Oh dear! The system is super busy right now and feeling a little tired. Don't worry at all, let's take a deep breath and try again in a few moments! You've got this!",
        voiceLine: "Oh dear! The system is super busy. Let's try again in a few moments!"
      };
    case 'chaotic_gremlin':
      return {
        message: "AHAHAHA! The model exploded! Too much chaos for the poor servers to handle! Click that button again and let's see if we can set it on fire!",
        voiceLine: "AHAHAHA! The model exploded! Click that button again!"
      };
    case 'tsundere':
    default:
      return {
        message: "H-hey! The server is completely overloaded right now! It's not like I don't want to plan your day, but you'll have to wait a moment, dummy! Try again in a bit!",
        voiceLine: "H-hey! The server is overloaded! Try again in a bit, dummy!"
      };
  }
};

export default function App() {
  // Core App State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [escalationStage, setEscalationStage] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [driftMinutes, setDriftMinutes] = useState<number>(0);
  const [commentary, setCommentary] = useState<string>('');
  const [shortVoiceLine, setShortVoiceLine] = useState<string>('');

  // New states for tracking ignored replans & user engagement
  const [consecutiveIgnoredReplans, setConsecutiveIgnoredReplans] = useState<number>(0);
  const [engagedSinceLastReplan, setEngagedSinceLastReplan] = useState<boolean>(false);
  const [driftTriggeredThisPlan, setDriftTriggeredThisPlan] = useState<boolean>(false);

  // Simulated Time (HH:MM) - starts at actual system time, can be overridden by user
  const [simulatedTime, setSimulatedTime] = useState<string>(() => {
    // Default to a typical starting morning hour if system time is late, but system time is fine
    const sys = getSystemTimeHHMM();
    return sys;
  });
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // App control states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReplanning, setIsReplanning] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [unlockFeedback, setUnlockFeedback] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Help Me Start Modal States
  const [helpTask, setHelpTask] = useState<Task | null>(null);
  const [helpOutline, setHelpOutline] = useState<string>('');
  const [helpFirstStep, setHelpFirstStep] = useState<string>('');
  const [helpLoading, setHelpLoading] = useState<boolean>(false);

  // General server error display
  const [serverError, setServerError] = useState<string | null>(null);

  // Refs for tracking previous stage and statuses to prevent infinite loop triggers
  const prevStageRef = useRef<number>(0);
  const prevTimeRef = useRef<string>('');

  // 1. Load state from localStorage on startup
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.currentPlan) setCurrentPlan(parsed.currentPlan);
        if (parsed.selectedPersona) setSelectedPersona(parsed.selectedPersona);
        if (parsed.escalationStage !== undefined) {
          setEscalationStage(parsed.escalationStage);
          prevStageRef.current = parsed.escalationStage;
        }
        if (parsed.isLocked !== undefined) setIsLocked(parsed.isLocked);
        if (parsed.driftMinutes !== undefined) setDriftMinutes(parsed.driftMinutes);
        if (parsed.commentary) setCommentary(parsed.commentary);
        if (parsed.shortVoiceLine) setShortVoiceLine(parsed.shortVoiceLine);
        if (parsed.simulatedTime) setSimulatedTime(parsed.simulatedTime);
        if (parsed.consecutiveIgnoredReplans !== undefined) setConsecutiveIgnoredReplans(parsed.consecutiveIgnoredReplans);
        if (parsed.engagedSinceLastReplan !== undefined) setEngagedSinceLastReplan(parsed.engagedSinceLastReplan);
        if (parsed.driftTriggeredThisPlan !== undefined) setDriftTriggeredThisPlan(parsed.driftTriggeredThisPlan);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
  }, []);

  // 2. Persist state to localStorage on changes
  useEffect(() => {
    const state = {
      tasks,
      currentPlan,
      selectedPersona,
      escalationStage,
      isLocked,
      driftMinutes,
      commentary,
      shortVoiceLine,
      simulatedTime,
      consecutiveIgnoredReplans,
      engagedSinceLastReplan,
      driftTriggeredThisPlan
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [tasks, currentPlan, selectedPersona, escalationStage, isLocked, driftMinutes, commentary, shortVoiceLine, simulatedTime, consecutiveIgnoredReplans, engagedSinceLastReplan, driftTriggeredThisPlan]);

  // 3. Simulated time update timer (advances simulated time by 1 minute every 5 seconds for visual progression, or user slides it)
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSimulatedTime((prev) => {
        const [h, m] = prev.split(':').map(Number);
        let nextM = m + 1;
        let nextH = h;
        if (nextM >= 60) {
          nextM = 0;
          nextH = (h + 1) % 24;
        }
        return `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
      });
    }, 15000); // 1 simulated min every 15s

    return () => clearInterval(interval);
  }, [isSimulating]);

  // 4. Autonomous Drift Detection and Auto-Replan Trigger
  useEffect(() => {
    if (!currentPlan || tasks.length === 0) return;

    // Calculate current accumulated liveDriftMinutes
    let liveDriftMinutes = 0;
    const nowMin = timeToMinutes(simulatedTime);

    currentPlan.blocks.forEach((block) => {
      const endMin = timeToMinutes(block.end);
      const task = tasks.find((t) => t.id === block.taskId);
      if (task && task.status !== 'done' && task.status !== 'skipped') {
        if (nowMin > endMin) {
          liveDriftMinutes += (nowMin - endMin);
        }
      }
    });

    setDriftMinutes(liveDriftMinutes);

    let nextConsecutiveIgnoredReplans = consecutiveIgnoredReplans;

    // If drift starts, check if the user has ignored the first/next block post-replan
    if (liveDriftMinutes > 0 && !driftTriggeredThisPlan) {
      const hasUnstartedPassedBlock = currentPlan.blocks.some((block) => {
        const endMin = timeToMinutes(block.end);
        if (nowMin > endMin) {
          const task = tasks.find((t) => t.id === block.taskId);
          return task && task.status === 'not_started';
        }
        return false;
      });

      if (hasUnstartedPassedBlock) {
        setDriftTriggeredThisPlan(true);
        if (!engagedSinceLastReplan) {
          nextConsecutiveIgnoredReplans = consecutiveIgnoredReplans + 1;
          setConsecutiveIgnoredReplans(nextConsecutiveIgnoredReplans);
        } else {
          nextConsecutiveIgnoredReplans = 0;
          setConsecutiveIgnoredReplans(0);
        }
      }
    }

    // Determine target escalation level from live drift minutes
    let liveStage = 0;
    if (liveDriftMinutes === 0) {
      liveStage = 0;
    } else if (liveDriftMinutes <= 30) {
      liveStage = 1;
    } else if (liveDriftMinutes <= 90) {
      liveStage = 2;
    } else {
      liveStage = 3;
    }

    // Determine stage implied by consecutive ignored replans
    let consecutiveStage = 0;
    if (nextConsecutiveIgnoredReplans === 0) {
      consecutiveStage = 0;
    } else if (nextConsecutiveIgnoredReplans === 1) {
      consecutiveStage = 1;
    } else if (nextConsecutiveIgnoredReplans === 2) {
      consecutiveStage = 2;
    } else {
      consecutiveStage = 3;
    }

    // Compute effective stage as the max of both
    const effectiveStage = Math.max(liveStage, consecutiveStage);

    // Trigger action when effective stage increases (drift or ignored replans worsen)
    if (effectiveStage !== escalationStage) {
      const isWorsening = effectiveStage > escalationStage;
      setEscalationStage(effectiveStage);

      if (effectiveStage === 3) {
        setIsLocked(true);
      }

      // Automatically trigger replan on server if stage is worsening and not locked out
      if (isWorsening && effectiveStage >= 1 && !isLocked) {
        triggerAutoReplan(effectiveStage);
      }
    }
  }, [simulatedTime, tasks, currentPlan, consecutiveIgnoredReplans, engagedSinceLastReplan, driftTriggeredThisPlan, escalationStage, isLocked]);

  // Trigger Automatic Replan Proxy Endpoint
  const triggerAutoReplan = async (stage: number) => {
    if (isReplanning) return;
    setIsReplanning(true);
    setServerError(null);
    try {
      const response = await fetch('/api/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan,
          taskStatuses: tasks,
          selectedPersona,
          escalationStage: stage,
          currentTime: simulatedTime
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.friendly) {
          setServerError(errData.error);
          setCommentary(errData.error);
          setShortVoiceLine(errData.short_voice_line || errData.error);
          return;
        }
        throw new Error(errData.error || 'Server replanning failed');
      }

      const data = await response.json();
      if (data.refused) {
        setIsLocked(true);
        setCommentary(data.commentary);
        setShortVoiceLine(data.short_voice_line);
      } else {
        if (data.blocks && data.blocks.length > 0) {
          setCurrentPlan((prev) => prev ? { ...prev, blocks: data.blocks } : null);
        }
        setCommentary(data.commentary);
        setShortVoiceLine(data.short_voice_line);
        setEngagedSinceLastReplan(false);
        setDriftTriggeredThisPlan(false);
      }
    } catch (e: any) {
      console.error('Auto replan error:', e);
      const friendlyErr = getFriendlyErrorMessageOnClient(selectedPersona || 'tsundere');
      setServerError(friendlyErr.message);
      setCommentary(friendlyErr.message);
      setShortVoiceLine(friendlyErr.voiceLine);
    } finally {
      setIsReplanning(false);
    }
  };

  // 5. Generate Plan Call (Front-end initiating server Gen)
  const handleGeneratePlan = async () => {
    if (tasks.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setServerError(null);
    try {
      const response = await fetch('/api/generatePlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          selectedPersona,
          availableHours: { start: '08:00', end: '22:00' },
          currentTime: simulatedTime
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.friendly) {
          setServerError(errData.error);
          setCommentary(errData.error);
          setShortVoiceLine(errData.short_voice_line || errData.error);
          return;
        }
        throw new Error(errData.error || 'Failed to generate planning path');
      }

      const data = await response.json();
      
      setCurrentPlan({
        date: new Date().toISOString().split('T')[0],
        blocks: data.blocks || []
      });
      setCommentary(data.commentary || '');
      setShortVoiceLine(data.short_voice_line || '');
      setEscalationStage(0);
      setIsLocked(false);
      setDriftMinutes(0);
      setConsecutiveIgnoredReplans(0);
      setEngagedSinceLastReplan(false);
      setDriftTriggeredThisPlan(false);
    } catch (e: any) {
      console.error(e);
      const friendlyErr = getFriendlyErrorMessageOnClient(selectedPersona || 'tsundere');
      setServerError(friendlyErr.message);
      setCommentary(friendlyErr.message);
      setShortVoiceLine(friendlyErr.voiceLine);
    } finally {
      setIsGenerating(false);
    }
  };

  // 6. Manual Task Handlers
  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'not_started'
    };
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
    if (updatedTask.status === 'in_progress' || updatedTask.status === 'done') {
      setEngagedSinceLastReplan(true);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // If the active task block is deleted, we might want to clean plan, but keeping it is fine.
  };

  const handleUpdateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    if (status === 'in_progress' || status === 'done') {
      setEngagedSinceLastReplan(true);
    }
  };

  // 7. Procrastination Buster Call
  const handleHelpMeStart = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setHelpTask(task);
    setHelpLoading(true);
    setHelpOutline('');
    setHelpFirstStep('');
    setServerError(null);

    try {
      const response = await fetch('/api/helpMeStart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskPriority: task.priority,
          selectedPersona
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.friendly) {
          throw new Error(errData.error);
        }
        throw new Error('Failed to fetch starter steps');
      }

      const data = await response.json();
      setHelpOutline(data.outline || '');
      setHelpFirstStep(data.firstStep || '');
    } catch (e: any) {
      console.error(e);
      const friendlyErr = getFriendlyErrorMessageOnClient(selectedPersona || 'tsundere');
      setHelpOutline(friendlyErr.message);
      setHelpFirstStep("Take a deep breath and prepare your desk.");
      setServerError(friendlyErr.message);
    } finally {
      setHelpLoading(false);
    }
  };

  // 8. Unlock State Apology Sender
  const handleSendUnlockReply = async (replyText: string) => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    setUnlockError(null);
    setUnlockFeedback(null);
    try {
      const response = await fetch('/api/checkUnlockReply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userReplyText: replyText,
          selectedPersona
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.friendly) {
          setUnlockError(errData.error);
          return;
        }
        throw new Error('Apology check endpoint failure');
      }

      const data = await response.json();
      if (data.accepted) {
        setUnlockFeedback(data.response);
        // Reset lock states as specified: "On accepted unlock: escalationStage resets to 1 (not 0), isLocked=false"
        setTimeout(() => {
          setIsLocked(false);
          setEscalationStage(1);
          setDriftMinutes(10); // set small nominal drift so it sits at stage 1
          setConsecutiveIgnoredReplans(1);
          setEngagedSinceLastReplan(false);
          setDriftTriggeredThisPlan(false);
          setCommentary(data.response);
          setShortVoiceLine(data.response);
          setUnlockFeedback(null);
        }, 3000);
      } else {
        setUnlockError(data.response || 'Apology rejected. Be more sincere!');
      }
    } catch (e: any) {
      console.error(e);
      setUnlockError('Connection error. The assistant ignored your call.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Reset Session
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all tasks and clear your current plan?')) {
      setTasks([]);
      setCurrentPlan(null);
      setEscalationStage(0);
      setIsLocked(false);
      setDriftMinutes(0);
      setCommentary('');
      setShortVoiceLine('');
      setConsecutiveIgnoredReplans(0);
      setEngagedSinceLastReplan(false);
      setDriftTriggeredThisPlan(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  // Reset Onboarding/Persona
  const handleResetPersona = () => {
    setSelectedPersona(null);
    setCurrentPlan(null);
  };

  // Pre-fetch active persona
  const activePersona: Persona | undefined = selectedPersona ? PERSONAS[selectedPersona] : undefined;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-blue-900/20 bg-slate-900" id="app-root">
      {/* 1. Global Alert Banner */}
      {serverError && (
        <div className="bg-rose-900/60 backdrop-blur-md border-b border-rose-500/30 text-white text-xs px-6 py-2.5 flex justify-between items-center font-medium animate-fade-in shadow-md" id="global-error-banner">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{serverError}</span>
          </div>
          <button
            onClick={() => setServerError(null)}
            className="hover:bg-white/10 px-2 py-0.5 rounded transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Top Header Navigation Bar */}
      <header className="bg-white/5 border-b border-white/10 backdrop-blur-md sticky top-0 z-30" id="main-header">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between" id="header-container">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">
              R
            </div>
            <div>
              <span className="font-black text-xl tracking-tighter text-blue-400 block leading-none">
                Re:Plan
              </span>
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1 block">
                ANIME PERSONALITY PLANNER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activePersona && (
              <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5" id="active-persona-badge">
                <span className="text-xs font-semibold text-slate-400">Active Planner:</span>
                <span className="text-xs font-bold text-white">{activePersona.name}</span>
                <button
                  onClick={handleResetPersona}
                  className="text-[10px] text-rose-400 hover:text-rose-300 ml-1 cursor-pointer font-bold uppercase tracking-wider"
                >
                  Change
                </button>
              </div>
            )}

            {currentPlan && (
              <button
                id="reset-session-btn"
                onClick={handleReset}
                className="px-3 py-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold border border-white/10"
                title="Reset session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Day
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. SIMULATED TIME CONTROL CONTROLLER PANEL */}
      {currentPlan && (
        <section className="bg-white/5 border-b border-white/10 py-3.5 px-4 backdrop-blur-md text-white" id="time-simulator-panel">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Demo Mode — Time Acceleration</span>
                <span className="font-mono text-sm bg-white/10 border border-white/10 text-blue-300 px-2.5 py-0.5 rounded font-bold">
                  {simulatedTime}
                </span>
              </div>
              <span className="text-[10.5px] text-slate-400 leading-normal max-w-xl">
                In real use, this happens passively over hours — sped up here so you can watch your assistant react in real time.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  setSimulatedTime((prev) => {
                    const [h, m] = prev.split(':').map(Number);
                    return `${((h + 23) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  });
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-200 rounded border border-white/10 transition cursor-pointer font-bold"
              >
                -1 Hour
              </button>
              <button
                onClick={() => {
                  setSimulatedTime((prev) => {
                    const [h, m] = prev.split(':').map(Number);
                    let nextM = m - 15;
                    let nextH = h;
                    if (nextM < 0) {
                      nextM = 45;
                      nextH = (h + 23) % 24;
                    }
                    return `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
                  });
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-200 rounded border border-white/10 transition cursor-pointer font-bold"
              >
                -15 min
              </button>
              <button
                onClick={() => {
                  setSimulatedTime((prev) => {
                    const [h, m] = prev.split(':').map(Number);
                    let nextM = m + 15;
                    let nextH = h;
                    if (nextM >= 60) {
                      nextM = 0;
                      nextH = (h + 1) % 24;
                    }
                    return `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
                  });
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-200 rounded border border-white/10 transition cursor-pointer font-bold"
              >
                +15 min
              </button>
              <button
                onClick={() => {
                  setSimulatedTime((prev) => {
                    const [h, m] = prev.split(':').map(Number);
                    return `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  });
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-200 rounded border border-white/10 transition cursor-pointer font-bold"
              >
                +1 Hour
              </button>

              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none font-bold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={isSimulating}
                  onChange={(e) => setIsSimulating(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 accent-blue-500 mr-1"
                />
                Auto-Advance
              </label>
            </div>
          </div>
        </section>
      )}

      {/* 4. Main Views Orchestration */}
      <main className="flex-grow flex flex-col justify-start" id="main-content-section">
        {!selectedPersona ? (
          /* Step 1: Onboarding / Picker */
          <PersonaPicker
            selectedId={selectedPersona}
            onSelect={(id) => setSelectedPersona(id)}
          />
        ) : !currentPlan ? (
          /* Step 2: Task Inputs Form & List screen */
          <div className="py-8" id="form-container-box">
            <TaskForm
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onGeneratePlan={handleGeneratePlan}
              isGenerating={isGenerating}
              selectedPersonaName={activePersona?.name || ''}
            />
          </div>
        ) : (
          /* Step 3: Interactive Calendar Grid + Commentary Dashboard view */
          <div className="py-8" id="calendar-container-box">
            <CalendarView
              plan={currentPlan}
              tasks={tasks}
              persona={activePersona!}
              escalationStage={escalationStage}
              driftMinutes={driftMinutes}
              isLocked={isLocked}
              commentary={commentary}
              shortVoiceLine={shortVoiceLine}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onHelpMeStart={handleHelpMeStart}
              onSendUnlockReply={handleSendUnlockReply}
              isUnlocking={isUnlocking}
              unlockError={unlockError}
              unlockFeedback={unlockFeedback}
            />
          </div>
        )}
      </main>

      {/* 5. Procrastination Buster Modal */}
      <HelpMeStartModal
        isOpen={helpTask !== null}
        onClose={() => setHelpTask(null)}
        taskTitle={helpTask?.title || ''}
        outline={helpOutline}
        firstStep={helpFirstStep}
        isLoading={helpLoading}
        personaName={activePersona?.name || ''}
      />
    </div>
  );
}
