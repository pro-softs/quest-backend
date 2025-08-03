import { EpisodeService } from '../services/episodeService.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma.js';

export const generateEpisodes = async (req, res) => {
  try {
    const { topic, age_group, genre, subject } = req.body;
    const userId = req.user?.id;

    console.log(`📝 Generating episodes for topic: "${topic}" (${genre}, ${age_group})`);

    const episodeService = new EpisodeService();
    
    // Generate the story structure first
    const storyStructure = await episodeService.generateStory(topic, age_group, genre, subject);

    const episodes = storyStructure.episodes.map((episode, episodeIndex) => {      
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

    let videoRecord = null;
    if (userId) {
      try {
        videoRecord = await prisma.video.create({
          data: {
            userId,
            title: episodes[0]?.title || `Video about ${topic}`,
            topic,
            subject,
            genre,
            ageGroup: age_group,
            episodeCount: episodes.length,
            status: 'processing'
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
          episodes: storyStructure.episodes,
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