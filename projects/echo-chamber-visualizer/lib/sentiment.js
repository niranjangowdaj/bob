/**
 * lib/sentiment.js
 * Utility for sentiment analysis simulation and data fetching.
 */

export const getSentimentScore = async (text) => {
  // In a production environment, this would call the Vercel AI SDK or an external NLP API.
  // We simulate the latency and processing here.
  return new Promise((resolve) => {
    setTimeout(() => {
      const score = Math.random() * 2 - 1; // Returns a value between -1 (negative) and 1 (positive)
      resolve({
        score,
        label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
        timestamp: Date.now(),
      });
    }, 200);
  });
};

export const fetchHashtagData = async (hashtag) => {
  // Mocking real-time streaming data for the 3D graph
  return Array.from({ length: 20 }, (_, i) => ({
    id: `node-${hashtag}-${i}`,
    val: Math.random() * 10,
    sentiment: Math.random() * 2 - 1,
    user: `user_${Math.floor(Math.random() * 1000)}`,
  }));
};