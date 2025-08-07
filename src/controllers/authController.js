import prisma from '../utils/prisma.js';
import { generateToken, verifyGoogleToken } from '../utils/auth.js';

export const login = async (req, res) => {
  try {
    const { email, provider, token: googleToken } = req.body;

    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and provider are required'
        }
      });
    }

    if (provider !== 'google') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only Google authentication is supported'
        }
      });
    }

    let userData = { email, name: email.split('@')[0], avatar: null };

    // If Google token is provided, verify it
    if (googleToken) {
      try {
        const googleData = await verifyGoogleToken(googleToken);
        userData = {
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.avatar
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid Google token'
          }
        });
      }
    }

    console.log(userData, 'sds');

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
          provider: 'google'
        }
      });
    } else {
      // Update user info if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userData.name,
          avatar: userData.avatar
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