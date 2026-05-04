'use client';

import { useState } from 'react';
import { Send, FileText, CheckSquare, Zap, Clock } from 'lucide-react';

interface ReviewScreenProps {
  transcript: string | null;
  summary: any | null;
  onSend: () => void;
  isSending: boolean;
}

export default function ReviewScreen({ transcript, summary, onSend, isSending }: ReviewScreenProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  // Safely extract data with fallbacks
  const execSummary = summary?.executiveSummary || 'No summary was generated.';
  const decisions = summary?.keyDecisions || [];
  const actions = summary?.actionItems || [];
  const rawTranscript = transcript || 'No transcript was generated.';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      <div className="flex items-end justify-between px-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">Meeting Brief</h2>
      </div>
      
      {/* Premium Tab Selector */}
      <div className="flex p-1.5 bg-black/5 rounded-full mx-2 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'summary' 
              ? 'bg-white text-[#1A1A1A] shadow-sm' 
              : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
          }`}
        >
          <Zap size={16} className={activeTab === 'summary' ? 'text-[#C9A84C]' : ''} /> 
          Intelligence
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'transcript' 
              ? 'bg-white text-[#1A1A1A] shadow-sm' 
              : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
          }`}
        >
          <FileText size={16} /> 
          Raw Transcript
        </button>
      </div>

      {/* Content Canvas */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-black/5 shadow-sm min-h-[400px]">
        
        {activeTab === 'summary' ? (
          <div className="space-y-10 animate-in fade-in duration-300">
            {/* Executive Summary */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-black/40 flex items-center gap-2">
                <Clock size={12} /> Executive Summary
              </h3>
              <p className="text-lg leading-relaxed text-[#1A1A1A] font-medium">
                {execSummary}
              </p>
            </section>

            <div className="w-full h-px bg-black/5" />

            {/* Key Decisions */}
            {decisions.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-black/40">Key Decisions</h3>
                <ul className="space-y-3">
                  {decisions.map((decision: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-4 text-[#1A1A1A] bg-[#FAF8F5] p-5 rounded-2xl border border-black/5">
                      <span className="text-[#C9A84C] mt-0.5 text-lg">✦</span>
                      <span className="leading-snug">{decision}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Action Items */}
            {actions.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-black/40">Action Items</h3>
                <ul className="space-y-3">
                  {actions.map((action: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-4 text-[#1A1A1A] bg-white border border-black/10 p-5 rounded-2xl shadow-sm">
                      <span className="text-black/20 mt-0.5"><CheckSquare size={20} /></span>
                      <span className="leading-snug">{action}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 h-full">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-black/40 mb-6 sticky top-0 bg-white pb-2">
              Verbatim Log
            </h3>
            <div className="h-[450px] overflow-y-auto pr-4 space-y-5 text-sm text-[#1A1A1A]/80 font-sans leading-relaxed custom-scrollbar">
              {rawTranscript.split('\n').map((line, idx) => {
                if (!line.trim()) return null;
                // Basic parsing for timestamps and speakers
                const match = line.match(/^(\[\d{2}:\d{2}\])\s*(.*?):\s*(.*)/);
                if (match) {
                  return (
                    <div key={idx} className="mb-4">
                      <span className="font-mono text-xs text-black/30 mr-3">{match[1]}</span>
                      <span className="font-semibold text-[#1A1A1A] mr-2">{match[2]}:</span>
                      <span>{match[3]}</span>
                    </div>
                  );
                }
                return <div key={idx} className="mb-2 pl-14">{line}</div>;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button 
          onClick={onSend}
          disabled={isSending}
          className="group flex items-center justify-center gap-3 bg-[#1A1A1A] text-[#FAF8F5] px-8 py-5 rounded-full font-medium hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10 transition-all duration-300 w-full active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSending ? (
            <>
              <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Dispatching Encrypted Brief...</span>
            </>
          ) : (
            <>
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>Approve & Dispatch Brief</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
