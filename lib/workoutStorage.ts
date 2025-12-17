import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeeklyPlan = {
  weekStart: string;
  planJson: string;
};

export type WorkoutLog = {
  date: string;
  completed: boolean;
};

const WEEKLY_PLAN_KEY = 'weekly_plan_v1';
const WORKOUT_LOGS_KEY = 'workout_logs_v1';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const toUtcMidnight = (value: string) => new Date(`${value}T00:00:00.000Z`).getTime();

const isWithinWeek = (date: string, weekStart: string) => {
  const dateMs = toUtcMidnight(date);
  const weekStartMs = toUtcMidnight(weekStart);

  if (Number.isNaN(dateMs) || Number.isNaN(weekStartMs)) {
    return false;
  }

  return dateMs >= weekStartMs && dateMs < weekStartMs + WEEK_IN_MS;
};

const sortLogsByDate = (logs: WorkoutLog[]) =>
  [...logs].sort((a, b) => toUtcMidnight(a.date) - toUtcMidnight(b.date));

const readJson = async <T>(key: string): Promise<T | null> => {
  const value = await AsyncStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON for key ${key}`, error);
    return null;
  }
};

const writeJson = async (key: string, payload: unknown) => {
  await AsyncStorage.setItem(key, JSON.stringify(payload));
};

const pruneLogsForWeek = async (weekStart: string) => {
  const logs = await readJson<WorkoutLog[]>(WORKOUT_LOGS_KEY);
  if (!logs || logs.length === 0) return;

  const filtered = logs.filter((log) => isWithinWeek(log.date, weekStart));
  await writeJson(WORKOUT_LOGS_KEY, sortLogsByDate(filtered));
};

export const getWeeklyPlan = async (): Promise<WeeklyPlan | null> =>
  readJson<WeeklyPlan>(WEEKLY_PLAN_KEY);

export const saveWeeklyPlan = async (plan: WeeklyPlan) => {
  const existing = await getWeeklyPlan();
  const newWeekStart = toUtcMidnight(plan.weekStart);
  const existingWeekStart = existing ? toUtcMidnight(existing.weekStart) : null;

  if (
    existingWeekStart !== null &&
    !Number.isNaN(existingWeekStart) &&
    !Number.isNaN(newWeekStart) &&
    newWeekStart < existingWeekStart
  ) {
    // Avoid overwriting a newer plan with an older one.
    return;
  }

  await writeJson(WEEKLY_PLAN_KEY, plan);
  await pruneLogsForWeek(plan.weekStart);
};

export const clearWeeklyPlan = async () => {
  await AsyncStorage.removeItem(WEEKLY_PLAN_KEY);
  await AsyncStorage.removeItem(WORKOUT_LOGS_KEY);
};

export const getWorkoutLogs = async (weekStart?: string): Promise<WorkoutLog[]> => {
  const logs = (await readJson<WorkoutLog[]>(WORKOUT_LOGS_KEY)) ?? [];
  if (!weekStart) return sortLogsByDate(logs);

  return sortLogsByDate(logs.filter((log) => isWithinWeek(log.date, weekStart)));
};

export const saveWorkoutLog = async (log: WorkoutLog) => {
  const plan = await getWeeklyPlan();
  const activeWeekStart = plan?.weekStart;

  if (!activeWeekStart) {
    throw new Error('No active weekly plan found. Save a plan before logging workouts.');
  }

  if (!isWithinWeek(log.date, activeWeekStart)) {
    throw new Error('Workout logs must belong to the active weekly plan.');
  }

  const existingLogs = await getWorkoutLogs(activeWeekStart);
  const filtered = existingLogs.filter((item) => item.date !== log.date);
  const updatedLogs = sortLogsByDate([...filtered, log]);

  await writeJson(WORKOUT_LOGS_KEY, updatedLogs);
};

export const getActiveWeekWorkoutLogs = async (): Promise<WorkoutLog[]> => {
  const plan = await getWeeklyPlan();
  if (!plan) return [];

  return getWorkoutLogs(plan.weekStart);
};
