'use client';

import { useState } from 'react';
import { UserPlus, Mic, X } from 'lucide-react';

interface SetupScreenProps {
  onStart: (title: string, emails: string[], participantCount: number) => void;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [title, setTitle] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(2);

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newEmail = emailInput.trim().replace(',', '');
      if (newEmail && !emails.includes(newEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        setEmails([...emails, newEmail]);
        setEmailInput('');
      }
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1A1A1A] mb-3 leading-tight">
          New Session
        </h1>
        <p className="text-[#1A1A1A]/60 text-lg">Define the context and participants.</p>
      </div>
      
      <div className="p-6 sm:p-8 rounded-[2rem] border border-black/5 bg-white/50 backdrop-blur-sm shadow-sm space-y-8">
        
        {/* Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase text-black/40">Meeting Context</label>
          <input 
            type="text" 
            placeholder="e.g. Q3 Roadmap Sync..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-2xl font-medium tracking-tight text-[#1A1A1A] placeholder:text-black/20 focus:outline-none border-b border-black/5 focus:border-black/20 pb-2 transition-colors"
            autoFocus
          />
        </div>

        {/* Email Tags Input */}
        <div className="space-y-4">
          <label className="text-xs font-bold tracking-widest uppercase text-black/40 flex items-center gap-2">
            <UserPlus size={14} /> Participants
          </label>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {emails.map((email) => (
              <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 text-sm font-medium text-[#1A1A1A] animate-in zoom-in-95 duration-200">
                {email}
                <button onClick={() => removeEmail(email)} className="text-black/40 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <input 
            type="email"
            placeholder={emails.length === 0 ? "Add email and press Enter..." : "Add another email..."}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleAddEmail}
            className="w-full bg-black/5 hover:bg-black/10 focus:bg-white focus:ring-2 focus:ring-[#1A1A1A] text-sm text-[#1A1A1A] placeholder:text-black/30 px-5 py-4 rounded-2xl transition-all outline-none"
          />
        </div>

        {/* Participant Count Input (Mobile Friendly) */}
        <div className="space-y-4">
          <label className="text-xs font-bold tracking-widest uppercase text-black/40 flex items-center gap-2">
            Number of Speakers in Room
          </label>
          <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-2xl w-fit">
            <button 
              onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white shadow-sm text-2xl font-light text-[#1A1A1A] hover:bg-[#FAF8F5] active:scale-90 transition-all"
            >
              −
            </button>
            <div className="w-16 text-center text-2xl font-semibold text-[#1A1A1A] tabular-nums">
              {participantCount}
            </div>
            <button 
              onClick={() => setParticipantCount(Math.min(20, participantCount + 1))}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white shadow-sm text-2xl font-light text-[#1A1A1A] hover:bg-[#FAF8F5] active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <button 
            onClick={() => {
              let finalEmails = [...emails];
              const pendingEmail = emailInput.trim().replace(',', '');
              if (pendingEmail && !finalEmails.includes(pendingEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingEmail)) {
                finalEmails.push(pendingEmail);
              }
              onStart(title || 'Untitled Meeting', finalEmails, participantCount);
            }}
            className="group flex items-center justify-center gap-3 bg-[#1A1A1A] text-[#FAF8F5] px-8 py-4 rounded-full font-medium hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10 transition-all duration-300 w-full active:scale-95"
          >
            <Mic size={18} className="group-hover:text-red-400 transition-colors" />
            <span>Start Recording</span>
          </button>
        </div>

      </div>
    </div>
  );
}
