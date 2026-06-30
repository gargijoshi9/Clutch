import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAlgorithmicSchedule = (blockedBlocks = [], peakTime = "morning", tasks = []) => {
  const schedule = [];
  const now = new Date();

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

  let sessionIdx = 0;

  for (let dayOffset = 0; dayOffset < 7 && sessionIdx < sessionsToSchedule.length; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split("T")[0];
    const weekday = daysOfWeek[targetDate.getDay()];

    let dailyStart = 8 * 60; // 08:00
    let dailyEnd = 22 * 60;  // 22:00
    if (peakTime === "morning") {
      dailyStart = 9 * 60;
    } else {
      dailyStart = 14 * 60;
      dailyEnd = 23 * 60;
    }

    const blocksToday = (blockedBlocks || []).filter((b) => b.days && b.days.includes(weekday));
    let timePointer = dailyStart;

    while (timePointer < dailyEnd && sessionIdx < sessionsToSchedule.length) {
      const session = sessionsToSchedule[sessionIdx];
      const duration = session.duration;

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
        timePointer = nextAvailableTime;
        if (timePointer + duration > dailyEnd) {
          break;
        }
        continue;
      }

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

      timePointer += duration + 15; // 15 mins break
      sessionIdx++;
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

    const systemPrompt = `You are a student schedule optimizer. Build a realistic 7-day schedule.
Return a JSON array of scheduled items adhering exactly to the rules:
1. NEVER schedule inside blocked time windows.
2. Add a 10-minute buffer between consecutive tasks.
3. Tasks with estimatedMinutes > 90 MUST be split into multiple sessions.
4. Schedule critical tasks on earliest available dates.
5. If peakTime is 'morning', prefer morning slots. If peakTime is 'night', prefer evening slots.`;

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
