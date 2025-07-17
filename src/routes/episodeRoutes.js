import express from 'express';
import { generateEpisodes } from '../controllers/episodeController.js';
import { validateEpisodeRequest } from '../middleware/validation.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { generateVoice } from '../utils/generateVoiceOvers.js';
import { cleanupEpisodeFolder, stitchEpisode } from '../utils/ffmpegPipeline.js';
import { getJobFromQueue, updateJobInQueue } from '../utils/jobQueue.js';
import { EpisodeService } from '../services/episodeService.js';
import { exec } from 'child_process';
import { uploadVideo } from '../utils/uploadVideo.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, '..', '..', 'tmp');

router.post('/generate-episodes', validateEpisodeRequest, generateEpisodes);

router.post('/generate-scenes', async (req, res) => {
  const { requestId } = req.body;
  const episodeService = new EpisodeService();

  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  let job = await getJobFromQueue(requestId);
  const episodes = job.episodes;

  try {
    for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
      const ep = episodes[epIndex];
      const epDir = path.join(TMP_DIR, requestId, `ep${epIndex + 1}`);
      await fs.ensureDir(epDir);
  
      for (let scIndex = 0; scIndex < ep.scenes.length; scIndex++) {
        const scene = ep.scenes[scIndex];
  
        const blob = await episodeService.generateImageFromPrompt(scene.description);
  
        const sceneNumber = scene.scene_id || scIndex + 1;
        const episodeNumber = epIndex + 1;
        const imageKey = `${requestId}/ep${episodeNumber}/scene${sceneNumber}.webp`;
        const imagePath = path.join(TMP_DIR, imageKey);
  
        await episodeService.saveImageLocally(blob, imagePath);
  
        // ⬅️ Save image path back to scene
        scene.image_url = `/${imageKey}`;
      }
    }
    
    // ⬅️ Save updated episodes back into job
    job.episodes = episodes;
    await updateJobInQueue(requestId, job); // This is assumed to persist updated job state

    res.json({ status: 'done_images', requestId });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

router.post('/generate-voiceovers', async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  let job = await getJobFromQueue(requestId);
  const episodes = job.episodes;

  try {
    for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
      const ep = episodes[epIndex];
      const epDir = path.join(TMP_DIR, requestId, `ep${epIndex + 1}`);
      await fs.ensureDir(epDir);

      for (let scIndex = 0; scIndex < ep.scenes.length; scIndex++) {
        const scene = ep.scenes[scIndex];
        const sceneNumber = scene.scene_id || scIndex + 1;

        const audioKey = `${requestId}/ep${epIndex + 1}/scene${sceneNumber}.mp3`;
        const voicePath = path.join(TMP_DIR, audioKey);

        await generateVoice(scene.voiceover_script, voicePath);
        scene.voice_url = `/${audioKey}`;
      }
    }

    // ⬅️ Save updated episodes back into job
    job.episodes = episodes;
    await updateJobInQueue(requestId, job); // This is assumed to persist updated job state    

    res.json({ status: 'done_voice', requestId });
  } catch (err) {
    console.error('Voiceover generation error:', err);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

router.post("/compile-episodes", async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
    let job = await getJobFromQueue(requestId);
    const episodes = job.episodes;
    
    const episodePaths = [];

    for (let i = 0; i < episodes.length; i++) {
      const { finalVideoPath, name } = await stitchEpisode(episodes[i], i, requestId);
      const url = await uploadVideo(finalVideoPath, name);

      episodePaths.push({ path: url, title: episodes[i].title });
    }

    res.json({ status: 'done', requestId, video_urls: episodePaths });

    cleanupEpisodeFolder(requestId);
  } catch (err) {
    console.error('Compilation error:', err);
    res.status(500).json({ error: 'Video compilation failed' });
  }
});

router.get('/check-ffmpeg', (req, res) => {
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