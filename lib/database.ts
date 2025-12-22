/**
 * SQLite Database Access Layer for makanai-flow
 * 
 * All data is stored locally on the device using SQLite.
 * No backend server required.
 */

import * as SQLite from 'expo-sqlite';

// ============================================
// Types
// ============================================

export type UserProfile = {
  id?: number;
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  environment: string;
  sessionMinutes: number;
};

export type DayPlan = {
  id?: number;
  date: string;
  dayOfWeek: string;
  bodyPart: string;
  totalMinutes: number;
  isRestDay: boolean;
};

export type DailyLog = {
  id?: number;
  date: string;
  completed: boolean;
  feedback?: string;
};

// ============================================
// Database Instance
// ============================================

let db: SQLite.SQLiteDatabase | null = null;

function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('makanai.db');
  }
  return db;
}

// ============================================
// Initialization
// ============================================

export async function initDatabase(): Promise<void> {
  const database = getDatabase();

  // Create tables
  database.execSync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      goal TEXT NOT NULL,
      environment TEXT NOT NULL,
      session_minutes INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      day_of_week TEXT NOT NULL,
      body_part TEXT NOT NULL,
      total_minutes INTEGER NOT NULL,
      is_rest_day INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      completed INTEGER NOT NULL DEFAULT 0,
      feedback TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ============================================
// User Profile
// ============================================

export function getProfile(): UserProfile | null {
  const database = getDatabase();
  const result = database.getFirstSync<{
    id: number;
    gender: string;
    age: number;
    height: number;
    weight: number;
    goal: string;
    environment: string;
    session_minutes: number;
  }>('SELECT * FROM user_profile WHERE id = 1');

  if (!result) return null;

  return {
    id: result.id,
    gender: result.gender,
    age: result.age,
    height: result.height,
    weight: result.weight,
    goal: result.goal,
    environment: result.environment,
    sessionMinutes: result.session_minutes,
  };
}

export function saveProfile(profile: UserProfile): void {
  const database = getDatabase();
  
  database.runSync(
    `INSERT OR REPLACE INTO user_profile 
     (id, gender, age, height, weight, goal, environment, session_minutes, updated_at) 
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      profile.gender,
      profile.age,
      profile.height,
      profile.weight,
      profile.goal,
      profile.environment,
      profile.sessionMinutes,
    ]
  );
}

// ============================================
// Weekly Plan
// ============================================

export function getWeeklyPlan(): DayPlan[] {
  const database = getDatabase();
  const results = database.getAllSync<{
    id: number;
    date: string;
    day_of_week: string;
    body_part: string;
    total_minutes: number;
    is_rest_day: number;
  }>('SELECT * FROM weekly_plan ORDER BY date ASC');

  return results.map((row) => ({
    id: row.id,
    date: row.date,
    dayOfWeek: row.day_of_week,
    bodyPart: row.body_part,
    totalMinutes: row.total_minutes,
    isRestDay: row.is_rest_day === 1,
  }));
}

export function saveWeeklyPlan(plans: DayPlan[]): void {
  const database = getDatabase();
  
  // Clear existing plans
  database.runSync('DELETE FROM weekly_plan');
  
  // Insert new plans
  for (const plan of plans) {
    database.runSync(
      `INSERT INTO weekly_plan (date, day_of_week, body_part, total_minutes, is_rest_day) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        plan.date,
        plan.dayOfWeek,
        plan.bodyPart,
        plan.totalMinutes,
        plan.isRestDay ? 1 : 0,
      ]
    );
  }
}

export function getTodayPlan(): DayPlan | null {
  const database = getDatabase();
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
  
  const result = database.getFirstSync<{
    id: number;
    date: string;
    day_of_week: string;
    body_part: string;
    total_minutes: number;
    is_rest_day: number;
  }>('SELECT * FROM weekly_plan WHERE date = ?', [todayStr]);

  if (!result) return null;

  return {
    id: result.id,
    date: result.date,
    dayOfWeek: result.day_of_week,
    bodyPart: result.body_part,
    totalMinutes: result.total_minutes,
    isRestDay: result.is_rest_day === 1,
  };
}

// ============================================
// Daily Log
// ============================================

export function getDailyLogs(days: number = 7): DailyLog[] {
  const database = getDatabase();
  const results = database.getAllSync<{
    id: number;
    date: string;
    completed: number;
    feedback: string | null;
  }>(
    'SELECT * FROM daily_log ORDER BY date DESC LIMIT ?',
    [days]
  );

  return results.map((row) => ({
    id: row.id,
    date: row.date,
    completed: row.completed === 1,
    feedback: row.feedback || undefined,
  }));
}

export function getTodayLog(): DailyLog | null {
  const database = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  
  const result = database.getFirstSync<{
    id: number;
    date: string;
    completed: number;
    feedback: string | null;
  }>('SELECT * FROM daily_log WHERE date = ?', [today]);

  if (!result) return null;

  return {
    id: result.id,
    date: result.date,
    completed: result.completed === 1,
    feedback: result.feedback || undefined,
  };
}

export function saveDailyLog(log: DailyLog): void {
  const database = getDatabase();
  
  database.runSync(
    `INSERT OR REPLACE INTO daily_log (date, completed, feedback, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [log.date, log.completed ? 1 : 0, log.feedback || null]
  );
}

export function toggleTodayCompletion(): boolean {
  const database = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  
  const existing = getTodayLog();
  const newCompleted = existing ? !existing.completed : true;
  
  database.runSync(
    `INSERT OR REPLACE INTO daily_log (date, completed, feedback, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [today, newCompleted ? 1 : 0, existing?.feedback || null]
  );
  
  return newCompleted;
}

export function saveFeedback(feedback: string): void {
  const database = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  
  const existing = getTodayLog();
  
  database.runSync(
    `INSERT OR REPLACE INTO daily_log (date, completed, feedback, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [today, existing?.completed ? 1 : 0, feedback]
  );
}

// ============================================
// App Settings
// ============================================

export function getSetting(key: string): string | null {
  const database = getDatabase();
  const result = database.getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
}

export function setSetting(key: string, value: string): void {
  const database = getDatabase();
  database.runSync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ============================================
// Utility Functions
// ============================================

export function isOnboardingComplete(): boolean {
  return getSetting('onboarding_complete') === 'true';
}

export function setOnboardingComplete(): void {
  setSetting('onboarding_complete', 'true');
}

export function getStreakCount(): number {
  const logs = getDailyLogs(30);
  const today = new Date();
  let count = 0;

  for (const log of logs) {
    const logDate = new Date(log.date);
    const diffDays = Math.floor(
      (today.setHours(0, 0, 0, 0) - logDate.setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays === count && log.completed) {
      count += 1;
    } else if (diffDays > count) {
      break;
    }
  }

  return count;
}

export function getCompletionStats(days: number = 7): { done: number; pending: number } {
  const logs = getDailyLogs(days);
  const done = logs.filter((log) => log.completed).length;
  return { done, pending: days - done };
}

