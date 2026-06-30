export interface BlockedBlock {
  label: string;
  days: string[];   // ["Mon","Tue","Wed","Thu","Fri"]
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface UserProfile {
  name: string;
  timezone: string;
  blockedBlocks: BlockedBlock[];
  peakTime: "morning" | "night";
  dailyFreeHours: number;
  categories: string[];
}

export interface Task {
  id: string;
  name: string;
  deadline: string | null;       // ISO string
  priority: "critical"|"high"|"medium"|"low";
  category: string;
  estimatedMinutes: number;
  suggestedSubtasks: string[];
  dependencyNote: string | null;
  schedulingTip: string;
  status: "pending"|"done"|"skipped";
  createdAt: string;             // ISO string
}

export interface ScheduleItem {
  date: string;         // "YYYY-MM-DD"
  startTime: string;    // "HH:MM"
  endTime: string;      // "HH:MM"
  taskId: string;
  taskName: string;
  sessionNote: string;  // e.g. "Session 1 of 2 · 60 min"
  category: string;
  sessionNumber?: number;
  totalSessions?: number;
  sessionDuration?: number;
}

export interface PressureAlert {
  alert: boolean;
  message: string;
  todayAction: string | null;
}

export interface RecoveryData {
  suggestion1: { date: string; time: string; reason: string };
  suggestion2: { date: string; time: string; reason: string };
  motivationalNote: string;
}
