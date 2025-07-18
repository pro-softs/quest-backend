import pLimit from 'p-limit';

const MAX_CONCURRENT_REQUESTS = 1; // Only 1 at a time
const MAX_REQUESTS_PER_MIN = 6;    // OpenAI limit
const MAX_RETRIES = 4;

export class DalleImageGenerator {
  constructor(client) {
    this.client = client;
  }

  async generateImage(prompt) {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const response = await this.client.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });

        const imageData = response.data?.[0]?.b64_json;
        if (!imageData) throw new Error('No image data returned from OpenAI');

        return Buffer.from(imageData, 'base64');
      } catch (err) {
        const isRateLimit = err.status === 429 || err.code === 'rate_limit_exceeded';
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;

        console.warn(`❌ Attempt ${attempt + 1} failed${isRateLimit ? ' (Rate Limit)' : ''}: ${err.message}`);
        if (attempt >= MAX_RETRIES - 1 || !isRateLimit) throw err;

        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(res => setTimeout(res, delay));
        attempt++;
      }
    }
  }

  // ✅ Throttled version to respect OpenAI rate limits
  async generateImagesInParallel(promptsWithMeta) {
    const limit = pLimit(MAX_CONCURRENT_REQUESTS); // Run one at a time
    const delayBetween = 10000; // ~10s between each request => 6/min

    const results = [];

    for (let i = 0; i < promptsWithMeta.length; i++) {
      const { prompt, episode, scene } = promptsWithMeta[i];

      const limitedTask = limit(() => this.generateImage(prompt).then(buffer => ({
        episode,
        scene,
        prompt,
        imageBuffer: buffer,
      })));

      try {
        const result = await limitedTask;
        results.push(result);
      } catch (err) {
        console.error(`❌ Failed to generate image for [Ep ${episode} | Scene ${scene}]: ${err.message}`);
        results.push({ episode, scene, prompt, error: err.message });
      }

      if (i < promptsWithMeta.length - 1) {
        console.log(`⏳ Waiting ${delayBetween}ms before next request...`);
        await new Promise(res => setTimeout(res, delayBetween));
      }
    }

    return results;
  }
}
