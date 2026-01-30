import { NextResponse } from 'next/server';
import { buildContextPackage } from '@/lib/contextBuilder';
import { getChatResponse } from '@/lib/claude';
import { ChatMessage } from '@/types';

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json() as {
      message: string;
      history: ChatMessage[];
    };

    const context = await buildContextPackage();
    const response = await getChatResponse(context, history, message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Failed to get chat response:', error);
    return NextResponse.json(
      { response: 'Sorry, I had trouble responding. Please try again.' },
      { status: 200 }
    );
  }
}
