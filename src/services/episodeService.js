import { OpenAIService } from '../utils/openai.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bannedMap = {
  "blood": "bright red paint",
  "bloody": "paint-splattered",
  "gun": "mechanical device",
  "knife": "kitchen utensil",
  "sword": "ceremonial prop",
  "battle": "friendly competition",
  "war": "large-scale challenge",
  "kill": "defeat",
  "dead": "inactive",
  "death": "disappearance",
  "corpse": "statue",
  "explosion": "burst of light",
  "bomb": "large balloon",
  "attack": "approach",
  "shoot": "launch",
  "injury": "paint mark",
  "nude": "fully clothed",
  "naked": "fully dressed",
  "violence": "intense action"
};

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

  setVideoId(vId) {
    this.videoId = vId;
  }

  ensureImagesDirectory() {
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  sanitizeStory(storyJson) {
    const safeStory = JSON.parse(JSON.stringify(storyJson)); // deep copy
      safeStory.episodes.forEach(episode => {
        episode.scenes.forEach(scene => {
          scene.image_prompt = sanitizePrompt(scene.image_prompt);
        });
      });
    return safeStory;
  }

  sanitizePrompt(prompt) {
    let clean = prompt;
    for (const [bad, good] of Object.entries(bannedMap)) {
      const regex = new RegExp(`\\b${bad}\\b`, "gi");
      clean = clean.replace(regex, good);
    }
    // Remove explicit text-in-image requests
    clean = clean.replace(/\b(text|caption|quote|label|slogan|sign)\b/gi, "");
    
    // Append safe grounding
    clean += ", safe educational scene, no harmful content, G-rated, wholesome, age-appropriate";
    
    return clean.trim();
  }

  async generateImageFromPrompt(prompts) {
    const results = await this.openai.generateImages(prompts);

    // Save to disk or DB
    for (const result of results) {
      if (result.imageBuffer) {
        const sceneNumber = result.scene;
        const episodeNumber = result.episode;

        const imageKey = `${this.videoId}/ep${episodeNumber}/scene${sceneNumber}.webp`;
        const imagePath = path.join(this.imagesDir, imageKey);

        fs.writeFileSync(imagePath, result.imageBuffer);

        // Update scene in database with image URL
        await prisma.scene.update({
          where: { id: result.dbId },
          data: { imageUrl: `${imagePath}` }
        });
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

  async generateStory(topic, age_group, genre, subject, no_episodes = 3, no_scenes = 6) {
    const finalImageStyle = imageStylesByGenre[genre] || "cinematic, vivid, emotionally rich";

    const prompt = `You are a world-class educational story designer creating short fictional video series for Gen Z learners (ages ${age_group}) in the style of **${genre}**, focused on the subject: **${subject}**.

Your mission: Transform the following topic into a **visually rich, emotionally engaging, and intellectually clear** story that teaches the core concept while entertaining — without including ANY unsafe or sensitive imagery.

---
**Topic:** "${topic}"
---

**Safety Rules (Mandatory):**
- The story must be **G-rated** and suitable for all audiences.
- No unsafe, violent, sexual, political, or discriminatory content.
- No weapons, gore, blood, injuries, explosions, or depictions of harm.
- Replace unsafe concepts with safe, symbolic, or playful equivalents.
- No text, captions, slogans, or symbols visible in the scene.
- Focus on **positive, inspiring, curiosity-driven visuals**.
- Use sports, nature, games, puzzles, or friendly competition instead of battles or conflict.

---
**Goal:**  
Teach the core idea or concept clearly through story.  
Use fictional characters, cinematic visuals, and emotional narration — the audience must leave with a real understanding of the topic.

---
**Visual Style:**  
Apply this style in every image:
> "${finalImageStyle}"

---
**Format:**  
Structure the story into **${no_episodes} short episodes**.  
Each episode must include:
- A creative title
- Exactly **${no_scenes} scenes**

Each scene must include:
- "description": Vivid visual description (setting, action, emotion), always safe and positive
- "voiceover": Short 1–3 line narration explaining what’s happening and teaching the concept (NO dialogue)
- "image_prompt": Rich DALL·E-compatible prompt combining the scene’s content with the global style, **already safe for G-rated output**

---
**Guidelines:**
- Cinematic pacing and emotional tension are welcome — but only in **safe, wholesome ways**.
- Use analogies, metaphors, and creative visuals to explain the educational point.
- All scenes must be visually unique, safe, and build toward understanding.
- Age-appropriate, curiosity-driven language.
- Each image prompt must:
  - Be coherent and visually descriptive
  - Include characters, setting, subject elements, and emotions
  - Match the global style
  - Contain **no unsafe or restricted terms**

---
**Output (Strict JSON):**
{
  "image_style": "${finalImageStyle}",
  "episodes": [
    {
      "title": "Episode 1: [Your title]",
      "scenes": [
        {
          "description": "Safe, vivid visual description",
          "voiceover": "Narration for this scene",
          "image_prompt": "Safe, vivid image prompt with no unsafe content"
        }
      ]
    }
  ]
}
`;

    try {
      const response = await this.openai.generateText(prompt, this.videoId);
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
      const response = await this.openai.generateText(prompt, this.videoId, systemPromp);
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
      const response = await this.openai.generateText(prompt, this.videoId);
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