'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import SetupScreen from '@/components/SetupScreen';
import ReviewScreen from '@/components/ReviewScreen';

export type WizardStep = 'setup' | 'recording' | 'processing' | 'review' | 'success';

export default function MeetingWizard() {
  const [step, setStep] = useState<WizardStep>('setup');
  
  // Shared Session State
  const [meetingTitle, setMeetingTitle] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  
  // Async State
  const [processingStatus, setProcessingStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Core Audio Hook
  const recorder = useAudioRecorder();

  // Handlers for Step Transitions
  const handleStartSession = (title: string, emails: string[]) => {
    setMeetingTitle(title);
    setParticipants(emails);
    setStep('recording');
    recorder.startRecording();
  };

  const handleEndMeeting = async () => {
    const blob = await recorder.stopRecording();
    if (blob) {
      setAudioBlob(blob);
      setStep('processing');
      setProcessingStatus('Uploading audio securely...');
      
      try {
        setProcessingStatus('Uploading & Synthesizing Audio...');
        
        // Use FormData to send the audio directly to our API route
        const formData = new FormData();
        formData.append('audio', blob, `meeting-${Date.now()}.webm`);
        formData.append('mimeType', blob.type);
        
        // Transcribe directly
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Transcription pipeline failed');
        }
        
        const data = await res.json();
        setTranscript(data.transcript);
        setSummary(data.summary);
        setStep('review');
      } catch (err) {
        console.error(err);
        alert('An error occurred during processing. Please try again.');
        setStep('setup');
      }
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: participants,
          meetingTitle: meetingTitle,
          summary: summary,
          transcript: transcript
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Email dispatch failed');
      }
      
      setStep('success');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to send emails.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#C9A84C]/30">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 lg:px-12 min-h-screen flex flex-col relative overflow-hidden">
        
        {/* Subtle noise overlay for texture (Taste-Skill) */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        {/* Header / Context Breadcrumb */}
        <header className="mb-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#1A1A1A]" />
            <span className="text-xs font-semibold tracking-widest uppercase text-[#1A1A1A]/60">Nura / Voice</span>
          </div>
          {step !== 'setup' && step !== 'success' && (
            <div className="text-xs text-[#1A1A1A]/40 font-mono tracking-tight bg-black/5 px-3 py-1 rounded-full">
              {meetingTitle || 'Untitled Session'}
            </div>
          )}
        </header>

        {/* Wizard Content Canvas */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          
          {step === 'setup' && (
            <SetupScreen onStart={handleStartSession} />
          )}

          {step === 'recording' && (
            <div className="space-y-12 text-center animate-in fade-in zoom-in-[0.98] duration-500 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse scale-150"></div>
                <div className="h-4 w-4 bg-red-500 rounded-full animate-ping absolute"></div>
                <div className="h-4 w-4 bg-red-500 rounded-full relative z-10"></div>
              </div>
              
              <div className="font-mono text-6xl sm:text-7xl font-light text-[#1A1A1A] tabular-nums tracking-tighter">
                {Math.floor(recorder.elapsedTime / 60).toString().padStart(2, '0')}:
                {(recorder.elapsedTime % 60).toString().padStart(2, '0')}
              </div>
              
              <button 
                onClick={handleEndMeeting}
                className="bg-red-500 text-white px-10 py-5 rounded-full font-medium tracking-wide hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95 flex items-center gap-3"
              >
                <div className="h-3 w-3 bg-white rounded-sm"></div>
                End Meeting
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-8 text-center animate-in fade-in duration-700 flex flex-col items-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 border-4 border-black/5 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#1A1A1A] rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1A1A1A] mb-2">Synthesizing...</h2>
                <p className="text-[#1A1A1A]/50 text-sm max-w-xs mx-auto">
                  {processingStatus}
                </p>
              </div>
              {/* Dev mode skip - conditionally rendered based on NODE_ENV later if needed */}
              <button 
                onClick={() => {
                  setTranscript("[00:00] Speaker A: Hello world.\n[00:05] Speaker B: Mock transcript active.");
                  setSummary({ executiveSummary: "Mock executive summary.", keyDecisions: ["Mock decision"], actionItems: ["Mock action"] });
                  setStep('review');
                }}
                className="mt-8 text-[10px] uppercase tracking-widest text-[#1A1A1A]/20 hover:text-[#1A1A1A]/40 transition-colors font-mono"
              >
                Dev: Skip Pipeline
              </button>
            </div>
          )}

          {step === 'review' && (
            <ReviewScreen 
              transcript={transcript}
              summary={summary}
              onSend={handleSendEmails}
              isSending={isSending}
            />
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#1A1A1A] text-[#FAF8F5] mb-4 shadow-2xl shadow-black/20">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Dispatched.</h2>
                <p className="text-[#1A1A1A]/50">The brief has been encrypted and sent to all participants.</p>
              </div>
              <button 
                onClick={() => setStep('setup')}
                className="mt-12 text-[#1A1A1A]/40 text-sm font-semibold tracking-widest uppercase hover:text-[#1A1A1A] transition-colors pb-1 border-b border-transparent hover:border-[#1A1A1A]"
              >
                Start New Session
              </button>
            </div>
          )}
          
        </div>
      </div>
    </main>
  );
}
