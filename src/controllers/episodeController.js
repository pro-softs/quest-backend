import { EpisodeService } from '../services/episodeService.js';
import { saveJobToQueue } from '../utils/jobQueue.js';
import { v4 as uuidv4 } from 'uuid';

export const generateEpisodes = async (req, res) => {
  try {
    const { topic, age_group, genre } = req.body;
    const requestId = uuidv4();

    console.log(`📝 Generating episodes for topic: "${topic}" (${genre}, ${age_group})`);

    const episodeService = new EpisodeService();
    
    // Generate the story structure first
    const storyStructure = await episodeService.generateStory(topic, age_group, genre);

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

    const response = {
      status: "story_done",
      requestId,
      episodes: storyStructure.episodes,
    };

    // Save job to queue for video rendering simulation
    await saveJobToQueue(requestId, {
      topic,
      age_group,
      genre,
      episodes,
      requestId,
      timestamp: new Date().toISOString(),
      status: 'queued'
    });

    console.log(`✅ Generated ${episodes.length} episodes with ${episodes.reduce((total, ep) => total + ep.scenes.length, 0)} total scenes`);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error generating episodes:', error);
    res.status(500).json({ 
      error: 'Failed to generate episodes', 
      message: error.message 
    });
  }
};