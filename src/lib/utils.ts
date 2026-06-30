import { Task } from "../types";

export const getLocalDateStr = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
};

export const getWeekRange = (baseDate: Date = new Date()): string => {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const monMonth = monday.toLocaleString("default", { month: "short" });
  const sunMonth = sunday.toLocaleString("default", { month: "short" });
  const year = sunday.getFullYear();
  
  if (monMonth === sunMonth) {
    return `${monMonth} ${monday.getDate()} – ${sunday.getDate()}, ${year}`;
  } else {
    return `${monMonth} ${monday.getDate()} – ${sunMonth} ${sunday.getDate()}, ${year}`;
  }
};

export const getTaskColor = (category: string, priority?: string): string => {
  const map: Record<string, string> = {
    college: "#E24B4A",
    exam_prep: "#E24B4A",
    chore: "#888780",
    health: "#639922",
    personal: "#BA7517",
    work: "#BA7517",
  };
  return map[category?.toLowerCase()] ?? (priority === "critical" ? "#E24B4A" : "#888780");
};

export const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const toISODeadline = (d: Date): string => d.toISOString();

export const getMonday = (from = new Date()): Date => {
  const d = new Date(from);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

export const splitIntoSessions = (task: Task | { estimatedMinutes: number }): { sessions: number; minutesEach: number } => {
  if (task.estimatedMinutes <= 90) return { sessions: 1, minutesEach: task.estimatedMinutes };
  const sessions = Math.ceil(task.estimatedMinutes / 90);
  const minutesEach = Math.round(task.estimatedMinutes / sessions / 5) * 5;
  return { sessions, minutesEach };
};
