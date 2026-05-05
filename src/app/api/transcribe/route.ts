import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The App Router allows configuring max duration for API routes on Vercel
// Since transcription and summarization of a 60 min meeting takes time, we need a high limit.
// Vercel Pro allows up to 300s, Hobby up to 60s. For long meetings, this might hit a timeout on Hobby.
// But for now we set maxDuration to 300.
export const maxDuration = 60; 

export async function POST(request: Request) {
  let tempFilePath: string | null = null;
  let uploadedFileRef: any = null;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const mimeType = formData.get('mimeType') as string || 'audio/webm';

    if (!audioFile) {
      return NextResponse.json({ error: 'Missing audio file in request' }, { status: 400 });
    }

    console.log(`[Transcription] Received audio file via FormData: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    // 1. Convert uploaded File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log(`[Transcription] Uploading file to Gemini File API (size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

    // 2. Upload to Gemini File API
    // Using the new @google/genai SDK format
    uploadedFileRef = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: mimeType || 'audio/webm',
        displayName: 'Meeting Audio',
      }
    });

    console.log(`[Transcription] File uploaded to Gemini: ${uploadedFileRef.name}`);

    // 3. Prompt Gemini for Transcription + Diarization
    console.log(`[Transcription] Initiating transcription...`);
    const transcriptionPrompt = `You are a highly skilled meeting transcription and analysis AI.
The attached audio file contains a real-life meeting. The speakers may speak in Romanian, English, or seamlessly mix both languages (code-switching).

Your task is to provide a highly accurate, verbatim transcript with strict speaker diarization.

CRITICAL INSTRUCTIONS:
1. SPEAKER IDENTIFICATION: Identify each speaker consistently (e.g., Speaker A, Speaker B, Speaker C).
2. TIMESTAMPS: Provide a timestamp [MM:SS] at the beginning of each new speaker's turn.
3. ORIGINAL LANGUAGE: The primary language spoken in this audio is Romanian. Transcribe exactly what is said. Pay extreme attention to Romanian grammar, spelling, and diacritics (ă, â, î, ș, ț). Do NOT translate the transcript. If they code-switch mid-sentence, the transcript must reflect that exactly.
4. FORMAT: Use the following format strictly:
   [MM:SS] Speaker X: <text>

Example:
[00:00] Speaker A: Salut! How is everyone doing today?
[00:05] Speaker B: Suntem bine, ready to start the presentation.

Now, transcribe the entire attached meeting audio:`;

    const transcriptionResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          fileData: {
            fileUri: uploadedFileRef.uri,
            mimeType: uploadedFileRef.mimeType
          }
        }, // The file we just uploaded
        transcriptionPrompt
      ],
      config: {
        temperature: 0.1, // Low temperature for high factual accuracy
      }
    });

    const transcript = transcriptionResponse.text;
    console.log(`[Transcription] Transcription complete. Length: ${transcript?.length} characters.`);

    // 4. Summarization Pipeline
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
${transcript}`;

    const summaryResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [summaryPrompt],
      config: {
        temperature: 0.2,
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

    console.log(`[Transcription] Process complete! Returning payload.`);

    // Cleanup: We don't necessarily need to delete from Gemini File API immediately, 
    // but it's good practice. Google deletes them after 48h automatically.
    try {
      await ai.files.delete({ name: uploadedFileRef.name });
    } catch (e) {
      console.warn('Could not delete file from Gemini immediately:', e);
    }

    // Cleanup temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return NextResponse.json({
      transcript,
      summary: summaryData,
    });

  } catch (error: any) {
    console.error('[Transcription Error]:', error);
    
    // Cleanup on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return NextResponse.json({ error: error.message || 'An unknown error occurred during transcription' }, { status: 500 });
  }
}
