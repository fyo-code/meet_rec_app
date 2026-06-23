import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes — localhost has no limit, Vercel Pro allows 300s

export async function POST(request: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const { fileUri, mimeType, participantCount } = await request.json();

    if (!fileUri || !mimeType) {
      return NextResponse.json({ error: 'No fileUri or mimeType provided' }, { status: 400 });
    }

    // ── 1. Transcription Pipeline (with auto-continuation) ──────────────
    console.log(`[Transcription] Starting for URI: ${fileUri}`);
    console.log(`[Transcription] Participant count: ${participantCount || 'not specified'}`);

    const basePrompt = `You are a highly skilled meeting transcription and analysis AI.
The attached audio file contains a real-life meeting. The speakers may speak in Romanian, English, or seamlessly mix both languages (code-switching).

Your task is to provide a highly accurate, verbatim transcript with strict speaker diarization.

CRITICAL INSTRUCTIONS:
1. SPEAKER IDENTIFICATION: There are exactly ${participantCount || 'multiple'} speakers in this meeting. Distinguish their voices carefully and label them Speaker A, Speaker B, Speaker C, etc.
2. TIMESTAMPS: Provide a timestamp [MM:SS] at the beginning of each new speaker's turn.
3. ORIGINAL LANGUAGE: The primary language spoken in this audio is Romanian. Transcribe exactly what is said. Pay extreme attention to Romanian grammar, spelling, and diacritics (ă, â, î, ș, ț). Do NOT translate the transcript. If they code-switch mid-sentence, the transcript must reflect that exactly.
4. FORMAT: Use the following format strictly:
   [MM:SS] Speaker X: <text>

Example:
[00:00] Speaker A: Salut! How is everyone doing today?
[00:05] Speaker B: Suntem bine, ready to start the presentation.

Now, transcribe the entire attached meeting audio:`;

    // Helper: extract the last [MM:SS] timestamp from a transcript chunk
    const getLastTimestamp = (text: string): string | null => {
      const matches = text.match(/\[(\d{1,2}:\d{2})\]/g);
      return matches ? matches[matches.length - 1].replace(/[\[\]]/g, '') : null;
    };

    // Auto-continuation loop: if Gemini hits its output ceiling, keep going
    const MAX_CONTINUATIONS = 10; // Safety cap (covers ~10 hours of meetings)
    let fullTranscript = '';

    for (let attempt = 0; attempt < MAX_CONTINUATIONS; attempt++) {
      const isFirstAttempt = attempt === 0;
      const lastTimestamp = getLastTimestamp(fullTranscript);

      const prompt = isFirstAttempt
        ? basePrompt
        : `Continue transcribing the same meeting audio from timestamp [${lastTimestamp}] onward. 
Pick up EXACTLY where the previous transcription ended. Do NOT repeat any content before [${lastTimestamp}].
Use the same format: [MM:SS] Speaker X: <text>
Continue until the end of the audio:`;

      console.log(`[Transcription] Attempt ${attempt + 1}${!isFirstAttempt ? ` (continuing from ${lastTimestamp})` : ''}...`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: mimeType
            }
          },
          prompt
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 65536,
        }
      });

      const chunkText = response.text || '';
      const finishReason = (response as any).candidates?.[0]?.finishReason;
      const safetyRatings = (response as any).candidates?.[0]?.safetyRatings;
      
      console.log(`[Transcription] Attempt ${attempt + 1} done. Chunk: ${chunkText.length} chars. Finish: ${finishReason || 'N/A'}`);
      
      // If we got 0 chars, log the full response for debugging
      if (chunkText.length === 0) {
        console.error(`[Transcription] WARNING: Empty response from Gemini!`);
        console.error(`[Transcription] Full response candidates:`, JSON.stringify((response as any).candidates, null, 2));
        console.error(`[Transcription] Safety ratings:`, JSON.stringify(safetyRatings, null, 2));
      }

      fullTranscript += (isFirstAttempt ? '' : '\n') + chunkText;

      // If the model finished naturally (not truncated), we're done
      if (finishReason !== 'MAX_TOKENS') {
        console.log(`[Transcription] Complete! Total transcript: ${fullTranscript.length} chars across ${attempt + 1} call(s).`);
        break;
      }

      console.log(`[Transcription] Output was truncated (MAX_TOKENS). Auto-continuing...`);
    }

    // ── 2. Summarization Pipeline ───────────────────────────────────────
    console.log(`[Transcription] Initiating summarization...`);
    const summaryPrompt = `Based on the following meeting transcript, provide a professional and concise summary.

CRITICAL INSTRUCTION: ALL OUTPUT TEXT (except JSON keys) MUST BE WRITTEN IN ROMANIAN.

Extract the following:
1. "overview": A brief 1-2 sentence overview of what the entire meeting was about and the main outcome (in Romanian).
2. "checklist": A bulleted list of tasks or things that need to be finished/done based on the discussion (in Romanian).

Return the result STRICTLY as a valid JSON object matching this schema:
{
  "overview": "string",
  "checklist": ["string", "string"]
}

Do NOT wrap the JSON in markdown code blocks (\`\`\`json). Return ONLY the raw JSON string.

Transcript:
${fullTranscript}`;

    const summaryResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [summaryPrompt],
      config: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });

    let summaryData;
    try {
      summaryData = JSON.parse(summaryResponse.text || "{}");
    } catch (parseError) {
      console.error('Failed to parse summary JSON:', summaryResponse.text);
      summaryData = { overview: summaryResponse.text, checklist: [] };
    }

    console.log(`[Transcription] Pipeline complete! Returning payload.`);

    return NextResponse.json({
      transcript: fullTranscript,
      summary: summaryData,
    });

  } catch (error: any) {
    console.error('[Transcription Error]:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred during transcription' }, { status: 500 });
  }
}
