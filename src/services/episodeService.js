import { OpenAIService } from '../utils/openai.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export class EpisodeService {
  constructor() {
    this.openai = new OpenAIService();
    this.imagesDir = path.join(__dirname, '..', '..', 'tmp');
    this.ensureImagesDirectory();
  }

  ensureImagesDirectory() {
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  async generateImageFromPrompt(prompt) {
    await delay(1200); // 1.2 sec delay between image calls
    return await this.openai.generateImage(prompt);
  }

  async saveImageLocally(imageBuffer, filePath) {
    try {
      if (!imageBuffer) {
        // Return fallback URL for placeholder
        return `/images/fallback.webp`;
      }
      
      // Save image to local file system
      fs.writeFileSync(filePath, imageBuffer);
      
      // Return local URL path
      return  filePath;
    } catch (error) {
      console.error('Local Image Save Error:', error.message);
      // Return fallback URL
      return `/images/fallback.webp`;
    }
  }

  async saveVoiceOverLocally(audioBuffer, key) {
    try {
      if (!audioBuffer) {
        // Return fallback URL for placeholder
        return `/audio/fallback.mp3`;
      }
      
      // Create directory structure if it doesn't exist
      const audioKey = key.replace('.wav', '.mp3');
      const filePath = path.join(this.imagesDir, audioKey);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      // Save image to local file system
      fs.writeFileSync(filePath, audioBuffer);
      
      // Return local URL path
      return `/audio/${webpKey}`;
    } catch (error) {
      console.error('Local Audio Save Error:', error.message);
      // Return fallback URL
      return `/audio/fallback.webp`;
    }
  }

  async generateStory(topic, age_group, genre) {
    const prompt = `You are a creative storyteller for a Gen Z audience.
Generate a fictional but educational story in the ${genre} style suitable for ${age_group}.
Topic: "${topic}"
Structure it into 3-4 episodes, each with a title and 6-8 scenes.
Each scene must include a description (visual setting) and dialogue (1–2 line exchange or narration).
Return your response as structured JSON with this exact format:
{
  "episodes": [
    {
      "title": "Episode 1: [Your Title]",
      "scenes": [
        {
          "description": "visual scene description",
          "dialogue": "short 1-2 line narration or conversation"
        }
      ]
    }
  ]
}`;

    try {
      const response = await this.openai.generateText(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating story:', error);
      // Fallback story structure
      return this.getFallbackStory(topic, age_group, genre);
    }
  }

  async generateImagePrompt(description, genre, age_group) {
    const prompt = `Generate a vivid AI art prompt.
Age group: ${age_group}, Genre: ${genre}
Scene: "${description}"
Return:
"A ${genre} style scene showing ${description}, with detailed background, lighting, character emotion, and cinematic composition."`;

    try {
      const response = await this.openai.generateText(prompt);
      return response.replace(/"/g, '').trim();
    } catch (error) {
      console.error('Error generating image prompt:', error);
      return `A ${genre} style scene showing ${description}, with detailed background, lighting, character emotion, and cinematic composition.`;
    }
  }

  async generateVoiceoverScript(dialogue, age_group) {
    const prompt = `Convert this dialogue into a narration voiceover line for a ${age_group}-age audience.
Dialogue: "${dialogue}"
Return a clear, emotionally engaging narration line.`;

    try {
      const response = await this.openai.generateText(prompt);
      return response.replace(/"/g, '').trim();
    } catch (error) {
      console.error('Error generating voiceover script:', error);
      return dialogue; // Fallback to original dialogue
    }
  }

  getFallbackStory(topic, age_group, genre) {
    return {
      episodes: [
        {
          title: "Episode 1: The Discovery",
          scenes: [
            {
              description: "A mysterious laboratory filled with ancient artifacts and glowing screens",
              dialogue: "What we discovered that day would change everything we thought we knew."
            },
            {
              description: "Close-up of a weathered journal with cryptic symbols and diagrams",
              dialogue: "The journal spoke of a world that should have been impossible."
            },
            {
              description: "A character stares out at a vast, unknown landscape",
              dialogue: "But here we were, standing at the edge of that very world."
            }
          ]
        },
        {
          title: "Episode 2: First Contact",
          scenes: [
            {
              description: "Two characters cautiously approach a shimmering portal",
              dialogue: "Are you sure about this? There's no going back."
            },
            {
              description: "The moment of stepping through the portal with swirling energy",
              dialogue: "Sometimes the greatest discoveries require the greatest leaps of faith."
            },
            {
              description: "First glimpse of the new world with its unique inhabitants",
              dialogue: "We were no longer the only intelligent life in the universe."
            }
          ]
        }
      ]
    };
  }
}