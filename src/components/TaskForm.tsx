import React, { useState } from 'react';
import { Task } from '../types';
import { Plus, Trash2, Edit2, Play, Check, RefreshCw, Calendar, Clock, AlertTriangle, Lightbulb } from 'lucide-react';

interface TaskFormProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'status'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
  selectedPersonaName: string;
}

const PRESETS = [
  { title: 'Finish coding core engine', duration: 90, priority: 'high' as const },
  { title: 'Gym workout & stretch', duration: 60, priority: 'medium' as const },
  { title: 'Check emails & Slack messages', duration: 20, priority: 'low' as const },
  { title: 'Review PR & leave feedback', duration: 40, priority: 'medium' as const },
  { title: 'Prepare presentation deck', duration: 75, priority: 'high' as const },
];

export default function TaskForm({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onGeneratePlan,
  isGenerating,
  selectedPersonaName
}: TaskFormProps) {
  // Form states
  const [title, setTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      const existing = tasks.find(t => t.id === editingId);
      if (existing) {
        onUpdateTask({
          ...existing,
          title,
          deadlineDate,
          deadlineTime,
          estimatedMinutes,
          priority
        });
      }
      setEditingId(null);
    } else {
      onAddTask({
        title,
        deadlineDate,
        deadlineTime,
        estimatedMinutes,
        priority
      });
    }

    // Reset fields (except date/time)
    setTitle('');
    setEstimatedMinutes(30);
    setPriority('medium');
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDeadlineDate(task.deadlineDate);
    setDeadlineTime(task.deadlineTime);
    setEstimatedMinutes(task.estimatedMinutes);
    setPriority(task.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setEstimatedMinutes(30);
    setPriority('medium');
  };

  const handleQuickAdd = (preset: typeof PRESETS[0]) => {
    onAddTask({
      title: preset.title,
      deadlineDate: new Date().toISOString().split('T')[0],
      deadlineTime: '19:00',
      estimatedMinutes: preset.duration,
      priority: preset.priority
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl w-full mx-auto p-4" id="task-form-layout">
      {/* Input Section */}
      <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-lg text-white" id="task-input-section">
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2" id="input-section-title">
            <Plus className="w-5 h-5 text-blue-400" />
            {editingId ? 'Edit Task' : 'Add New Task'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" id="task-submission-form">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="task-title-input">
                Task Title
              </label>
              <input
                id="task-title-input"
                type="text"
                placeholder="e.g. Design app layout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white text-sm placeholder-slate-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4" id="deadline-fields">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="deadline-date-input">
                  Deadline Date
                </label>
                <input
                  id="deadline-date-input"
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="deadline-time-input">
                  Deadline Time
                </label>
                <input
                  id="deadline-time-input"
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4" id="duration-priority-fields">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="duration-input">
                  Duration (min)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  min="5"
                  max="480"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 15)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="priority-select">
                  Priority
                </label>
                <select
                  id="priority-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white text-sm [&>option]:text-slate-900"
                >
                  <option value="low">Low (Cool Blue)</option>
                  <option value="medium">Medium (Amber)</option>
                  <option value="high">High (Warm Coral)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2" id="form-actions">
              <button
                type="submit"
                id="task-submit-btn"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer shadow-lg shadow-blue-900/20"
              >
                {editingId ? 'Update Task' : 'Add Task'}
              </button>
              {editingId && (
                <button
                  type="button"
                  id="task-cancel-edit-btn"
                  onClick={cancelEdit}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Quick Add presets */}
        {!editingId && (
          <div className="mt-8 pt-6 border-t border-white/10" id="quick-add-presets">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-blue-400" /> Quick-Add Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`preset-${idx}`}
                  type="button"
                  onClick={() => handleQuickAdd(preset)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 rounded-lg transition-all text-left flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-slate-400" />
                  <span>{preset.title} ({preset.duration}m)</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task List / Generate Plan Section */}
      <div className="lg:col-span-7 flex flex-col h-full bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-lg" id="task-list-section">
        <div className="flex justify-between items-center mb-6" id="task-list-header">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Tasks List ({tasks.length})
          </h2>
          {tasks.length > 0 && (
            <button
              id="generate-plan-master-btn"
              onClick={onGeneratePlan}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-900/20 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  Plan my day with {selectedPersonaName}
                </>
              )}
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/10 rounded-xl bg-white/5" id="empty-task-placeholder">
            <Calendar className="w-12 h-12 text-slate-500 mb-3" />
            <p className="text-slate-300 font-bold text-sm">No tasks added yet.</p>
            <p className="text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
              Add some chores, work items, or exercises on the left to allow {selectedPersonaName} to organize them!
            </p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto max-h-[400px] space-y-3 pr-1" id="tasks-scroll-container">
            {tasks.map((task) => (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className="p-4 border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        task.priority === 'high'
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : task.priority === 'medium'
                            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                      }`}
                      title={`${task.priority} priority`}
                    />
                    <h4 className="font-bold text-white text-sm">
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {task.estimatedMinutes} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Due {task.deadlineDate} @ {task.deadlineTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    id={`task-edit-btn-${task.id}`}
                    onClick={() => startEdit(task)}
                    className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                    title="Edit task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    id={`task-delete-btn-${task.id}`}
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
