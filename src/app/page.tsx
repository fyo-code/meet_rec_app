'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import SetupScreen from '@/components/SetupScreen';
import ReviewScreen from '@/components/ReviewScreen';
import { MessageSquareText, ChevronDown, ChevronUp } from 'lucide-react';

export type WizardStep = 'setup' | 'recording' | 'processing' | 'review' | 'success';

export default function MeetingWizard() {
  const [step, setStep] = useState<WizardStep>('setup');
  
  // Shared Session State
  const [meetingTitle, setMeetingTitle] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(2);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  
  // Async State
  const [processingStatus, setProcessingStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  // UI State
  const [showLiveTranscript, setShowLiveTranscript] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Core Audio Hook
  const recorder = useAudioRecorder();

  // Auto-scroll live transcript
  useEffect(() => {
    if (showLiveTranscript && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [recorder.liveTranscript, showLiveTranscript]);

  // Handlers for Step Transitions
  const handleStartSession = (title: string, emails: string[], count: number) => {
    setMeetingTitle(title);
    setParticipants(emails);
    setParticipantCount(count);
    setStep('recording');
    recorder.startRecording();
  };

  const handleEndMeeting = async () => {
    const blob = await recorder.stopRecording();
    if (blob) {
      setAudioBlob(blob);
      setStep('processing');
      setProcessingStatus('Uploading & Synthesizing Audio...');
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');

        // 1. Upload audio directly to Google's servers using the Resumable Protocol
        // This completely bypasses Vercel's 4.5MB payload limit, and Google's 5MB single-request limit.
        console.log(`[Upload] Audio blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`);
        const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
            'X-Goog-Upload-Header-Content-Type': blob.type,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: { display_name: meetingTitle || "Meeting Recording" } })
        });

        if (!initRes.ok) {
          throw new Error('Failed to initialize audio upload with Gemini');
        }

        const uploadUrl = initRes.headers.get('x-goog-upload-url');
        if (!uploadUrl) {
          throw new Error('Failed to get upload URL from Gemini');
        }

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Command': 'upload, finalize',
            'X-Goog-Upload-Offset': '0',
          },
          body: blob
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload audio bytes to Gemini');
        }

        const uploadData = await uploadRes.json();
        const fileUri = uploadData.file.uri;
        const fileName = uploadData.file.name; // e.g. "files/abc123"
        let fileState = uploadData.file.state;

        console.log(`[Upload] Upload complete. URI: ${fileUri}, State: ${fileState}, Name: ${fileName}`);

        // 2. CRITICAL: Wait for file to be fully processed before transcribing
        // Large audio files need time for Google to index them. If we send a transcription
        // request while state is still PROCESSING, Gemini returns 0 characters.
        if (fileState === 'PROCESSING') {
          setProcessingStatus('Audio uploaded. Waiting for Google to process the file...');
          console.log(`[Upload] File is still PROCESSING. Polling until ACTIVE...`);

          const MAX_POLLS = 60; // Up to 5 minutes of polling (60 × 5s)
          for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds between polls
            
            const statusRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
            );
            const statusData = await statusRes.json();
            fileState = statusData.state;
            
            console.log(`[Upload] Poll ${i + 1}: state = ${fileState}`);
            
            if (fileState === 'ACTIVE') {
              console.log(`[Upload] File is now ACTIVE. Proceeding to transcription.`);
              break;
            }
            if (fileState === 'FAILED') {
              throw new Error('Google failed to process the audio file. Please try recording again.');
            }
          }

          if (fileState !== 'ACTIVE') {
            throw new Error('Audio file processing timed out. The file may be too large or corrupted.');
          }
        }

        setProcessingStatus('Transcribing & analyzing your meeting...');

        // 3. Pass only the lightweight file URI string to our API route
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileUri: fileUri,
            mimeType: blob.type,
            participantCount: participantCount
          })
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
            <div className="w-full max-w-lg mx-auto flex flex-col items-center animate-in fade-in zoom-in-[0.98] duration-500">
              
              {/* Primary Recording Controls */}
              <div className="space-y-10 text-center flex flex-col items-center w-full z-20 pb-4 relative">
                <div className="relative flex items-center justify-center mt-4">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse scale-[2.5]"></div>
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

                {/* Toggle Live Transcript Button */}
                <button 
                  onClick={() => setShowLiveTranscript(!showLiveTranscript)}
                  className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors mt-2 py-3 px-6 rounded-full hover:bg-black/5 active:scale-95"
                >
                  <MessageSquareText size={16} />
                  {showLiveTranscript ? 'Hide Live Transcript' : 'Show Live Transcript'}
                  {showLiveTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Live Transcript Roll-down */}
              <div 
                className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${showLiveTranscript ? 'max-h-[50vh] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-5 sm:p-6 rounded-[2rem] bg-white/60 border border-black/5 backdrop-blur-md max-h-[40vh] overflow-y-auto shadow-sm relative">
                  {!recorder.liveTranscript ? (
                    <div className="flex flex-col items-center justify-center h-24 text-[#1A1A1A]/40 italic text-sm font-medium animate-pulse">
                      Listening to audio...
                    </div>
                  ) : (
                    <div className="text-[#1A1A1A]/80 text-lg sm:text-xl leading-relaxed font-medium">
                      {recorder.liveTranscript}
                      <span className="inline-block w-2.5 h-5 bg-red-500/60 animate-pulse ml-1.5 align-middle rounded-sm"></span>
                      <div ref={transcriptEndRef} className="h-4" />
                    </div>
                  )}
                </div>
              </div>

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
