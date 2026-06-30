import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAlgorithmicClassification = (name, deadline) => {
  const lower = name.toLowerCase();
  let category = "personal";
  let estimatedMinutes = 45;
  let urgency = "medium";
  let suggestedSubtasks = [];
  let dependencyNote = null;
  let schedulingTip = "Try to tackle this in one focused session.";

  if (lower.includes("exam") || lower.includes("prep") || lower.includes("study") || lower.includes("quiz") || lower.includes("test")) {
    category = "exam_prep";
    estimatedMinutes = 120;
    urgency = "high";
    suggestedSubtasks = [
      "Review study material and lecture slides",
      "Solve at least 5 practice problems",
      "Draft a summary cheat-sheet",
      "Take a short mock quiz to assess gaps"
    ];
    dependencyNote = "Download textbook chapters and lecture notes beforehand.";
    schedulingTip = "Divide this into 2 sessions to maintain high focus.";
  } else if (lower.includes("college") || lower.includes("class") || lower.includes("lecture") || lower.includes("homework") || lower.includes("essay") || lower.includes("project") || lower.includes("assignment") || lower.includes("paper")) {
    category = "college";
    estimatedMinutes = 90;
    urgency = "high";
    suggestedSubtasks = [
      "Outline key sections of the assignment",
      "Research and collect reference material",
      "Draft the main paragraphs",
      "Review against grading rubric and proofread"
    ];
    dependencyNote = "Keep assignment guidelines or lecture rubric open.";
    schedulingTip = "Work on this during your high-energy window.";
  } else if (lower.includes("clean") || lower.includes("laundry") || lower.includes("chore") || lower.includes("wash") || lower.includes("room") || lower.includes("grocery") || lower.includes("buy")) {
    category = "chore";
    estimatedMinutes = 30;
    urgency = "low";
    suggestedSubtasks = [
      "Gather cleaning supplies or shopping list",
      "Execute tasks sequentially without distractions",
      "Tidy up and put items back in their places"
    ];
    schedulingTip = "Knock this out quickly between heavier study blocks.";
  } else if (lower.includes("gym") || lower.includes("run") || lower.includes("workout") || lower.includes("doctor") || lower.includes("health") || lower.includes("dentist") || lower.includes("meds") || lower.includes("sleep")) {
    category = "health";
    estimatedMinutes = 60;
    urgency = "medium";
    suggestedSubtasks = [
      "Warm up or review appointment details",
      "Complete active workout or visit health professional",
      "Cool down, stretch, and log your progress"
    ];
    schedulingTip = "Keep this as a fixed block to refresh your mental state.";
  } else if (lower.includes("work") || lower.includes("shift") || lower.includes("apply") || lower.includes("resume") || lower.includes("interview") || lower.includes("job")) {
    category = "work";
    estimatedMinutes = 90;
    urgency = "high";
    suggestedSubtasks = [
      "Review key requirements and objectives",
      "Prepare necessary responses or draft materials",
      "Complete the active shift or submit application",
      "Send a professional follow-up message"
    ];
    dependencyNote = "Confirm times and specifics on your calendar first.";
    schedulingTip = "Ensure this does not conflict with your core class blocks.";
  } else {
    suggestedSubtasks = [
      "Break down task into clear actionable steps",
      "Set up a distraction-free work environment",
      "Execute the task and review output against criteria"
    ];
  }

  // Calculate urgency based on deadline proximity
  if (deadline) {
    const timeDiff = new Date(deadline).getTime() - Date.now();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    if (daysDiff < 2) {
      urgency = "critical";
    } else if (daysDiff < 4 && urgency !== "critical") {
      urgency = "high";
    }
  }

  return {
    category,
    estimatedMinutes,
    urgency,
    priority: urgency, // Provide both fields for absolute frontend compatibility
    suggestedSubtasks,
    dependencyNote,
    schedulingTip
  };
};

router.post("/", async (req, res, next) => {
  const { taskName, deadline } = req.body;
  if (!taskName) {
    return res.status(400).json({ error: "taskName is required" });
  }

  const lower = taskName.toLowerCase();
  const hasExam = lower.includes("exam") || lower.includes("prep") || lower.includes("study") || lower.includes("quiz") || lower.includes("test");
  const hasCollege = lower.includes("college") || lower.includes("class") || lower.includes("lecture") || lower.includes("homework") || lower.includes("essay") || lower.includes("project") || lower.includes("assignment") || lower.includes("paper");
  const hasChore = lower.includes("clean") || lower.includes("laundry") || lower.includes("chore") || lower.includes("wash") || lower.includes("room") || lower.includes("grocery") || lower.includes("buy");
  const hasHealth = lower.includes("gym") || lower.includes("run") || lower.includes("workout") || lower.includes("doctor") || lower.includes("health") || lower.includes("dentist") || lower.includes("meds") || lower.includes("sleep");
  const hasWork = lower.includes("work") || lower.includes("shift") || lower.includes("apply") || lower.includes("resume") || lower.includes("interview") || lower.includes("job");

  if (hasExam || hasCollege || hasChore || hasHealth || hasWork) {
    console.log("[Clutch Classify] Task matches key categories. Using fast algorithmic classification to save API calls.");
    return res.json(getAlgorithmicClassification(taskName, deadline));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("[Clutch Classify] No valid API key configured. Using smart algorithmic fallback.");
    return res.json(getAlgorithmicClassification(taskName, deadline));
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

    const systemPrompt = `You are a smart student task classifier.
Analyze the task, categorize it, and provide realistic metadata.
Return a JSON object conforming exactly to the responseSchema.`;

    const userMessage = `Task: ${taskName}. Deadline: ${deadline ?? 'not set'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${systemPrompt}\n\nUser: ${userMessage}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING, 
              description: "Category: college, exam_prep, chore, health, personal, or work" 
            },
            estimatedMinutes: { 
              type: Type.INTEGER, 
              description: "Realistic minutes to complete (integer multiple of 5)" 
            },
            urgency: { 
              type: Type.STRING, 
              description: "Urgency: critical, high, medium, or low" 
            },
            suggestedSubtasks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 to 4 actionable, specific subtasks" 
            },
            dependencyNote: { 
              type: Type.STRING, 
              description: "Materials or prep needed first, or null if none" 
            },
            schedulingTip: { 
              type: Type.STRING, 
              description: "Specific actionable advice on when or how to schedule" 
            }
          },
          required: ["category", "estimatedMinutes", "urgency", "suggestedSubtasks", "schedulingTip"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      // Ensure compatibility
      return res.json({
        category: parsed.category || "personal",
        estimatedMinutes: parsed.estimatedMinutes || 45,
        urgency: parsed.urgency || "medium",
        priority: parsed.urgency || "medium",
        suggestedSubtasks: parsed.suggestedSubtasks || ["Review requirements", "Take action", "Verify completed parts"],
        dependencyNote: parsed.dependencyNote || null,
        schedulingTip: parsed.schedulingTip || "Tackle this in your focus window."
      });
    }

    throw new Error("Empty response from Gemini API");
  } catch (err) {
    console.warn("[Clutch Classify] Gemini API failed or rate-limited. Falling back to algorithmic classifier. Error:", err.message);
    return res.json(getAlgorithmicClassification(taskName, deadline));
  }
});

export default router;
