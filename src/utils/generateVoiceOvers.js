import axios from 'axios';
import dotenv from 'dotenv';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { createWriteStream } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // fallback default voice

const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

export const generateVoice = async (text, path) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🎙️ Requesting voiceover from ElevenLabs...');

      const audioStream = await elevenlabs.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
        modelId: 'eleven_multilingual_v2',
        text,
        outputFormat: 'mp3_44100_64',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.5,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      });

      const writer = createWriteStream(path);
      audioStream.pipe(writer);

      writer.on('finish', () => {
        console.log(`✅ Voiceover saved at: ${outputPath}`);
        resolve(outputPath);
      });

      writer.on('error', (err) => {
        console.error('❌ Error writing file:', err.message);
        reject(err);
      });

      audioStream.on('error', (err) => {
        console.error('❌ Stream error from ElevenLabs:', err.message);
        reject(err);
      });

    } catch (err) {
      console.error('❌ ElevenLabs API Error:', err?.message || err);
      reject(err);
    }
  });
};