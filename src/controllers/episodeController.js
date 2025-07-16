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
    
    // Process each episode and its scenes
    const episodes = await Promise.all(
      storyStructure.episodes.map(async (episode, episodeIndex) => {
        const episodeNumber = episodeIndex + 1;
        
        const processedScenes = await Promise.all(
          episode.scenes.map(async (scene, sceneIndex) => {
            const sceneId = episodeIndex * 10 + sceneIndex + 1;
            const sceneNumber = sceneIndex + 1;
            
            // Generate image prompt, voiceover script, and image in parallel
            const [imagePrompt, voiceoverScript] = await Promise.all([
              episodeService.generateImagePrompt(scene.description, genre, age_group),
              episodeService.generateVoiceoverScript(scene.dialogue, age_group),
            ]);

            return {
              scene_id: sceneId,
              description: scene.description,
              dialogue: scene.dialogue,
              image_prompt: imagePrompt,
              voiceover_script: voiceoverScript,
            };
          })
        );

        return {
          title: episode.title,
          scenes: processedScenes
        };
      })
    );

    const response = {
      status: "image_done",
      requestId,
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