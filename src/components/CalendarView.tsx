import React, { useState, useEffect, useRef } from 'react';
import { Plan, Task, Persona } from '../types';
import { Volume2, CheckCircle2, Circle, ArrowRight, CornerDownRight, Lock, MessageSquare, Send, Sparkles, AlertCircle, HelpCircle, XCircle, RotateCcw } from 'lucide-react';

interface CalendarViewProps {
  plan: Plan;
  tasks: Task[];
  persona: Persona;
  escalationStage: number;
  driftMinutes: number;
  isLocked: boolean;
  commentary: string;
  shortVoiceLine: string;
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onHelpMeStart: (taskId: string) => void;
  onSendUnlockReply: (replyText: string) => void;
  isUnlocking: boolean;
  unlockError: string | null;
  unlockFeedback: string | null;
}

export default function CalendarView({
  plan,
  tasks,
  persona,
  escalationStage,
  driftMinutes,
  isLocked,
  commentary,
  shortVoiceLine,
  onUpdateTaskStatus,
  onHelpMeStart,
  onSendUnlockReply,
  isUnlocking,
  unlockError,
  unlockFeedback
}: CalendarViewProps) {
  const [replyText, setReplyText] = useState('');
  const [speaking, setSpeaking] = useState(false);

  // Convert time "HH:MM" to minutes from 00:00
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Find range of calendar
  const calendarStartHour = 8; // 08:00
  const calendarEndHour = 22;   // 22:00
  const calendarStartMinutes = calendarStartHour * 60;
  const calendarEndMinutes = calendarEndHour * 60;
  const calendarTotalMinutes = calendarEndMinutes - calendarStartMinutes;

  const hourHeight = 64; // height of 1 hour in pixels

  // Speech synthesis
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener('click', handleInteraction, { capture: true, once: true });
    window.addEventListener('keydown', handleInteraction, { capture: true, once: true });
    window.addEventListener('touchstart', handleInteraction, { capture: true, once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice based on persona characteristics with preference lists and graceful fallbacks
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (voices.length > 0) {
      const matchName = (v: SpeechSynthesisVoice, term: string) => 
        v.name.toLowerCase().includes(term.toLowerCase());

      const matchLang = (v: SpeechSynthesisVoice, term: string) => 
        v.lang.toLowerCase().includes(term.toLowerCase()) || v.lang.toLowerCase().replace('_', '-').includes(term.toLowerCase());

      if (persona.id === 'tsundere') {
        // tsundere: prefer "Zira" > any name containing "female" > any "en-US" voice
        selectedVoice = voices.find(v => matchName(v, 'zira')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'female')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchLang(v, 'en-us')) || null;
      } else if (persona.id === 'yandere') {
        // yandere: prefer "Heera" > "Zira" > any name containing "female" > any "en-IN" or "en-US" voice
        selectedVoice = voices.find(v => matchName(v, 'heera')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'zira')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'female')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchLang(v, 'en-in') || matchLang(v, 'en-us')) || null;
      } else if (persona.id === 'kuudere') {
        // kuudere: prefer "Mark" > any name containing "male" (but not matching David, to keep it distinct from default) > any "en-US" voice
        selectedVoice = voices.find(v => matchName(v, 'mark')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'male') && !matchName(v, 'david')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchLang(v, 'en-us')) || null;
      } else if (persona.id === 'deredere') {
        // deredere: prefer "Zira" > "Heera" > any name containing "female" > any voice
        selectedVoice = voices.find(v => matchName(v, 'zira')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'heera')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'female')) || null;
        if (!selectedVoice) selectedVoice = voices[0];
      } else if (persona.id === 'chaotic_gremlin') {
        // chaotic_gremlin: prefer "Ravi" > "Mark" > any voice
        selectedVoice = voices.find(v => matchName(v, 'ravi')) || null;
        if (!selectedVoice) selectedVoice = voices.find(v => matchName(v, 'mark')) || null;
        if (!selectedVoice) selectedVoice = voices[0];
      }

      // Final fallback if no rules matched
      if (!selectedVoice) {
        selectedVoice = voices[0];
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      // Diagnostic log for voice selection (dev-only, not user-facing)
      console.log(`[TTS Diagnosis] Persona: "${persona.id}", Selected Voice: "${selectedVoice.name}" (Lang: "${selectedVoice.lang}")`);
    } else {
      console.warn(`[TTS Diagnosis] Persona: "${persona.id}", No speech synthesis voices available on this device.`);
    }

    // Apply voice settings from persona
    utterance.pitch = persona.voice.pitchMultiplier;
    utterance.rate = persona.voice.rateMultiplier;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleVoicePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }
    const lineToSpeak = shortVoiceLine || commentary;
    speakText(lineToSpeak);
  };

  const lineToSpeak = shortVoiceLine || commentary;

  useEffect(() => {
    if (!lineToSpeak) return;
    if (!userInteractedRef.current) {
      console.log("[TTS Diagnosis] Autoplay blocked because no user interaction has occurred yet.");
      return;
    }

    speakText(lineToSpeak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineToSpeak, persona.id]);

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isUnlocking) return;
    onSendUnlockReply(replyText);
    setReplyText('');
  };

  // Helper to map task priority to Tailwind classes
  const getPriorityClasses = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-200 hover:bg-rose-500/20';
      case 'medium':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-200 hover:bg-amber-500/20';
      case 'low':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-200 hover:bg-blue-500/20';
    }
  };

  const getPriorityTagColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      case 'medium': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'low': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
    }
  };

  const hoursList = Array.from({ length: calendarEndHour - calendarStartHour + 1 }, (_, i) => calendarStartHour + i);

  // Position layout calculation for overlapping blocks
  const validBlocks = plan.blocks.filter((block) => {
    return tasks.some(t => t.id === block.taskId);
  });

  type BlockLayoutItem = {
    block: typeof plan.blocks[0];
    startMin: number;
    endMin: number;
    duration: number;
  };

  const blocksWithLayout: BlockLayoutItem[] = validBlocks.map((block) => {
    const startMin = timeToMinutes(block.start);
    const endMin = timeToMinutes(block.end);
    return {
      block,
      startMin,
      endMin,
      duration: Math.max(15, endMin - startMin),
    };
  });

  const columns: BlockLayoutItem[][] = [];
  blocksWithLayout.forEach((item) => {
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const hasOverlap = col.some(placedItem => {
        return item.startMin < placedItem.endMin && item.endMin > placedItem.startMin;
      });
      if (!hasOverlap) {
        col.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item]);
    }
  });

  const blockPositionMap = new Map<any, { left: string; width: string }>();

  blocksWithLayout.forEach((item) => {
    const colIndex = columns.findIndex(col => col.includes(item));
    const overlappingCols = columns.filter(col => {
      return col.some(colItem => {
        return item.startMin < colItem.endMin && item.endMin > colItem.startMin;
      });
    });
    
    const totalCols = overlappingCols.length;
    const colPosition = overlappingCols.indexOf(columns[colIndex]);
    
    const widthPercent = 100 / totalCols;
    const leftPercent = colPosition * widthPercent;
    
    const leftOffset = 64; // px (left-16)
    const rightOffset = 12; // px (right-3)
    const totalAvailableWidthExpr = `calc(100% - ${leftOffset + rightOffset}px)`;
    
    const leftStyle = `calc(${leftOffset}px + (${leftPercent}% * (${totalAvailableWidthExpr})) / 100)`;
    const widthStyle = `calc((${widthPercent}% * (${totalAvailableWidthExpr})) / 100 - 6px)`;
    
    blockPositionMap.set(item.block, {
      left: leftStyle,
      width: widthStyle,
    });
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl w-full mx-auto p-4" id="calendar-view-container">
      {/* LEFT: The Google Calendar Day Grid */}
      <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col text-white" id="calendar-grid-card">
        <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-6" id="calendar-grid-header">
          <div>
            <h2 className="text-xl font-bold text-white">Today's Schedule</h2>
            <p className="text-xs text-slate-400 mt-1">Times are generated by your assistant</p>
          </div>
          <div className="flex items-center gap-2" id="drift-stats">
            <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full font-bold text-slate-300 flex items-center gap-1">
              Drift: {driftMinutes}m
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              escalationStage === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              escalationStage === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              escalationStage === 2 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              'bg-red-500/40 text-red-100 animate-pulse border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            }`}>
              Stage {escalationStage}/3 {isLocked ? '(LOCKED)' : ''}
            </span>
          </div>
        </div>

        {/* Scrollable hourly grid container */}
        <div className="overflow-y-auto relative border border-white/10 rounded-2xl bg-white/5" style={{ height: '480px' }} id="calendar-scroll-area">
          <div className="relative w-full" style={{ height: `${hoursList.length * hourHeight}px` }}>
            {/* Hour markers */}
            {hoursList.map((hour) => (
              <div
                key={hour}
                id={`hour-line-${hour}`}
                className="absolute left-0 w-full border-t border-white/10 flex items-start"
                style={{ top: `${(hour - calendarStartHour) * hourHeight}px`, height: `${hourHeight}px` }}
              >
                <span className="w-14 text-right pr-3 text-[10px] font-bold text-slate-400 select-none pt-1">
                  {hour.toString().padStart(2, '0')}:00
                </span>
                <div className="flex-grow h-full border-l border-white/10" />
              </div>
            ))}

            {/* Task Blocks positioned on grid */}
            {plan.blocks.map((block, idx) => {
              const task = tasks.find(t => t.id === block.taskId);
              if (!task) return null;

              const pos = blockPositionMap.get(block) || { left: 'calc(4rem)', width: 'calc(100% - 76px)' };

              const startMin = timeToMinutes(block.start);
              const endMin = timeToMinutes(block.end);
              
              // Bound relative values to grid limits
              const relativeStart = Math.max(0, startMin - calendarStartMinutes);
              const duration = Math.max(15, endMin - startMin);

              const topPx = (relativeStart / 60) * hourHeight;
              const heightPx = (duration / 60) * hourHeight;

              const colorClass = getPriorityClasses(task.priority);

              const isCompact = task.status === 'done' || task.status === 'skipped';

              if (isCompact) {
                const isDone = task.status === 'done';
                return (
                  <div
                    key={idx}
                    id={`block-item-${task.id}`}
                    className={`absolute border rounded-xl px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all flex items-center justify-between overflow-hidden group opacity-50 ${
                      isDone 
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300/80' 
                        : 'bg-slate-900/40 border-slate-500/20 text-slate-400'
                    }`}
                    style={{ 
                      top: `${topPx}px`, 
                      height: '38px', 
                      minHeight: '38px',
                      left: pos.left,
                      width: pos.width
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-grow min-w-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-xs truncate line-through text-slate-300/90 flex-grow min-w-0" title={task.title}>
                        {task.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500/80 whitespace-nowrap ml-2">
                        {block.start} - {block.end}
                      </span>
                    </div>

                    {/* Small unobtrusive undo button */}
                    <button
                      id={`undo-btn-${task.id}`}
                      onClick={() => onUpdateTaskStatus(task.id, 'not_started')}
                      className="ml-2 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all opacity-40 hover:opacity-100 cursor-pointer flex items-center justify-center flex-shrink-0"
                      title="Undo status"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  id={`block-item-${task.id}`}
                  className={`absolute border rounded-xl p-2.5 shadow-md backdrop-blur-md transition-all flex flex-col justify-center overflow-hidden group ${colorClass}`}
                  style={{ 
                    top: `${topPx}px`, 
                    height: `${Math.max(92, heightPx - 2)}px`, 
                    minHeight: '92px',
                    left: pos.left,
                    width: pos.width
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                    {/* Left Part: Title & Time info */}
                    <div className="flex-grow min-w-[120px] max-w-full">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${getPriorityTagColor(task.priority)}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 font-mono text-slate-300">
                          {block.start} - {block.end}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-white truncate mt-0.5" title={task.title}>
                        {task.title}
                      </h4>
                    </div>

                    {/* Right Part: Inline Status Controls + Help Button */}
                    <div className="flex flex-wrap items-center gap-1.5 select-none">
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                        {(['not_started', 'in_progress', 'done', 'skipped'] as const).map((st) => (
                          <button
                            key={st}
                            id={`status-btn-${task.id}-${st}`}
                            onClick={() => onUpdateTaskStatus(task.id, st)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md border transition cursor-pointer min-h-[28px] flex items-center justify-center ${
                              task.status === st
                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                                : 'bg-transparent text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200'
                            }`}
                          >
                            {st === 'not_started' ? 'To Do' :
                             st === 'in_progress' ? 'In Progress' :
                             st === 'done' ? 'Done' : 'Skipped'}
                          </button>
                        ))}
                      </div>

                      {/* Procrastination Help Button inline */}
                      {!isLocked && task.status !== 'done' && task.status !== 'skipped' && (
                        <button
                          id={`help-btn-${task.id}`}
                          onClick={() => onHelpMeStart(task.id)}
                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-[9px] font-bold text-slate-200 rounded-lg border border-white/10 transition cursor-pointer flex items-center gap-1 min-h-[28px]"
                          title="Bust procrastination!"
                        >
                          <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
                          Help
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Persona Commentary and Lockout Interface */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="commentary-sidebar">
        {/* Persona Speech Panel */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-lg shadow-2xl flex flex-col h-full min-h-[360px] text-white" id="commentary-card">
          <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4" id="commentary-header">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 border border-white/5 rounded-lg" id="panel-persona-avatar">
                <span className="text-xl">👩‍💻</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{persona.name}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Assistant Commentary
                </span>
              </div>
            </div>

            {/* Vocal Synthesis Button */}
            <button
              id="voice-synthesis-btn"
              onClick={handleVoicePlay}
              className={`p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer text-slate-300 hover:text-white ${
                speaking ? 'ring-2 ring-blue-500 animate-pulse bg-white/10' : ''
              }`}
              title="Speak voice line"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Speech dialogue bubble */}
          <div className="flex-grow flex flex-col justify-between" id="commentary-bubble-section">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl relative" id="commentary-bubble">
              <p className="text-sm italic leading-relaxed text-slate-200 font-serif">
                "{commentary || 'Select tasks and hit Generate Plan above!'}"
              </p>
              {shortVoiceLine && (
                <p className="text-[11px] text-slate-400 mt-2 border-t border-white/5 pt-2 italic">
                  TTS output: "{shortVoiceLine}"
                </p>
              )}
            </div>

            {/* Locked-State Apology/Joke Input Box */}
            {isLocked ? (
              <div className="mt-6 pt-4 border-t border-white/10" id="lock-state-box">
                <div className="flex items-center gap-2 text-rose-400 mb-3" id="lock-warning">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    Planner Locked!
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  You fell behind too much, and your assistant has gone on strike. Type an apology or a witty message that satisfies their personality to unlock.
                </p>

                {unlockFeedback && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900 rounded-lg text-emerald-400 text-xs mb-3 italic">
                    {unlockFeedback}
                  </div>
                )}
                {unlockError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-rose-400 text-xs mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <form onSubmit={handleReplySubmit} className="flex gap-2" id="unlock-reply-form">
                  <input
                    id="unlock-reply-input"
                    type="text"
                    placeholder="Type apology, explanation, or joke..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isUnlocking}
                    className="flex-grow px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    required
                  />
                  <button
                    type="submit"
                    id="unlock-reply-send-btn"
                    disabled={isUnlocking || !replyText.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-lg shadow-blue-900/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-white/10 text-center" id="active-state-indicator">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Active Session - Status Healthy
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
