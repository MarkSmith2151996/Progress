import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: Request) {
  try {
    const { accomplishment, goals } = await request.json();

    if (!accomplishment || !goals || goals.length === 0) {
      return NextResponse.json({ success: false, goalId: null, delta: 0 });
    }

    const activeGoals = goals.filter((g: Record<string, unknown>) => g.status === 'active');
    if (activeGoals.length === 0) {
      return NextResponse.json({ success: false, goalId: null, delta: 0 });
    }

    // Try Anthropic API if key is available
    if (ANTHROPIC_API_KEY) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

        const goalsDesc = activeGoals
          .map((g: Record<string, unknown>) =>
            `ID:${g.goal_id} "${g.title}" ${g.current_value}/${g.target_value} (${g.increment_type || 'count'})`
          )
          .join('\n');

        const msg = await client.messages.create({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Match accomplishment to goal. Reply ONLY with JSON.
Accomplishment: "${accomplishment}"
Goals:
${goalsDesc}
JSON format: {"goalId":"id or null","delta":number,"reasoning":"brief"}
Rules: semantic matching, extract numbers ("one"=1, "$50"=50, "2 hours"=2), default delta=1 if unclear.`,
          }],
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.goalId) {
            return NextResponse.json({
              success: true,
              goalId: parsed.goalId,
              delta: typeof parsed.delta === 'number' ? parsed.delta : 1,
              reasoning: parsed.reasoning || 'AI match',
            });
          }
        }
      } catch (apiErr) {
        console.warn('Anthropic API goal matching failed:', apiErr);
      }
    }

    // No API key or API failed
    return NextResponse.json({ success: false, goalId: null, delta: 0, reasoning: 'API unavailable' });
  } catch (error) {
    console.error('Goal match error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
