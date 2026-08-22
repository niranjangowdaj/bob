export interface GraphNode {
  id: string;
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  val: number;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface SentimentData {
  hashtag: string;
  score: number; // -1 to 1
  magnitude: number;
  timestamp: number;
}