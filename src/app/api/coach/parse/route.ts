import { NextResponse } from 'next/server';
import { buildContextPackage } from '@/lib/contextBuilder';
import { parseAccomplishments } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const { input } = await request.json() as { input: string };

    const context = await buildContextPackage();
    const parsed = await parseAccomplishments(context, input);

    return NextResponse.json({ parsed });
  } catch (error) {
    console.error('Failed to parse accomplishments:', error);
    return NextResponse.json(
      {
        parsed: [{
          description: 'Unable to parse input',
          goalId: null,
          timeSpent: null,
          difficulty: null,
        }],
      },
      { status: 200 }
    );
  }
}
