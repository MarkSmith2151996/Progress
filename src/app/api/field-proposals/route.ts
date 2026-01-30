import { NextResponse } from 'next/server';
import { getDailyLogs, getTasks, getCustomFields, getFieldProposals, appendRow, updateOrAppend } from '@/lib/sheets';
import { analyzeUsageForProposals, createFieldProposal, approveProposal, detectTrackableKeywords } from '@/lib/fieldProposals';
import { FieldProposal, CustomField } from '@/types';

export async function GET() {
  try {
    const proposals = await getFieldProposals();
    const pendingProposals = proposals.filter((p) => p.status === 'pending');

    return NextResponse.json({
      proposals: pendingProposals,
      total: proposals.length,
    });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, proposalId } = await request.json();

    if (action === 'analyze') {
      // Analyze notes for new proposals
      const [dailyLogs, tasks, existingFields] = await Promise.all([
        getDailyLogs(),
        getTasks(),
        getCustomFields(),
      ]);

      const analysis = await analyzeUsageForProposals(dailyLogs, tasks, existingFields);

      // Save new proposals
      for (const suggestion of analysis.proposals) {
        const proposal = createFieldProposal(suggestion);
        await appendRow('FieldProposals', proposal as unknown as Record<string, unknown>);
      }

      // Also detect keywords
      const keywords = detectTrackableKeywords(dailyLogs, tasks);

      return NextResponse.json({
        analysis,
        keywords,
        newProposals: analysis.proposals.length,
      });
    }

    if (action === 'approve' && proposalId) {
      const proposals = await getFieldProposals();
      const proposal = proposals.find((p) => p.proposal_id === proposalId);

      if (!proposal) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }

      // Create custom field
      const customField = approveProposal(proposal);
      await appendRow('CustomFields', customField as unknown as Record<string, unknown>);

      // Update proposal status
      await updateOrAppend('FieldProposals', 'proposal_id', {
        ...proposal,
        status: 'approved',
        resolved_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>);

      return NextResponse.json({
        success: true,
        customField,
      });
    }

    if (action === 'reject' && proposalId) {
      const proposals = await getFieldProposals();
      const proposal = proposals.find((p) => p.proposal_id === proposalId);

      if (!proposal) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }

      // Update proposal status
      await updateOrAppend('FieldProposals', 'proposal_id', {
        ...proposal,
        status: 'rejected',
        resolved_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process proposal action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
