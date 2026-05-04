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
    console.log("Upload Result:", Object.keys(uploadResult));
    console.log("Upload Result uri:", uploadResult.uri);
    
    // Test different ways of passing it to generateContent
    try {
        const response1 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            uploadResult,
            "What is in this file?"
          ]
        });
        console.log("Test 1 worked");
    } catch (e1) {
        console.error("Test 1 failed:", e1.message);
    }
    
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
        console.log("Test 2 worked");
    } catch (e2) {
        console.error("Test 2 failed:", e2.message);
    }

  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
