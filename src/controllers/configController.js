import prisma from '../utils/prisma.js';

export const getConfig = async (req, res) => {
  try {
    // Get the latest config or create default if none exists
    let config = await prisma.config.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!config) {
      // Create default config if none exists
      config = await prisma.config.create({
        data: {
          subjects: [
            'physics',
            'chemistry', 
            'mathematics',
            'biology',
            'history',
            'geography',
            'computer',
            'astronomy',
            'general'
          ],
          ageGroups: [
            '8-12',
            '13-15', 
            '16-18',
            '18+'
          ],
          styles: [
            'anime',
            'realistic',
            'cartoon',
            'fantasy',
            'sci-fi',
            'documentary'
          ],
          noOfEpisodes: 3,
          noOfScenes: 6,
          noOfGenerations: 10
        }
      });
    }

    res.json({
      success: true,
      config: {
        subjects: config.subjects,
        ageGroups: config.ageGroups,
        styles: config.styles,
        noOfEpisodes: config.noOfEpisodes,
        noOfScenes: config.noOfScenes,
        noOfGenerations: config.noOfGenerations
      }
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to fetch configuration'
      }
    });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { subjects, ageGroups, styles, noOfEpisodes, noOfScenes, noOfGenerations } = req.body;

    const config = await prisma.config.create({
      data: {
        subjects: subjects || [
          'physics', 'chemistry', 'mathematics', 'biology', 
          'history', 'geography', 'computer', 'astronomy', 'general'
        ],
        ageGroups: ageGroups || ['8-12', '13-15', '16-18', '18+'],
        styles: styles || ['anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'documentary'],
        noOfEpisodes: noOfEpisodes || 3,
        noOfScenes: noOfScenes || 6,
        noOfGenerations: noOfGenerations || 10
      }
    });

    res.json({
      success: true,
      config: {
        subjects: config.subjects,
        ageGroups: config.ageGroups,
        styles: config.styles,
        noOfEpisodes: config.noOfEpisodes,
        noOfScenes: config.noOfScenes,
        noOfGenerations: config.noOfGenerations
      }
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to update configuration'
      }
    });
  }
};