import { SentimentScore } from '../types/graph';

/**
 * Mock sentiment analysis service.
 * In a production environment, this would interface with the Vercel AI SDK 
 * or a dedicated NLP API. Since this project uses static export,
 * we simulate real-time data streaming for the 3D visualization.
 */

export const analyzeSentiment = async (text: string): Promise<SentimentScore> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));

  // Deterministic-random mock score between -1 (Negative) and 1 (Positive)
  const score = Math.max(-1, Math.min(1, Math.random() * 2 - 1));
  
  const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

  return {
    score,
    label,
    timestamp: Date.now(),
  };
};

export const getMockSentimentStream = (nodeId: string): SentimentScore => {
  return {
    score: Math.sin(Date.now() / 1000) * 0.5 + (Math.random() * 0.2 - 0.1),
    label: 'neutral',
    timestamp: Date.now(),
  };
};