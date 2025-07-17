const MAX_RETRIES = 5;

class DalleImageGenerator {
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
        if (!imageData) {
          throw new Error('No image data returned from OpenAI');
        }

        return Buffer.from(imageData, 'base64');
      } catch (err) {
        const isRateLimit = err.status === 429 || err.code === 'rate_limit_exceeded';
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;

        console.warn(`❌ Attempt ${attempt + 1} failed${isRateLimit ? ' (Rate Limit)' : ''}: ${err.message}`);
        if (attempt >= MAX_RETRIES - 1 || !isRateLimit) {
          throw err;
        }

        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(res => setTimeout(res, delay));
        attempt++;
      }
    }
  }

  // ✅ Batch image generation method
  async generateImagesInParallel(promptsWithMeta) {
    const results = await Promise.allSettled(
      promptsWithMeta.map(({ prompt, episode, scene }) =>
        this.generateImage(prompt).then(buffer => ({
          episode,
          scene,
          prompt,
          imageBuffer: buffer,
        }))
      )
    );

    return results.map((res, idx) => {
      const meta = promptsWithMeta[idx];
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        console.error(`❌ Failed to generate image for [Episode ${meta.episode} | Scene ${meta.scene}]: ${res.reason.message}`);
        return {
          ...meta,
          error: res.reason.message,
        };
      }
    });
  }
}
