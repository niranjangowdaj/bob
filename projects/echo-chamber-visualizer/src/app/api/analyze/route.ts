import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { text }: { text: string } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const { text: result } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: `Analyze the sentiment of the following social media post. Return a JSON object with two fields: 
      1. "score" (a number between -1 for negative and 1 for positive).
      2. "label" (a string: "positive", "negative", or "neutral").
      Text to analyze: "${text}"`,
    });

    const sentimentData = JSON.parse(result.replace(/