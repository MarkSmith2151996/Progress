import { NextResponse } from 'next/server';
import { appendRow, updateOrAppend } from '@/lib/sheets';
import { Goal, Task, DailyLog, Habit, HabitCompletion } from '@/types';

interface ImportData {
  exportedAt: string;
  goals?: Goal[];
  tasks?: Task[];
  dailyLogs?: DailyLog[];
  habits?: Habit[];
  habitCompletions?: HabitCompletion[];
  settings?: {
    theme?: string;
    week_colors?: Record<string, string>;
    notifications_enabled?: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const data: ImportData = await request.json();

    // Validate the export
    if (!data.exportedAt) {
      return NextResponse.json(
        { error: 'Invalid import file: missing exportedAt' },
        { status: 400 }
      );
    }

    const results = {
      goals: 0,
      tasks: 0,
      dailyLogs: 0,
      habits: 0,
      habitCompletions: 0,
    };

    // Import goals (merge by goal_id)
    if (data.goals && data.goals.length > 0) {
      for (const goal of data.goals) {
        try {
          await updateOrAppend('Goals', 'goal_id', goal as unknown as Record<string, unknown>);
          results.goals++;
        } catch (error) {
          console.error('Failed to import goal:', goal.goal_id, error);
        }
      }
    }

    // Import tasks (merge by task_id)
    if (data.tasks && data.tasks.length > 0) {
      for (const task of data.tasks) {
        try {
          await updateOrAppend('Tasks', 'task_id', task as unknown as Record<string, unknown>);
          results.tasks++;
        } catch (error) {
          console.error('Failed to import task:', task.task_id, error);
        }
      }
    }

    // Import daily logs (merge by date)
    if (data.dailyLogs && data.dailyLogs.length > 0) {
      for (const log of data.dailyLogs) {
        try {
          await updateOrAppend('DailyLogs', 'date', log as unknown as Record<string, unknown>);
          results.dailyLogs++;
        } catch (error) {
          console.error('Failed to import daily log:', log.date, error);
        }
      }
    }

    // Import habits (merge by habit_id)
    if (data.habits && data.habits.length > 0) {
      for (const habit of data.habits) {
        try {
          await updateOrAppend('Habits', 'habit_id', habit as unknown as Record<string, unknown>);
          results.habits++;
        } catch (error) {
          console.error('Failed to import habit:', habit.habit_id, error);
        }
      }
    }

    // Import habit completions (merge by completion_id)
    if (data.habitCompletions && data.habitCompletions.length > 0) {
      for (const completion of data.habitCompletions) {
        try {
          await updateOrAppend(
            'HabitCompletions',
            'completion_id',
            completion as unknown as Record<string, unknown>
          );
          results.habitCompletions++;
        } catch (error) {
          console.error('Failed to import habit completion:', completion.completion_id, error);
        }
      }
    }

    // Import settings
    if (data.settings) {
      if (data.settings.theme) {
        await updateOrAppend('Settings', 'setting_key', {
          setting_key: 'theme',
          setting_value: data.settings.theme,
          updated_at: new Date().toISOString(),
        });
      }
      if (data.settings.week_colors) {
        await updateOrAppend('Settings', 'setting_key', {
          setting_key: 'week_colors',
          setting_value: JSON.stringify(data.settings.week_colors),
          updated_at: new Date().toISOString(),
        });
      }
      if (data.settings.notifications_enabled !== undefined) {
        await updateOrAppend('Settings', 'setting_key', {
          setting_key: 'notifications_enabled',
          setting_value: String(data.settings.notifications_enabled),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results,
      message: `Imported: ${results.goals} goals, ${results.tasks} tasks, ${results.dailyLogs} logs, ${results.habits} habits, ${results.habitCompletions} completions`,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json(
      { error: 'Import failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
