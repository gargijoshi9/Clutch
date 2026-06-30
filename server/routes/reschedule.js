import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAlgorithmicReschedule = (taskName, freeWindows = []) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  let suggestion1 = {
    date: tomorrowStr,
    time: "10:00",
    reason: "Clear morning slot before your afternoon routine starts."
  };
  let suggestion2 = {
    date: dayAfterStr,
    time: "15:30",
    reason: "Calm afternoon block to help you get back on track."
  };

  // If we actually have free windows parsed or passed, map them
  if (Array.isArray(freeWindows) && freeWindows.length > 0) {
    if (freeWindows[0]) {
      suggestion1 = {
        date: freeWindows[0].date || tomorrowStr,
        time: freeWindows[0].startTime || "10:00",
        reason: "Matches your unblocked free window on this day."
      };
    }
    if (freeWindows[1]) {
      suggestion2 = {
        date: freeWindows[1].date || dayAfterStr,
        time: freeWindows[1].startTime || "15:30",
        reason: "Matches your secondary unblocked free window."
      };
    } else if (freeWindows[0] && freeWindows[0].endTime) {
      // Suggest another slot in the same day if only one free window is found
      suggestion2 = {
        date: freeWindows[0].date || tomorrowStr,
        time: "16:00",
        reason: "Alternative afternoon block on the same free day."
      };
    }
  }

  return {
    suggestion1,
    suggestion2,
    motivationalNote: "One step at a time. Action creates focus and beats perfect planning."
  };
};

router.post("/", async (req, res, next) => {
  const { taskName, freeWindows = [] } = req.body;
  if (!taskName) {
    return res.status(400).json({ error: "taskName is required" });
  }

  if (!freeWindows || freeWindows.length === 0) {
    console.log("[Clutch Reschedule] No free windows provided. Returning fast algorithmic suggestions directly to save Gemini calls.");
    return res.json(getAlgorithmicReschedule(taskName, freeWindows));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("[Clutch Reschedule] No valid API key configured. Using algorithmic reschedule fallback.");
    return res.json(getAlgorithmicReschedule(taskName, freeWindows));
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

    const systemPrompt = `You are a helpful student schedule recovery assistant.
Analyze the task and available free windows, and suggest 2 optimal reschedule slots and a short encouraging note.
Return a JSON object conforming exactly to the responseSchema.`;

    const userMessage = `Task '${taskName}' was just skipped.
Available free windows this week: ${JSON.stringify(freeWindows)}
Today: ${new Date().toISOString().split('T')[0]}
Suggest 2 optimal reschedule slots. Reason should be 1 sentence.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${systemPrompt}\n\nUser: ${userMessage}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion1: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                time: { type: Type.STRING, description: "HH:MM" },
                reason: { type: Type.STRING }
              },
              required: ["date", "time", "reason"]
            },
            suggestion2: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                time: { type: Type.STRING, description: "HH:MM" },
                reason: { type: Type.STRING }
              },
              required: ["date", "time", "reason"]
            },
            motivationalNote: { type: Type.STRING }
          },
          required: ["suggestion1", "suggestion2", "motivationalNote"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    }

    throw new Error("Empty response from Gemini API");
  } catch (err) {
    console.warn("[Clutch Reschedule] Gemini API failed or rate-limited. Falling back to algorithmic suggestion. Error:", err.message);
    return res.json(getAlgorithmicReschedule(taskName, freeWindows));
  }
});

export default router;
