import prisma from '../utils/prisma.js';
import { generateToken, verifyFirebaseToken } from '../utils/auth.js';

export const login = async (req, res) => {
  try {
    const { provider, token: firebaseToken } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and provider are required'
        }
      });
    }

    if (provider !== 'google' && provider !== 'firebase') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only Google/Firebase authentication is supported'
        }
      });
    }

    let userData = { avatar: null };

    // If Firebase token is provided, verify it
    if (firebaseToken) {
      try {
        const firebaseData = await verifyFirebaseToken(firebaseToken);
        userData = {
          email: firebaseData.email,
          name: firebaseData.name,
          avatar: firebaseData.avatar,
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid Firebase token: ${error.message}`
          }
        });
      }
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          provider: provider,
        }
      });
    } else {
      // Update user info if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userData.name,
          avatar: userData.avatar,
        }
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};