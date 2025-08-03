import ffmpeg from 'fluent-ffmpeg';
import ffprobePath from 'ffprobe-static';
import axios from 'axios';
import pLimit from 'p-limit';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
ffmpeg.setFfprobePath(ffprobePath.path);
const limit = pLimit(2); // Adjust based on your system's capacity

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, '..', '..', 'tmp');
const  OUTPUT_DIR = path.join(__dirname, '..', '..', 'videos');

/**
 * Get duration of an audio file in seconds
 * @param {string} inputPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
export async function getAudioDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration;
      if (!duration) return reject(new Error('Duration not found'));
      resolve(duration);
    });
  });
}

export async function cleanupEpisodeFolder(requestId) {
  const folderPath = path.join(TMP_DIR, requestId);

  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`🧹 Cleaned up folder: ${folderPath}`);
  } catch (err) {
    console.warn(`⚠️ Cleanup error for ${folderPath}:`, err.message);
  }
}

async function createSceneVideo(imagePath, audioPath, outputPath, fadeDuration = 1) {
  const audioDuration = await getAudioDuration(audioPath);
  console.log('audiodurtion', audioPath, audioDuration);
  const fadeStart = Math.max(0, audioDuration - fadeDuration);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions('-loop 1')
      .input(audioPath)
      .videoFilters(`fade=t=out:st=${fadeStart}:d=${fadeDuration}`)
      .audioFilters(`afade=t=out:st=${fadeStart}:d=${fadeDuration}`)
      .outputOptions([
        '-shortest',
        '-pix_fmt yuv420p',
        '-c:v libx264',
        '-c:a aac',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Scene video created:', outputPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

export async function createScenes(episodes, requestId) {
  const outputDir = path.join(OUTPUT_DIR, requestId);
  await fs.ensureDir(outputDir);

  const allSceneTasks = [];

  for (const [epIndex, episode] of episodes.entries()) {
    for (const [scIndex, scene] of episode.scenes.entries()) {
      const sceneNumber = scene.sceneId || scIndex + 1;
      const epDir = path.join(TMP_DIR, requestId, `ep${epIndex + 1}`);

      const imagePath = path.join(epDir, `scene${sceneNumber}.webp`);
      const audioPath = path.join(epDir, `scene${sceneNumber}.mp3`);
      const videoPath = path.join(epDir, `scene${sceneNumber}.mp4`);

      allSceneTasks.push(limit(() => createSceneVideo(imagePath, audioPath, videoPath)));
    }
  }

  await Promise.all(allSceneTasks);
}

export async function createConcatListFilesForAllEpisodes(episodes, requestId) {
  const concatPaths = [];

  for (let episodeIndex = 0; episodeIndex < episodes.length; episodeIndex++) {
    const epDir = path.join(TMP_DIR, requestId, `ep${episodeIndex + 1}`);
    const episode = episodes[episodeIndex];

    // Collect scene video paths for this episode
    const sceneVideoPaths = episode.scenes.map(
      (scene, _) => path.join(epDir, `scene${scene.sceneId}.mp4`)
    );

    // Write concat list
    const concatListPath = path.join(epDir, 'concat.txt');
    const content = sceneVideoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(concatListPath, content);

    console.log(`📄 [Ep ${episodeIndex + 1}] Concat list written to ${concatListPath}`);
    concatPaths.push(concatListPath);
  }

  return concatPaths;
}

export async function buildAllEpisodes(concatListPaths, requestId) {
  const tasks = concatListPaths.map((path, epIndex) => {
    return buildEpisode(epIndex, path, requestId);
  });

  const results = await Promise.all(tasks);
  console.log('🎬 All episodes stitched');

  return results; // Array of { finalVideoPath, name }
}

export async function buildEpisode(epIndex, input, requestId) {
  const outputDir = path.join(OUTPUT_DIR, requestId);
  await fs.ensureDir(outputDir);

  const episodeName = `episode${epIndex + 1}.mp4`;
  const finalVideoPath = path.join(outputDir, episodeName);

  // Merge all scene videos into one
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(input)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 20',
        '-c:a aac',
        '-b:a 192k',              // 🔼 Optional: better audio bitrate
        '-movflags +faststart',
        '-pix_fmt yuv420p'
      ])
      .save(finalVideoPath)
      .on('end', () => {
        console.log('✅ Final video compiled');
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err);
        reject(err);
      });
  });

  return { finalVideoPath, name: `${requestId}_${episodeName}`};
}