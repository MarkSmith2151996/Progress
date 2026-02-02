/**
 * Migrate localStorage data to Google Sheets
 *
 * Usage:
 * 1. Open mobile app in browser, open DevTools Console (F12)
 * 2. Run: copy(JSON.stringify({goals: JSON.parse(localStorage.getItem('progress95_goals')||'[]'), habits: JSON.parse(localStorage.getItem('progress95_habits')||'[]'), dailyLogs: JSON.parse(localStorage.getItem('progress95_dailyLogs')||'[]'), tasks: JSON.parse(localStorage.getItem('progress95_tasks')||'[]'), habitCompletions: JSON.parse(localStorage.getItem('progress95_habitCompletions')||'[]')}))
 * 3. Paste the copied JSON into a file called 'export.json' in this folder
 * 4. Run: node scripts/migrate-to-sheets.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    env[line.substring(0, idx)] = line.substring(idx + 1);
  }
}

const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID;
const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);

async function main() {
  // Check for export file
  const exportPath = path.join(__dirname, 'export.json');
  if (!fs.existsSync(exportPath)) {
    console.log('='.repeat(60));
    console.log('STEP 1: Export data from mobile browser');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. Open https://progress-umber-six.vercel.app on your phone/browser');
    console.log('2. Open DevTools (F12) → Console tab');
    console.log('3. Paste this command and press Enter:');
    console.log('');
    console.log('copy(JSON.stringify({goals:JSON.parse(localStorage.getItem("progress95_goals")||"[]"),habits:JSON.parse(localStorage.getItem("progress95_habits")||"[]"),dailyLogs:JSON.parse(localStorage.getItem("progress95_dailyLogs")||"[]"),tasks:JSON.parse(localStorage.getItem("progress95_tasks")||"[]"),habitCompletions:JSON.parse(localStorage.getItem("progress95_habitCompletions")||"[]")}))');
    console.log('');
    console.log('4. Create a file: scripts/export.json');
    console.log('5. Paste the copied content into that file');
    console.log('6. Run this script again: node scripts/migrate-to-sheets.js');
    console.log('');
    return;
  }

  console.log('Found export.json, importing to Google Sheets...\n');

  const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

  console.log('Data summary:');
  console.log(`  Goals: ${data.goals?.length || 0}`);
  console.log(`  Habits: ${data.habits?.length || 0}`);
  console.log(`  Daily Logs: ${data.dailyLogs?.length || 0}`);
  console.log(`  Tasks: ${data.tasks?.length || 0}`);
  console.log(`  Habit Completions: ${data.habitCompletions?.length || 0}`);
  console.log('');

  // Auth
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Helper to write data
  async function writeSheet(tabName, items, headers) {
    if (!items || items.length === 0) {
      console.log(`  ${tabName}: No data to write`);
      return;
    }

    const rows = [headers];
    for (const item of items) {
      const row = headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      rows.push(row);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    console.log(`  ${tabName}: Wrote ${items.length} rows`);
  }

  // Write each collection
  console.log('Writing to Google Sheets...');

  await writeSheet('Goals', data.goals, [
    'goal_id', 'title', 'type', 'parent_goal_id', 'target_value',
    'starting_value', 'current_value', 'unit', 'start_date', 'deadline',
    'status', 'priority', 'created_at', 'updated_at'
  ]);

  await writeSheet('Habits', data.habits, [
    'habit_id', 'name', 'target_minutes', 'days_active', 'active',
    'sort_order', 'created_at'
  ]);

  await writeSheet('DailyLogs', data.dailyLogs, [
    'date', 'day_type', 'energy_level', 'hours_slept', 'work_hours',
    'school_hours', 'free_hours', 'overall_rating', 'notes', 'sick',
    'accomplishments', 'created_at', 'updated_at'
  ]);

  await writeSheet('Tasks', data.tasks, [
    'task_id', 'goal_id', 'description', 'planned_date', 'completed_date',
    'status', 'time_estimated', 'time_actual', 'difficulty', 'notes', 'created_at'
  ]);

  await writeSheet('HabitCompletions', data.habitCompletions, [
    'completion_id', 'habit_id', 'date', 'completed', 'created_at'
  ]);

  console.log('\nMigration complete!');
  console.log('Both mobile and desktop should now show the same data.');

  // Cleanup
  fs.renameSync(exportPath, exportPath + '.done');
  console.log('\nRenamed export.json to export.json.done');
}

main().catch(console.error);
