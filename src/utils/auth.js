import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

// Initialize Firebase Admin SDK
let firebaseApp;
try {
  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(FIREBASE_SERVICE_ACCOUNT_PATH);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Support for service account key as environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    // Required to fix \n issue in Railway/Vercel/Render
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID
    });
  } else {
    console.warn('⚠️ Firebase service account not configured. Google token verification will fail.');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const verifyFirebaseToken = async (idToken) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0],
      avatar: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
      provider: decodedToken.firebase.sign_in_provider
    };
  } catch (error) {
    console.error('Firebase token verification error:', error);
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
};