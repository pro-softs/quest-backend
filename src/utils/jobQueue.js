import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveJobToQueue = async (jobId, jobData) => {
  try {
    const jobsDir = path.join(__dirname, '..', '..', 'jobs');
    const jobFile = path.join(jobsDir, `${jobId}.json`);
    
    await fs.writeFile(jobFile, JSON.stringify(jobData, null, 2));
    console.log(`💾 Job ${jobId} saved to queue`);
  } catch (error) {
    console.error('❌ Error saving job to queue:', error);
  }
};

export const updateJobInQueue = async (jobId, updatedData) => {
  try {
    const jobsDir = path.join(__dirname, '..', '..', 'jobs');
    const jobFile = path.join(jobsDir, `${jobId}.json`);

    console.log('jobfile', jobFile);

    await fs.writeFile(jobFile, JSON.stringify(updatedData, null, 2));
    console.log(`✅ Job ${jobId} updated`);
  } catch (error) {
    console.error('❌ Error updating job in queue:', error);
  }
};

export const getJobFromQueue = async (jobId) => {
  try {
    const jobsDir = path.join(__dirname, '..', '..', 'jobs');
    const jobFile = path.join(jobsDir, `${jobId}.json`);
    
    const jobData = await fs.readFile(jobFile, 'utf-8');
    return JSON.parse(jobData);
  } catch (error) {
    console.error('❌ Error reading job from queue:', error);
    return null;
  }
};

export const listQueuedJobs = async () => {
  try {
    const jobsDir = path.join(__dirname, '..', '..', 'jobs');
    const files = await fs.readdir(jobsDir);
    
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error('❌ Error listing queued jobs:', error);
    return [];
  }
};