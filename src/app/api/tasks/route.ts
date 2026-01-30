import { NextResponse } from 'next/server';
import { getTasks, saveTask } from '@/lib/storage';
import { Task } from '@/types';

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const task: Task = await request.json();
    await saveTask(task);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save task:', error);
    return NextResponse.json(
      { error: 'Failed to save task' },
      { status: 500 }
    );
  }
}
