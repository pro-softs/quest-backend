import express from 'express';
import { generateEpisodes } from '../controllers/episodeController.js';
import { validateEpisodeRequest } from '../middleware/validation.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { generateVoice } from '../utils/generateVoiceOvers.js';
import { buildAllEpisodes, createConcatListFilesForAllEpisodes, createScenes, cleanupEpisodeFolder } from '../utils/ffmpegPipeline.js';

import { EpisodeService } from '../services/episodeService.js';
import { exec } from 'child_process';
import { uploadAllEpisodes } from '../utils/uploadVideo.js';
import { authenticateToken } from '../middleware/auth.js';

import { videoGenerationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, '..', '..', 'tmp');

router.post('/generate-episodes',  videoGenerationLimiter, authenticateToken, validateEpisodeRequest, generateEpisodes);

router.post('/generate-scenes', authenticateToken,  async (req, res) => {
  const { videoId } = req.body;
  const episodeService = new EpisodeService();

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  // Get video with episodes and scenes from database
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      episodes: {
        orderBy: { orderIndex: 'asc' },
        include: {
          scenes: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }
    }
  });

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const episodes = video.episodes;

  try {
    const prompts = [];

    episodes.forEach((episode, episodeIndex) => {
      episode.scenes.forEach((scene) => {
        prompts.push({
          episode: episodeIndex + 1,
          scene: scene.sceneId,
          dbId: scene.id,
          prompt: scene.imagePrompt,
        });
      });
    });

    await episodeService.generateImageFromPrompt(prompts, videoId);
    res.json({ status: 'done_images', videoId });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

router.post('/generate-voiceovers', authenticateToken,  async (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  // Get video with episodes and scenes from database
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      episodes: {
        orderBy: { orderIndex: 'asc' },
        include: {
          scenes: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }
    }
  });

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const episodes = video.episodes;

  try {
    for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
      const ep = episodes[epIndex];
      const epDir = path.join(TMP_DIR, videoId, `ep${epIndex + 1}`);
      await fs.ensureDir(epDir);

      for (let scIndex = 0; scIndex < ep.scenes.length; scIndex++) {
        const scene = ep.scenes[scIndex];
        const sceneNumber = scene.sceneId || scIndex + 1;

        const audioKey = `${videoId}/ep${epIndex + 1}/scene${sceneNumber}.mp3`;
        const voicePath = path.join(TMP_DIR, audioKey);

        await generateVoice(scene.voiceover, voicePath);
        
        // Update scene in database with audio URL
        await prisma.scene.update({
          where: { id: scene.id },
          data: { audioUrl: `/${voicePath}` }
        });
      }
    }

    res.json({ status: 'done_voice', videoId });
  } catch (err) {
    console.error('Voiceover generation error:', err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

router.post("/compile-episodes", authenticateToken, async (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  // Get video with episodes and scenes from database
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      episodes: {
        orderBy: { orderIndex: 'asc' },
        include: {
          scenes: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }
    }
  });

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const episodes = video.episodes;

  try {
    await createScenes(episodes, videoId);
    const concatListPaths = await createConcatListFilesForAllEpisodes(episodes, videoId);
    const episodePaths = await buildAllEpisodes(concatListPaths, videoId);
    let urls = await uploadAllEpisodes(episodePaths);

    urls = urls.map(({ url, _ }, index) => ({ url, title: episodes[index].title }));

    if(videoId) {
      try {
        // Update each episode with final URL and duration
        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          const episodeRecord = video.episodes[i];
          
          if (episodeRecord) {
            await prisma.episode.update({
              where: { id: episodeRecord.id },
              data: {
                url: url.url,
              }
            });
          }
        }
      } catch (dbError) {
        console.error('❌ Database update error:', dbError);
        // Continue with response even if DB update fails
      }
    }

    res.json({ status: 'done', videoId, video_urls: urls });

    cleanupEpisodeFolder(videoId);
  } catch (err) {
    console.error('Compilation error:', err);
    res.status(500).json({ error: 'Video compilation failed' });
  }
});

router.get('/check-ffmpeg', authenticateToken, (req, res) => {
  exec('which ffmpeg', (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      return res.status(500).json({
        found: false,
        message: 'FFmpeg not found in system path.',
        error: stderr || error?.message,
      });
    }

    return res.json({
      found: true,
      path: stdout.trim(),
      message: 'FFmpeg is available.',
    });
  });
});

export default router;
