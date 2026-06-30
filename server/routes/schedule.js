import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAlgorithmicSchedule = (blockedBlocks = [], peakTime = "morning", tasks = []) => {
  const schedule = [];
  const now = new Date();

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const pendingTasks = (tasks || []).filter((t) => t.status === "pending");
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

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const sessionsToSchedule = [];
  for (const task of pendingTasks) {
    const est = task.estimatedMinutes || 45;
    let sessions = 1;
    let minutesEach = est;
    if (est > 90) {
      sessions = Math.ceil(est / 90);
      minutesEach = Math.round(est / sessions / 5) * 5;
    }

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
  const dayTimePointers = {};

  const getTimePointerForDay = (dateStr, weekday) => {
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
          sessionNumber: session.total > 1 ? session.sessionIndex : null,
          totalSessions: session.total > 1 ? session.total : null,
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

router.post("/", async (req, res, next) => {
  const { blockedBlocks = [], peakTime = "morning", tasks = [], timezone = "UTC" } = req.body;

  const pendingTasks = (tasks || []).filter((t) => t.status === "pending");
  if (pendingTasks.length === 0) {
    console.log("[Clutch Schedule] No pending tasks to schedule. Returning empty array directly to avoid Gemini API calls.");
    return res.json([]);
  }

  // If there are only 1 or 2 pending tasks, the scheduling is straightforward. We can use the fast deterministic algorithmic scheduler.
  if (pendingTasks.length <= 2) {
    console.log("[Clutch Schedule] 2 or fewer tasks to schedule. Using fast algorithmic scheduler to save Gemini calls.");
    return res.json(getAlgorithmicSchedule(blockedBlocks, peakTime, tasks));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("[Clutch Schedule] No valid API key configured. Using smart algorithmic schedule.");
    return res.json(getAlgorithmicSchedule(blockedBlocks, peakTime, tasks));
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemPrompt = `You are a student schedule optimizer. Build a realistic schedule.
Return a JSON array of scheduled items adhering exactly to the rules:
1. NEVER schedule inside blocked time windows.
2. Add a 10-minute buffer between consecutive tasks.
3. Tasks with estimatedMinutes > 90 MUST be split into multiple sessions.
4. If a task has a specific deadline/date (e.g., tomorrow, next week, or any specific date), schedule it ON THAT EXACT DATE.
5. If a task has no deadline, schedule it on the earliest available date starting from today.
6. If peakTime is 'morning', prefer morning slots. If peakTime is 'night', prefer evening slots.`;

    const userMessage = `Today: ${new Date().toISOString().split('T')[0]}
Timezone: ${timezone}
Peak time: ${peakTime}
Blocked windows: ${JSON.stringify(blockedBlocks)}
Tasks to schedule: ${JSON.stringify(tasks.filter(t => t.status === 'pending'))}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${systemPrompt}\n\nUser: ${userMessage}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              startTime: { type: Type.STRING, description: "HH:MM" },
              endTime: { type: Type.STRING, description: "HH:MM" },
              taskId: { type: Type.STRING },
              taskName: { type: Type.STRING },
              sessionNote: { type: Type.STRING },
              category: { type: Type.STRING },
              sessionNumber: { type: Type.INTEGER, nullable: true },
              totalSessions: { type: Type.INTEGER, nullable: true },
              sessionDuration: { type: Type.INTEGER, nullable: true }
            },
            required: ["date", "startTime", "endTime", "taskId", "taskName", "sessionNote", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return res.json(parsed);
      }
    }
    
    throw new Error("Invalid schedule shape returned from Gemini API");
  } catch (err) {
    console.warn("[Clutch Schedule] Gemini API failed or rate-limited. Falling back to algorithmic schedule. Error:", err.message);
    return res.json(getAlgorithmicSchedule(blockedBlocks, peakTime, tasks));
  }
});

export default router;
