import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  fs.writeFileSync('test_audio.txt', 'dummy audio content');
  try {
    const uploadResult = await ai.files.upload({
      file: 'test_audio.txt',
      config: {
        mimeType: 'text/plain',
        displayName: 'Test File',
      }
    });
    
    try {
        const response2 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
               fileData: {
                  fileUri: uploadResult.uri,
                  mimeType: uploadResult.mimeType
               }
            },
            "What is in this file?"
          ]
        });
        console.log("Test 2 worked:", response2.text);
    } catch (e2) {
        console.error("Test 2 failed:", e2.message);
    }

  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
