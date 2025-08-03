import prisma from '../utils/prisma.js';

export const getMyVideos = async (req, res) => {
  try {
    const { subject, genre, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (subject) where.subject = subject;
    if (genre) where.genre = genre;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          episodes: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              title: true,
              url: true,
              duration: true,
              thumbnail: true,
              orderIndex: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.video.count({ where })
    ]);

    const formattedVideos = videos.map(video => ({
      id: video.id,
      title: video.title,
      topic: video.topic,
      subject: video.subject,
      genre: video.genre,
      ageGroup: video.ageGroup,
      episodeCount: video.episodeCount,
      totalDuration: video.totalDuration,
      thumbnail: video.thumbnail,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      episodes: video.episodes.map(ep => ({
        title: ep.title,
        url: ep.url,
        duration: ep.duration,
        thumbnail: ep.thumbnail
      }))
    }));

    res.json({
      success: true,
      videos: formattedVideos,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to fetch videos'
      }
    });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const video = await prisma.video.findFirst({
      where: { id, userId },
      include: {
        episodes: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            url: true,
            duration: true,
            thumbnail: true,
            orderIndex: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found'
        }
      });
    }

    const formattedVideo = {
      id: video.id,
      title: video.title,
      topic: video.topic,
      subject: video.subject,
      genre: video.genre,
      ageGroup: video.ageGroup,
      episodeCount: video.episodeCount,
      totalDuration: video.totalDuration,
      thumbnail: video.thumbnail,
      createdAt: video.createdAt.toISOString(),
      episodes: video.episodes.map(ep => ({
        title: ep.title,
        url: ep.url,
        duration: ep.duration,
        thumbnail: ep.thumbnail
      })),
      shareUrl: `https://quest.app/watch/${video.id}`
    };

    res.json({
      success: true,
      video: formattedVideo
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to fetch video'
      }
    });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const video = await prisma.video.findFirst({
      where: { id, userId }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found'
        }
      });
    }

    await prisma.video.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to delete video'
      }
    });
  }
};