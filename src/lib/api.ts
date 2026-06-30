import { BlockedBlock, Task, ScheduleItem, PressureAlert, RecoveryData } from "../types";
import { splitIntoSessions, generateId, getLocalDateStr } from "./utils";

const API_BASE = ((import.meta as any).env?.VITE_API_URL || "").replace(/\/$/, "");

// Helper to delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fallback Mock Classification
const getMockClassification = (name: string, deadline: string | null): any => {
  const lower = name.toLowerCase();
  let category = "personal";
  let estimatedMinutes = 45;
  let priority = "medium";
  let suggestedSubtasks: string[] = [];
  let dependencyNote: string | null = null;
  let schedulingTip = "Try to tackle this in one focused session.";

  if (lower.includes("exam") || lower.includes("prep") || lower.includes("study") || lower.includes("quiz") || lower.includes("test")) {
    category = "exam_prep";
    estimatedMinutes = 120;
    priority = "high";
    suggestedSubtasks = ["Review notes and slides", "Solve practice problems", "Make flashcards", "Take a mock test"];
    dependencyNote = "Ensure you have all study guides downloaded first.";
    schedulingTip = "Split this across 2 sessions to avoid burnout.";
  } else if (lower.includes("college") || lower.includes("class") || lower.includes("lecture") || lower.includes("homework") || lower.includes("essay") || lower.includes("project") || lower.includes("assignment")) {
    category = "college";
    estimatedMinutes = 90;
    priority = "high";
    suggestedSubtasks = ["Outline the key sections", "Gather reference materials", "Draft initial paragraphs", "Proofread and submit"];
    dependencyNote = "Check the grading rubric before starting.";
    schedulingTip = "Start early in your peak focus hours.";
  } else if (lower.includes("clean") || lower.includes("laundry") || lower.includes("chore") || lower.includes("wash") || lower.includes("room") || lower.includes("grocery") || lower.includes("buy")) {
    category = "chore";
    estimatedMinutes = 30;
    priority = "low";
    suggestedSubtasks = ["Gather supplies", "Execute task", "Put things away"];
    schedulingTip = "Put on some energetic music to finish this quickly.";
  } else if (lower.includes("run") || lower.includes("workout") || lower.includes("gym") || lower.includes("doctor") || lower.includes("dentist") || lower.includes("meds") || lower.includes("sleep")) {
    category = "health";
    estimatedMinutes = 60;
    priority = "medium";
    suggestedSubtasks = ["Warm up for 5 mins", "Main activity", "Cool down & stretch"];
    schedulingTip = "Schedule right after class to maintain momentum.";
  } else if (lower.includes("job") || lower.includes("work") || lower.includes("resume") || lower.includes("apply") || lower.includes("interview") || lower.includes("meeting")) {
    category = "work";
    estimatedMinutes = 60;
    priority = "high";
    suggestedSubtasks = ["Prepare talking points", "Update files", "Send follow-up email"];
    dependencyNote = "Double check calendars for conflicting invites.";
    schedulingTip = "Do this when you have minimal class load.";
  } else {
    suggestedSubtasks = ["Break down into smaller steps", "Review completed parts"];
  }

  // If deadline is soon, bump priority
  if (deadline) {
    const timeDiff = new Date(deadline).getTime() - Date.now();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    if (daysDiff < 2) {
      priority = "critical";
    } else if (daysDiff < 4 && priority !== "critical") {
      priority = "high";
    }
  }

  return {
    category,
    estimatedMinutes,
    priority,
    suggestedSubtasks,
    dependencyNote,
    schedulingTip,
  };
};

export const classifyTask = async (name: string, deadline: string | null): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskName: name, deadline }),
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (error) {
    console.warn("Classify API failed, using intelligent mock client fallback:", error);
    await delay(1200);
    return getMockClassification(name, deadline);
  }
};

