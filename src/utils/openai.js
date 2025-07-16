import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_RETRIES = 5;

export class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.stabilityApiKey = process.env.STABILITY_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️  OpenAI API key not found. Using fallback responses.');
    }
    
    if (!this.stabilityApiKey) {
      console.warn('⚠️  Stability AI API key not found. Using fallback images.');
    }
  }

  async generateImage(prompt, filename) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      if (!this.apiKey) {
        console.log('🔄 Using fallback image URL (no API key)');
        return null;
      }
    
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/images/generations',
          {
            prompt,
            n: 1,
            size: "512x512",
            response_format: 'b64_json'  // Important: get image as base64
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );
    
        if (response.status === 200 && response.data?.data?.[0]?.b64_json) {
          const base64Data = response.data.data[0].b64_json;
          return Buffer.from(base64Data, 'base64'); // same as Stability output
        } else {
          throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
        }
      } catch (err) {
        const isRateLimit = err.response?.status === 429;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // backoff + jitter

        console.warn(`❌ Attempt ${attempt + 1} failed${isRateLimit ? ' (Rate Limit)' : ''}: ${err.message}`);
        if (attempt >= MAX_RETRIES - 1 || !isRateLimit) {
          throw err;
        }

        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
        await sleep(delay);
        attempt++;
      }
    }
  }

  async generateText(prompt, maxTokens = 1000) {
    if (!this.apiKey) {
      console.log('🔄 Using fallback response (no API key)');
      return this.getFallbackResponse(prompt);
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      return this.getFallbackResponse(prompt);
    }
  }

  getFallbackResponse(prompt) {
    if (prompt.includes('structured JSON')) {
      return JSON.stringify({
        episodes: [
          {
            title: "Episode 1: The Beginning",
            scenes: [
              {
                description: "A bustling futuristic city with flying vehicles and neon lights",
                dialogue: "In a world where technology and nature coexist, new adventures await."
              },
              {
                description: "A young protagonist discovers an ancient artifact glowing with mysterious energy",
                dialogue: "Some discoveries are destined to change the course of history."
              },
              {
                description: "The artifact activates, revealing a hidden world within our own",
                dialogue: "What we thought was reality was just the beginning of something greater."
              }
            ]
          },
          {
            title: "Episode 2: The Journey",
            scenes: [
              {
                description: "Our heroes venture into the newly discovered realm",
                dialogue: "Every step forward takes us further from everything we've known."
              },
              {
                description: "They encounter strange creatures and wondrous landscapes",
                dialogue: "Beauty and danger walk hand in hand in this new world."
              },
              {
                description: "A crucial decision must be made that will affect both worlds",
                dialogue: "The fate of two worlds now rests in our hands."
              }
            ]
          }
        ]
      });
    }
    
    if (prompt.includes('AI art prompt')) {
      return "A cinematic anime-style scene with detailed background, dramatic lighting, expressive characters, and dynamic composition suitable for young adult audiences.";
    }
    
    if (prompt.includes('voiceover')) {
      return "A compelling narration that captures the essence of adventure and discovery, perfect for engaging young minds.";
    }
    
    return "Generated content based on your request.";
  }
}