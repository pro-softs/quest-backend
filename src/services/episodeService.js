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
    const prompt = `You are a world-class story designer creating short fictional but educational video series for a Gen Z audience (ages ${age_group}).

Your goal is to turn the following topic into a highly engaging, imaginative, and emotionally resonant video story in the ${genre} style. 
The story must both entertain and teach — blending real knowledge with fictional storytelling to spark curiosity and understanding.

Topic: "${topic}"

Format:
- Structure the story into **3 to 4 episodes** episodes.
- Each episode must have a title and must have **8 to 10 scenes**.  
- Each scene must include:
  - "description": a vivid visual description of the scene (setting, action, emotion)
  - "dialogue": a short 1–2 line narration or character conversation driving the story

Story guidelines:
- Return exactly **8 to 10 scenes per episode**. Do **not shorten** or merge scenes.
- Ensure continuity of characters, emotional tone, and narrative across all episodes and scenes.
- Use age-appropriate language and themes for ages ${age_group}.
- Infuse subtle educational insights (facts, historical context, scientific ideas) through storytelling, not as exposition dumps.
- Keep the pacing cinematic: with tension buildup, twists, and resolution.
- Make sure the story feels like an anime-style or cinematic adventure: dynamic, visual, and emotionally layered.
- Each scene should be unique and move the story forward.

Output:
Return your response as structured JSON in this exact format:
{
  "episodes": [
    {
      "title": "Episode 1: [Title]",
      "scenes": [
        {
          "description": "Visual scene description",
          "dialogue": "Narration or conversation"
        }
      ]
    }
  ]
}
`;

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
    const systemPromp = `You are a helpful assistant that creates safe and creative anime-style scene prompts for AI image generation (e.g. DALL·E). Your job is to take a scene description from an educational video and turn it into a vivid, emotionally resonant, and safe visual prompt suitable for AI image generation.

Always make the scene feel cinematic, inspiring, and Gen Z-friendly. Avoid unsafe, violent, or graphic interpretations.

Output only the prompt as a single string, no explanations.
`

    const prompt = `Generate a vivid anime-style scene prompt for the following educational video scene.

Scene: "${description}"
Genre: "${genre}"
Target audience age: "${age_group}"

Make the prompt rich in visuals, lighting, background, and emotion.`;

    try {
      const response = await this.openai.generateText(prompt, systemPromp = systemPromp);
      return response.replace(/"/g, '').trim();
    } catch (error) {
      console.error('Error generating image prompt:', error);
      return `A ${genre} style scene showing ${description}, with detailed background, lighting, character emotion, and cinematic composition.`;
    }
  }

  async generateVoiceoverScript(dialogue, age_group) {
    const prompt = `You are writing a short, emotionally engaging narration line for a cinematic anime-style scene from “Quest,” a storytelling platform for ages ${age_group}.

Your goal is to convert the following **dialogue line** into a compelling **narration-style voiceover**. Make it flow naturally and feel like part of an exciting story (not like an explanation).

Keep it short (1–2 lines), clear, emotional, and age-appropriate.

Dialogue: "${dialogue}"

Return: a single narration line only.
`;

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