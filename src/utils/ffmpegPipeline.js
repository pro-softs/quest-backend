import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, '..', '..', 'tmp');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'videos');

export async function cleanupEpisodeFolder(requestId) {
  const folderPath = path.join(TMP_DIR, requestId);

  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`🧹 Cleaned up folder: ${folderPath}`);
  } catch (err) {
    console.warn(`⚠️ Cleanup error for ${folderPath}:`, err.message);
  }
}

async function createSceneVideo(imagePath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(imagePath)
      .inputOptions(['-loop 1']) // loop image
      .addInput(audioPath)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 20',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-tune stillimage',
        '-movflags +faststart',
        // Add video filter for scaling, padding, and fade
        '-vf',
        [
          'scale=720:-1',
          'pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
          'fade=t=in:st=0:d=0.5',
          'fade=t=out:st=6.5:d=0.5'
        ].join(','),
        // Add audio fade
        '-af',
        'afade=t=in:st=0:d=0.5,afade=t=out:st=6.5:d=0.5'
      ])
      .save(outputPath)
      .on('end', () => {
        console.log('✅ Scene rendered:', outputPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ Scene FFmpeg error:', err);
        reject(err);
      });
  });
}

export async function stitchEpisode(episode, epIndex, requestId) {
  const epDir = path.join(TMP_DIR, requestId, `ep${epIndex + 1}`);
  const outputDir = path.join(OUTPUT_DIR, requestId);
  await fs.ensureDir(outputDir);

  const concatListPath = path.join(epDir, 'concat.txt');

  const sceneVideoPaths = [];

  for (let scIndex = 0; scIndex < episode.scenes.length; scIndex++) {
    const scene = episode.scenes[scIndex];
    const sceneNumber = scene.scene_id || scIndex + 1;

    const imagePath = path.join(epDir, `scene${sceneNumber}.webp`);
    const audioPath = path.join(epDir, `scene${sceneNumber}.mp3`);
    const videoPath = path.join(epDir, `scene${sceneNumber}.mp4`);

    await createSceneVideo(imagePath, audioPath, videoPath);
    sceneVideoPaths.push(videoPath);
  }

  // Write FFmpeg concat list
  await fs.writeFile(
    concatListPath,
    sceneVideoPaths.map(p => `file '${p}'`).join('\n')
  );

  const episodeName = `episode${epIndex + 1}.mp4`;
  const finalVideoPath = path.join(outputDir, episodeName);

  // Merge all scene videos into one
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-preset veryfast',
        '-crf 20',
        '-movflags +faststart'
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