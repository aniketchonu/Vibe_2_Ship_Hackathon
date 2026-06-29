import React from 'react';
import { X, Play, ClipboardList, CheckSquare } from 'lucide-react';

interface HelpMeStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  outline: string;
  firstStep: string;
  isLoading: boolean;
  personaName: string;
}

export default function HelpMeStartModal({
  isOpen,
  onClose,
  taskTitle,
  outline,
  firstStep,
  isLoading,
  personaName
}: HelpMeStartModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="help-start-modal">
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10 flex flex-col text-white" id="help-modal-box">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5" id="help-modal-header">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Busting Procrastination with {personaName}
            </span>
            <h3 className="text-base font-bold text-white mt-1 truncate max-w-[320px]">
              {taskTitle}
            </h3>
          </div>
          <button
            id="close-help-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 flex-grow" id="help-modal-body">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3" id="help-modal-loading">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 text-sm italic font-serif">
                Consulting {personaName} for motivational leverage...
              </p>
            </div>
          ) : (
            <>
              {/* First 2-minute step */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl" id="first-step-container">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-amber-300 stroke-none" />
                  Your 2-Minute Micro-Step
                </span>
                <p className="text-sm font-semibold text-white mt-2 leading-relaxed font-serif italic">
                  "{firstStep || 'No first step suggested.'}"
                </p>
              </div>

              {/* Micro Outline */}
              <div className="space-y-3" id="outline-container">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-blue-400" />
                  Task Breakdown / Outline
                </span>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm leading-relaxed text-slate-200 whitespace-pre-line font-serif">
                  {outline || 'No outline suggested.'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end" id="help-modal-footer">
          <button
            id="modal-got-it-btn"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-lg shadow-blue-900/20"
          >
            I'm starting now!
          </button>
        </div>
      </div>
    </div>
  );
}
