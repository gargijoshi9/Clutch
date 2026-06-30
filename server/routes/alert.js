import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAlgorithmicAlert = (deadlines = []) => {
  if (!deadlines || deadlines.length === 0) {
    return {
      alert: false,
      message: "Your schedule is currently light. Great job staying ahead!",
      todayAction: null
    };
  }

  const now = Date.now();
  const imminent = deadlines.filter((d) => {
    if (!d.date) return false;
    const diff = new Date(d.date).getTime() - now;
    return diff > 0 && diff < 3 * 24 * 3600 * 1000; // 3 days
  });

  if (imminent.length >= 2) {
    return {
      alert: true,
      message: `You have ${imminent.length} tight deadlines clustering over the next 72 hours.`,
      todayAction: "Focus on your highest priority task first and complete at least one study session today."
    };
  }

  return {
    alert: false,
    message: "Your schedule looks well-balanced. Keep maintaining steady progress!",
    todayAction: null
  };
};

router.post("/", async (req, res, next) => {
  const { deadlines = [] } = req.body;

  // Reduce unnecessary API calls: Check if there's any actual imminent deadline cluster first.
  // If there are less than 2 imminent deadlines, there is no pressure point, so we skip Gemini completely.
  const now = Date.now();
  const imminent = deadlines.filter((d) => {
    if (!d.date) return false;
    const diff = new Date(d.date).getTime() - now;
    return diff > 0 && diff < 3 * 24 * 3600 * 1000; // 3 days
  });

  if (imminent.length < 2) {
    console.log("[Clutch Alert] Less than 2 imminent deadlines found. Returning algorithmic response directly to avoid unnecessary Gemini calls.");
    return res.json(getAlgorithmicAlert(deadlines));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("[Clutch Alert] No valid API key configured. Using algorithmic alert fallback.");
    return res.json(getAlgorithmicAlert(deadlines));
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

    const systemPrompt = `You are a friendly student productivity coach.
Analyze the user's deadlines. If there's a tight deadline cluster in the next 3 to 5 days, flag it with alert: true, craft a supportive warning, and suggest one specific action for today. Otherwise, alert should be false.
Return a JSON object conforming exactly to the responseSchema.`;

    const userMessage = `Today: ${new Date().toISOString().split('T')[0]}
Upcoming deadlines: ${JSON.stringify(deadlines)}
Are there any deadline clusters or pressure points in the next 5 days?
If workload looks manageable, set alert:false and give an encouraging message.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${systemPrompt}\n\nUser: ${userMessage}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alert: { type: Type.BOOLEAN, description: "Whether there is a tight deadline cluster in the next 3-5 days" },
            message: { type: Type.STRING, description: "A friendly, supportive message about their workload (max 2 sentences)" },
            todayAction: { type: Type.STRING, description: "One specific, bite-sized actionable step they can complete today, or null if alert is false" }
          },
          required: ["alert", "message"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json({
        alert: parsed.alert || false,
        message: parsed.message || "Keep maintaining steady progress on your tasks.",
        todayAction: parsed.todayAction || null
      });
    }

    throw new Error("Empty response from Gemini API");
  } catch (err) {
    console.warn("[Clutch Alert] Gemini API failed or rate-limited. Falling back to algorithmic alert. Error:", err.message);
    return res.json(getAlgorithmicAlert(deadlines));
  }
});

export default router;
