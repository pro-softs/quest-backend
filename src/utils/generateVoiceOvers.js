import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs-extra';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Rachel';

export async function generateVoice(text, outputPath) {
  console.log(text);
  try {
    console.log('🎙️ Generating voiceover from ElevenLabs...');

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    console.log(`🔊 Streaming audio to file: ${outputPath}`);
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('✅ Voiceover saved successfully.');
        resolve();
      });
      writer.on('error', (err) => {
        console.error('❌ Error writing audio file:', err);
        reject(err);
      });
    });

  } catch (error) {
    if (error.response) {
      const errorText = Buffer.isBuffer(error.response.data)
        ? error.response.data.toString()
        : JSON.stringify(error.response.data, null, 2);

      console.error('❌ ElevenLabs API error:', {
        status: error.response.status,
        message: errorText,
      });
    } else if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout: ElevenLabs request took too long');
    } else {
      console.error('❌ Unexpected error in voiceover generation:', error.message);
    }

    throw new Error('Failed to generate voiceover');
  }
}