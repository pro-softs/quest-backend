import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs-extra';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Rachel';

export async function generateVoice(text, outputPath) {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.6, similarity_boost: 0.8 },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );
  
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
  
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
}