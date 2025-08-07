import prisma from './prisma.js';

export class APILogger {
  static async logAPIUsage(videoId, tokens, cost, usedFor) {
    try {
      await prisma.log.create({
        data: {
          videoId: videoId || null,
          tokens: tokens || 0,
          cost: cost || 0.0,
          usedFor
        }
      });
      
      console.log(`📊 API Usage logged: ${usedFor} - ${tokens} tokens - $${cost}`);
    } catch (error) {
      console.error('❌ Failed to log API usage:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  static calculateCost(tokens, model = 'gpt-3.5-turbo') {
    // OpenAI pricing (as of 2024)
    const pricing = {
      'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
      'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
      'dall-e-3': 0.04, // $0.04 per image
      'dall-e-2': 0.02 // $0.02 per image
    };

    return tokens * (pricing[model] || pricing['gpt-3.5-turbo']);
  }

  static async getUsageStats(videoId = null, startDate = null, endDate = null) {
    try {
      const where = {};
      
      if (videoId) where.videoId = videoId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const logs = await prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      const stats = {
        totalTokens: logs.reduce((sum, log) => sum + log.tokens, 0),
        totalCost: logs.reduce((sum, log) => sum + log.cost, 0),
        totalCalls: logs.length,
        breakdown: {}
      };

      // Group by usedFor
      logs.forEach(log => {
        if (!stats.breakdown[log.usedFor]) {
          stats.breakdown[log.usedFor] = {
            tokens: 0,
            cost: 0,
            calls: 0
          };
        }
        stats.breakdown[log.usedFor].tokens += log.tokens;
        stats.breakdown[log.usedFor].cost += log.cost;
        stats.breakdown[log.usedFor].calls += 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error);
      return null;
    }
  }
}