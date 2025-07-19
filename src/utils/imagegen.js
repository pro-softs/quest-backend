import PQueue from 'p-queue';

const MAX_REQUESTS_PER_MIN = 5;

export class DalleImageGenerator {
  constructor(client) {
    this.client = client;

    // ⏱️ Allow 5 tasks per 60,000 ms (1 minute)
    this.queue = new PQueue({
      interval: 60_000,
      intervalCap: MAX_REQUESTS_PER_MIN,
      carryoverConcurrencyCount: true, // Ensures backpressure
    });
  }

  async generateImage(prompt) {
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
  }

  async generateImagesInParallel(promptsWithMeta) {
    const results = [];

    for (const { prompt, episode, scene } of promptsWithMeta) {
      const task = () =>
        this.generateImage(prompt)
          .then(buffer => {
            console.log(`✅ [Ep ${episode} | Scene ${scene}] image generated`);
            results.push({ episode, scene, prompt, imageBuffer: buffer });
          })
          .catch(err => {
            console.error(`❌ [Ep ${episode} | Scene ${scene}] failed: ${err.message}`);
            results.push({ episode, scene, prompt, error: err.message });
          });

      this.queue.add(task); // ⏳ Schedule with rate-limited queue
    }

    await this.queue.onIdle(); // Wait until all images processed
    return results;
  }
}
