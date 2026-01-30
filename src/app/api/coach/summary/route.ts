import { NextResponse } from 'next/server';
import { buildContextPackage } from '@/lib/contextBuilder';
import { getCoachSummary } from '@/lib/claude';

export async function GET() {
  try {
    const context = await buildContextPackage();
    const summary = await getCoachSummary(context);

    return NextResponse.json({
      summary,
      alerts: context.alerts,
    });
  } catch (error) {
    console.error('Failed to get coach summary:', error);
    return NextResponse.json(
      {
        summary: 'Welcome! Start logging your progress to get personalized coaching.',
        alerts: [],
      },
      { status: 200 }
    );
  }
}
