import React from 'react';
import { PERSONAS } from '../personas';
import { Persona } from '../types';
import { Sparkles } from 'lucide-react';
import tsundereImg from '../assets/images/tsundere.jpg';
import yandereImg from '../assets/images/yandere.jpg';
import kuudereImg from '../assets/images/kuudere.jpg';
import deredereImg from '../assets/images/deredere.jpg';
import chaoticGremlinImg from '../assets/images/chaotic_gremlin.jpg';

interface PersonaPickerProps {
  onSelect: (personaId: string) => void;
  selectedId: string | null;
}

const PERSONA_IMAGES: Record<string, string> = {
  tsundere: tsundereImg,
  yandere: yandereImg,
  kuudere: kuudereImg,
  deredere: deredereImg,
  chaotic_gremlin: chaoticGremlinImg
};

export default function PersonaPicker({ onSelect, selectedId }: PersonaPickerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4" id="persona-picker-container">
      <div className="text-center max-w-2xl mb-12" id="picker-header">
        <h1 className="text-4xl font-black tracking-tight text-white mb-4" id="picker-title">
          Choose Your Planner's Personality
        </h1>
        <p className="text-lg text-slate-300" id="picker-subtitle">
          Select who will design your day. Each personality has a unique planning philosophy, voice, and escalation style if you start falling behind.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full max-w-6xl" id="persona-grid">
        {Object.values(PERSONAS).map((persona: Persona) => {
          const isSelected = selectedId === persona.id;
          return (
            <button
              key={persona.id}
              id={`persona-btn-${persona.id}`}
              onClick={() => onSelect(persona.id)}
              className={`flex flex-col items-center text-center p-6 rounded-2xl border backdrop-blur-lg transition-all duration-300 shadow-xl cursor-pointer ${
                isSelected
                  ? 'bg-white/15 border-blue-400 ring-2 ring-blue-500/50 scale-102 text-white'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="mb-4 w-28 h-28 relative overflow-hidden rounded-xl border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-inner" id={`persona-image-container-${persona.id}`}>
                {PERSONA_IMAGES[persona.id] ? (
                  <img
                    src={PERSONA_IMAGES[persona.id]}
                    alt={persona.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover select-none"
                    id={`persona-img-${persona.id}`}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-2" id={`persona-name-${persona.id}`}>
                {persona.name}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed flex-grow mb-4" id={`persona-desc-${persona.id}`}>
                {persona.description}
              </p>
              <div className="w-full text-left pt-3 border-t border-white/10 mt-auto" id={`persona-meta-${persona.id}`}>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                  Philosophy
                </span>
                <p className="text-[11px] text-slate-300 leading-normal line-clamp-3">
                  {persona.planningPhilosophy}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
