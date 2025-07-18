import { OpenAIService } from '../utils/openai.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imageStylesByGenre = {
  cartoon: 'Clean, colorful, expressive; like early Disney films.',
  anime: "anime style, cinematic lighting, Studio Ghibli look, vivid color palette, 4K detail",
  fantasy: "epic fantasy concept art, dramatic lighting, painterly textures, high detail",
  cyberpunk: "cyberpunk style, neon lights, dark shadows, futuristic city, cinematic composition",
  pixel: "pixel art, retro 16-bit game style, vibrant colors, side-scroller layout",
  storybook: "watercolor storybook illustration, soft textures, hand-drawn feel, gentle palette",
  noir: "cinematic noir, heavy contrast, rain-soaked streets, moody lighting, muted colors"
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanOpenAIResponse(raw) {
  return raw
    .replace(/```json\s*/i, '')  // Remove starting ```json (case-insensitive)
    .replace(/```$/, '')         // Remove ending triple backticks if any
    .trim();                     // Remove extra whitespace
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

  async generateImageFromPrompt(prompts, requestId) {
    const results = await this.openai.generateImages(prompts);

    // Save to disk or DB
    for (const result of results) {
      if (result.imageBuffer) {
        const sceneNumber = result.scene;
        const episodeNumber = result.episode;

        const imageKey = `${requestId}/ep${episodeNumber}/scene${sceneNumber}.webp`;
        const imagePath = path.join(this.imagesDir, imageKey);

        fs.writeFileSync(imagePath, result.imageBuffer);
      }
    }
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

  async generateStory(topic, age_group, genre, subject) {
    const finalImageStyle = imageStylesByGenre[genre] || "cinematic, vivid, emotionally rich";

    const prompt = `You are a world-class educational story designer creating short fictional video series for Gen Z learners (ages ${age_group}) in the style of **${genre}**, focused on the subject: **${subject}**.

Your mission is to transform the following topic into a **visually rich, emotionally engaging, and intellectually clear** story that teaches the core concept while entertaining.

---

**Topic:** "${topic}"

---

**Goal:**  
Teach the core idea or concept clearly through story.  
Use fictional characters, cinematic visuals, and emotional narration — the audience must leave with a real understanding of the topic.

---

**Visual Style:**  
Use this global image style across all scenes for consistency:

> "${finalImageStyle}"  

Every image prompt must include this style implicitly or explicitly.

---

**Format:**  
Structure the story into **3 to 4 short episodes**.  
Each episode must include:
- A creative title
- Exactly **3 to 4 scenes**

Each scene must include:
- "description": A vivid visual description (setting, action, emotion)
- "voiceover": A short 1–3 line narration that explains what’s happening and helps teach the concept (NO character dialogue)
- "image_prompt": A rich prompt that can be used by DALL·E or similar models, combining the scene’s content with the global image style

---

**Guidelines:**
- Use cinematic pacing and emotional tension, but always return to the **core concept you're teaching**
- No dialogues — use only narrator-style voiceovers that explain visually what's happening and convey understanding
- Use fictional or anime-style characters if helpful, but **don’t invent fantasy history or mythology** unless needed to explain the concept
- Infuse real educational insights into the story naturally (use analogies, metaphors, visual examples)
- Every scene should:
  - Be visually unique and move the story forward
  - Reinforce or build toward **clear understanding** of the topic
- Keep language age-appropriate, emotionally resonant, and curiosity-driven
- Ensure **image prompts** are:
  - Visually descriptive and coherent
  - Consistent with the global image style
  - Include characters, setting, subject elements, and emotions
  - Add camera direction (e.g. close-up, wide shot) if helpful

---

**Output (Strict JSON format):**
{
  "image_style": "anime style, cinematic lighting, ultra-detailed, vibrant color palette, dramatic angles, 4K composition",
  "episodes": [
    {
      "title": "Episode 1: [Your title]",
      "scenes": [
        {
          "description": "A vivid visual of what's happening",
          "voiceover": "Narration for this scene",
          "image_prompt": "Prompt for DALL·E or similar model to generate this scene, using the global image style"
        }
        ...
      ]
    }
    ...
  ]
}
`;

    try {
      const response = await this.openai.generateText(prompt);
      console.log(response, 'response');
      return JSON.parse(cleanOpenAIResponse(response));
    } catch (error) {
      console.error('Error generating story:', error);
       throw error;
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
      const response = await this.openai.generateText(prompt, systemPromp);
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