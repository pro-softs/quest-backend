import fs from 'fs';
import { uploadDirect } from '@uploadcare/upload-client';

const PUBLIC_KEY = 'b130ebefb444f3dd855d'; // Get this from your Uploadcare dashboard

export const uploadVideo = async (filePath, name) => {
  try {
    const fileStream = fs.createReadStream(filePath);

    const { file } = await uploadDirect(fileStream, {
      publicKey: PUBLIC_KEY,
      store: 'auto', // or true
      fileName: name,
    });

    console.log('✅ Upload successful');
    console.log(`File UUID: ${file}`);

    fs.unlinkSync(filePath);

    return `https://ucarecdn.com/${file}/`;
  } catch (err) {
    console.error('❌ Upload failed:', err);
  }
};
