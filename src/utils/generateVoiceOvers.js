import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const generateVoice = async (text, outputPath) => {
  const voice = 'nova'; // Options: alloy, echo, fable, onyx, nova, shimmer
  const model = 'tts-1'; // or tts-1-hd

  try {
    console.log('🎙️ Requesting TTS from OpenAI...');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model,
        voice,
        input: text,
        response_format: 'mp3',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 60000,
      }
    );

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('✅ Saved TTS audio to:', outputPath);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    if (error.response) {
      console.error('❌ OpenAI TTS API Error:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error('❌ Request Failed:', error.message);
    }
    throw error;
  }
};