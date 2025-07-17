import fs from 'fs';
import { uploadDirect } from '@uploadcare/upload-client';

const PUBLIC_KEY = 'b130ebefb444f3dd855d'; // Get this from your Uploadcare dashboard

export async function uploadAllEpisodes(episodes) {
  const uploadPromises = episodes.map(({ finalVideoPath, name }) =>
    uploadVideo(finalVideoPath, name)
      .then(url => ({ name, url }))
      .catch(error => {
        console.error(`❌ Failed to upload ${name}:`, error);
        return { name, url: null, error };
      })
  );

  const uploadedVideos = await Promise.all(uploadPromises);
  return uploadedVideos;
}

export const uploadVideo = async (filePath, name) => {
  console.log(filePath, 'jere');
  const ex = fs.existsSync(filePath);
  console.log(ex, 'sdsds');
  try {
    const buffer = await fs.promises.readFile(filePath);

    const { cdnUrl } = await uploadDirect(buffer, {
      publicKey: PUBLIC_KEY,
      store: 'auto', // or true
      fileName: name,
    });

    console.log('✅ Upload successful');
    console.log(`File UUID: ${cdnUrl}`);

    fs.unlinkSync(filePath);

    return cdnUrl;
  } catch (err) {
    console.error('❌ Upload failed:', err);
    throw err;
  }
};
