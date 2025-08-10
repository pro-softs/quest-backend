import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { DalleImageGenerator } from './imagegen.js';
import { APILogger } from './logger.js';

dotenv.config();

const MAX_RETRIES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });

    if (!this.apiKey) {
      console.warn('⚠️  OpenAI API key not found. Using fallback responses.');
    }
  }

  async generateImages(prompts) {
    const dalle = new DalleImageGenerator(this.client);

    const results = await dalle.generateImagesInParallel(prompts);
    return results;
  }

  async generateText(prompt, videoId, systemPrompt) {
    let maxTokens = 4000;

    if (!this.apiKey) {
      console.log('🔄 Using fallback response (no API key)');
      return null;
    }

    console.log('prompt', prompt);

    try {
      const chatResponse = await this.client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      // Log successful text generation
      const usage = chatResponse.usage;
      const tokens = usage?.total_tokens || maxTokens;
      const cost = APILogger.calculateCost(tokens, 'gpt-4.1-mini');
      await APILogger.logAPIUsage(videoId, tokens, cost, 'text_generation');

      console.log(chatResponse, 'chatresponse');
      return chatResponse.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.getFallbackResponse(prompt);
    }
  }

  async generateModeration(description) {
    try {
      const moderationRes = await this.client.moderations.create({ input: description });
      const results = moderationRes.data.results[0];
      return results;
    } catch (error) {
      console.error('OpenAI Moderaion Error:', error);
      return null;
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
                dialogue: "In a world where technology and nature coexist, new adventures await.",
              },
              {
                description: "A young protagonist discovers an ancient artifact glowing with mysterious energy",
                dialogue: "Some discoveries are destined to change the course of history.",
              },
              {
                description: "The artifact activates, revealing a hidden world within our own",
                dialogue: "What we thought was reality was just the beginning of something greater.",
              },
            ],
          },
          {
            title: "Episode 2: The Journey",
            scenes: [
              {
                description: "Our heroes venture into the newly discovered realm",
                dialogue: "Every step forward takes us further from everything we've known.",
              },
              {
                description: "They encounter strange creatures and wondrous landscapes",
                dialogue: "Beauty and danger walk hand in hand in this new world.",
              },
              {
                description: "A crucial decision must be made that will affect both worlds",
                dialogue: "The fate of two worlds now rests in our hands.",
              },
            ],
          },
        ],
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
