const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

console.log('Testing GoogleGenAI import');
const ai = new GoogleGenAI({ apiKey: 'dummy' });
console.log('Upload method type:', typeof ai.files.upload);
