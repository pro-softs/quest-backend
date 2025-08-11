import { EpisodeService } from '../services/episodeService.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';

export const generateEpisodes = async (req, res) => {
  try {
    const { topic, age_group, genre, subject } = req.body;
    const userId = req.user?.id;

    console.log(`📝 Generating episodes for topic: "${topic}" (${genre}, ${age_group})`);

    let videoRecord = null;

    videoRecord = await prisma.video.create({
      data: {
        userId,
        topic,
        subject,
        genre,
        ageGroup: age_group,
        status: 'processing'
      }
    });

    const episodeService = new EpisodeService();
    episodeService.setVideoId(videoRecord.id);

    let config = await prisma.config.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let noOfEpisodes = 3; 
    let noOfScenes = 6;

    if(config) {
      noOfEpisodes = config.noOfEpisodes;
      noOfScenes = config.noOfScenes;
    }
    
    // Generate the story structure first
    const storyStructure = await episodeService.generateStory(topic, age_group, genre, subject, noOfEpisodes, noOfScenes);
    const safeStory = await episodeService.sanitizeStory(storyStructure);

    const episodes = safeStory.episodes.map((episode, episodeIndex) => {      
      const processedScenes = episode.scenes.map((scene, sceneIndex) => {
        const sceneId = episodeIndex * 10 + sceneIndex + 1;            
      
        return {
          ...scene,
          scene_id: sceneId,
        };
      });

      return {
        title: episode.title,
        scenes: processedScenes
      };
    });

    if (userId) {
      try {
        //update a field
        videoRecord = await prisma.video.update({
          where: { id: videoRecord.id },
          data: {
            title: episodes[0]?.title || `Video about ${topic}`,
            episodeCount: episodes.length,
          }
        });

        // Create episodes in database
        for (let i = 0; i < episodes.length; i++) {
          const episode = episodes[i];
          const episodeRecord = await prisma.episode.create({
            data: {
              videoId: videoRecord.id,
              title: episode.title,
              orderIndex: i + 1
            }
          });

          // Create scenes in database
          for (let j = 0; j < episode.scenes.length; j++) {
            const scene = episode.scenes[j];
            await prisma.scene.create({
              data: {
                episodeId: episodeRecord.id,
                sceneId: scene.scene_id,
                description: scene.description,
                imagePrompt: scene.image_prompt,
                voiceover: scene.voiceover,
                orderIndex: j + 1
              }
            });
          }
        }

        const response = {
          status: "story_done",
          videoId: videoRecord?.id,
          episodes: safeStory.episodes,
        };
    
        console.log(`✅ Generated ${episodes.length} episodes with ${episodes.reduce((total, ep) => total + ep.scenes.length, 0)} total scenes`);
        res.json(response);
      } catch (dbError) {
        console.error('Database save error:', dbError);
        res.status(500).json({ 
          error: 'Failed to generate episodes', 
          message: dbError.message 
        });
      }
    }    
  } catch (error) {
    console.error('❌ Error generating episodes:', error);
    res.status(500).json({ 
      error: 'Failed to generate episodes', 
      message: error.message 
    });
  }
};