// Fallback Mock Schedule Generator
const generateMockSchedule = (
  blockedBlocks: BlockedBlock[],
  peakTime: string,
  tasks: Task[],
  timezone: string
): ScheduleItem[] => {
  const schedule: ScheduleItem[] = [];
  const now = new Date();

  // Filter tasks to only pending
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  if (pendingTasks.length === 0) return [];

  // Sort tasks by priority (critical > high > medium > low) and deadline
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  pendingTasks.sort((a, b) => {
    const pA = priorityWeight[a.priority] || 2;
    const pB = priorityWeight[b.priority] || 2;
    if (pA !== pB) return pB - pA;
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  // Schedule for next days
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper to parse time string HH:MM to minutes from midnight
  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  let activeTasks = [...pendingTasks];

  // Flat list of sessions to schedule
  const sessionsToSchedule: { task: Task; sessionIndex: number; total: number; duration: number }[] = [];
  for (const task of activeTasks) {
    const { sessions, minutesEach } = splitIntoSessions(task);
    for (let i = 0; i < sessions; i++) {
      sessionsToSchedule.push({
        task,
        sessionIndex: i + 1,
        total: sessions,
        duration: minutesEach,
      });
    }
  }

  // Keep track of day and time slots dynamically
  const dayTimePointers: Record<string, number> = {};

  const getTimePointerForDay = (dateStr: string, weekday: string): number => {
    if (dayTimePointers[dateStr] !== undefined) {
      return dayTimePointers[dateStr];
    }
    let dailyStart = 8 * 60; // 08:00
    if (peakTime === "morning") {
      dailyStart = 9 * 60;
    } else {
      dailyStart = 14 * 60;
    }
    dayTimePointers[dateStr] = dailyStart;
    return dailyStart;
  };

  let dailyEnd = 22 * 60; // 22:00
  if (peakTime === "night") {
    dailyEnd = 23 * 60;
  }

  for (const session of sessionsToSchedule) {
    const duration = session.duration;

    // Determine start date for search
    let startSearchDate = new Date(getLocalDateStr(now));
    if (session.task.deadline) {
      const deadlineDateStr = session.task.deadline.split("T")[0];
      const deadlineDate = new Date(deadlineDateStr);
      const todayDate = new Date(getLocalDateStr(now));
      if (deadlineDate > todayDate) {
        startSearchDate = deadlineDate;
      }
    }

    // Search up to 30 days to find a day with a free slot
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const targetDate = new Date(startSearchDate);
      targetDate.setDate(startSearchDate.getDate() + dayOffset);
      const dateStr = getLocalDateStr(targetDate);
      const weekday = daysOfWeek[targetDate.getDay()];

      let timePointer = getTimePointerForDay(dateStr, weekday);

      // Check if this slot collides with blocked blocks
      const blocksToday = (blockedBlocks || []).filter((b) => b.days && b.days.includes(weekday));

      let isBlocked = false;
      let nextAvailableTime = timePointer;

      for (const block of blocksToday) {
        if (!block.startTime || !block.endTime) continue;
        const blockStart = timeToMinutes(block.startTime);
        const blockEnd = timeToMinutes(block.endTime);

        if (timePointer < blockEnd && timePointer + duration > blockStart) {
          isBlocked = true;
          nextAvailableTime = Math.max(nextAvailableTime, blockEnd);
        }
      }

      if (isBlocked) {
        dayTimePointers[dateStr] = nextAvailableTime;
        timePointer = nextAvailableTime;
      }

      // Check if it fits in this day
      if (timePointer + duration <= dailyEnd) {
        // Fits! Schedule here
        const startTimeStr = minutesToTime(timePointer);
        const endTimeStr = minutesToTime(timePointer + duration);

        schedule.push({
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          taskId: session.task.id,
          taskName: session.task.name,
          sessionNote: session.total > 1
            ? `Session ${session.sessionIndex} of ${session.total} · ${duration} min`
            : session.task.schedulingTip || session.task.category,
          category: session.task.category,
          sessionNumber: session.total > 1 ? session.sessionIndex : undefined,
          totalSessions: session.total > 1 ? session.total : undefined,
          sessionDuration: duration,
        });

        // Update the time pointer for this day (plus 15 min buffer)
        dayTimePointers[dateStr] = timePointer + duration + 15;
        break; // Scheduled successfully, stop searching for this session
      }
    }
  }

  return schedule;
};

export const generateSchedule = async (
  blockedBlocks: BlockedBlock[],
  peakTime: string,
  tasks: Task[],
  timezone: string
): Promise<ScheduleItem[]> => {
  try {
    const res = await fetch(`${API_BASE}/api/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedBlocks, peakTime, tasks, timezone }),
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (error) {
    console.warn("Schedule API failed, using intelligent mock client fallback:", error);
    await delay(1500);
    return generateMockSchedule(blockedBlocks, peakTime, tasks, timezone);
  }
};

// Fallback Mock Pressure Alerts
export const getPressureAlert = async (deadlines: any[]): Promise<PressureAlert | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadlines }),
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (error) {
    console.warn("Alert API failed, using intelligent mock client fallback:", error);
    await delay(800);

    if (!deadlines || deadlines.length === 0) {
      return {
        alert: false,
        message: "Your schedule is currently light. Great job staying ahead!",
        todayAction: null,
      };
    }

    // Count deadlines in next 3 days
    const now = Date.now();
    const imminent = deadlines.filter((d) => {
      if (!d.date) return false;
      const diff = new Date(d.date).getTime() - now;
      return diff > 0 && diff < 3 * 24 * 3600 * 1000;
    });

    if (imminent.length >= 2) {
      return {
        alert: true,
        message: `You have ${imminent.length} tight deadlines clustering over the next 72 hours.`,
        todayAction: "Focus on your highest priority task first and complete at least one study session today.",
      };
    }

    return {
      alert: false,
      message: "Schedule is balanced. Keep up the good work!",
      todayAction: null,
    };
  }
};

// Fallback Mock Reschedule Suggestions
export const recoverTask = async (taskName: string, freeWindows: any[]): Promise<RecoveryData> => {
  try {
    const res = await fetch(`${API_BASE}/api/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskName, freeWindows }),
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (error) {
    console.warn("Reschedule API failed, using intelligent mock client fallback:", error);
    await delay(1000);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateStr(tomorrow);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = getLocalDateStr(dayAfter);

    return {
      suggestion1: {
        date: tomorrowStr,
        time: "10:00",
        reason: "Unblocked morning slot before your afternoon routine starts.",
      },
      suggestion2: {
        date: dayAfterStr,
        time: "19:30",
        reason: "Quiet evening session after your routine time blocks close.",
      },
      motivationalNote: "One small block at a time. Action creates focus.",
    };
  }
};
