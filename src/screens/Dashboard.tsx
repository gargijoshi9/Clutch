import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Pencil,
  Sparkles,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  List,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Task, ScheduleItem, PressureAlert, RecoveryData } from "../types";
import { classifyTask, generateSchedule, getPressureAlert, recoverTask } from "../lib/api";
import { getTaskColor, formatDate, generateId, splitIntoSessions, getLocalDateStr } from "../lib/utils";

// Custom type for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Redirect if profile does not exist
  useEffect(() => {
    const profile = localStorage.getItem("clutch_profile");
    if (!profile) {
      navigate("/onboard");
    }
  }, [navigate]);

  // Load state
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});

  // Input states
  const [taskName, setTaskName] = useState("");
  const pendingTaskNameRef = useRef("");
  const lastFetchedDeadlinesRef = useRef<string>("");

  // App statuses
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pressureAlert, setPressureAlert] = useState<PressureAlert | null>(null);
  const [dismissedAlertDate, setDismissedAlertDate] = useState<string | null>(null);

  // Bottom sheets & Interactive panels
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [rescheduleManualMode, setRescheduleManualMode] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");

  const [activeInsightsTask, setActiveInsightsTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Notifications
  const [toast, setToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [voiceTooltip, setVoiceTooltip] = useState(false);

  // Load everything on mount
  useEffect(() => {
    const loadedProfile = localStorage.getItem("clutch_profile");
    if (loadedProfile) {
      setProfile(JSON.parse(loadedProfile));
    }

    const loadedTasks = localStorage.getItem("clutch_tasks");
    if (loadedTasks) {
      setTasks(JSON.parse(loadedTasks));
    }

    const loadedSchedule = localStorage.getItem("clutch_schedule");
    if (loadedSchedule) {
      setSchedule(JSON.parse(loadedSchedule));
    }

    const loadedSubs = localStorage.getItem("clutch_completed_subtasks");
    if (loadedSubs) {
      setCompletedSubtasks(JSON.parse(loadedSubs));
    }

    const loadedDismissed = localStorage.getItem("clutch_alert_dismissed");
    if (loadedDismissed) {
      setDismissedAlertDate(loadedDismissed);
    }
  }, []);

  // Update localStorage helper
  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("clutch_tasks", JSON.stringify(newTasks));
  };

  const updateSchedule = (newSchedule: ScheduleItem[]) => {
    setSchedule(newSchedule);
    localStorage.setItem("clutch_schedule", JSON.stringify(newSchedule));
  };

  // Get today's date string in YYYY-MM-DD
  const getTodayStr = () => {
    return getLocalDateStr();
  };

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  };

  // Check pressure alerts based on pending deadlines
  useEffect(() => {
    const deadlines = tasks
      .filter((t) => t.status === "pending" && t.deadline)
      .map((t) => ({ id: t.id, name: t.name, date: t.deadline }));

    const deadlinesStr = JSON.stringify(deadlines);
    if (deadlinesStr === lastFetchedDeadlinesRef.current) {
      return;
    }
    lastFetchedDeadlinesRef.current = deadlinesStr;

    if (tasks.length > 0 && deadlines.length > 0) {
      getPressureAlert(deadlines).then((alertData) => {
        if (alertData) {
          setPressureAlert(alertData);
        }
      });
    } else {
      setPressureAlert(null);
    }
  }, [tasks]);

  // Voice recognition
  const startSpeech = () => {
    const CustomWindow = window as unknown as IWindow;
    const SpeechRecognition = CustomWindow.SpeechRecognition || CustomWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceTooltip(true);
      setTimeout(() => setVoiceTooltip(false), 3000);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) {
        setTaskName(transcript);
      }
    };

    rec.onerror = (err: any) => {
      console.error(err);
      triggerError("Voice capture failed. Try typing!");
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.start();
  };

  const triggerError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      setErrorBanner(null);
    }, 4000);
  };

  // Trigger auto schedule rebuild
  const triggerAutoSchedule = async (currentTasksList: Task[]) => {
    if (!profile) return;
    setIsGeneratingSchedule(true);
    try {
      const result = await generateSchedule(
        profile.blockedBlocks,
        profile.peakTime,
        currentTasksList,
        profile.timezone
      );
      updateSchedule(result);
    } catch (err) {
      console.error(err);
      triggerError("Schedule update failed. Tap regenerate to retry.");
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // Step 1: Submit Task Text
  const handleTaskSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskName.trim()) return;

    pendingTaskNameRef.current = taskName.trim();
    setShowDeadlinePicker(true);
  };

  // Step 2: Set Deadline & Create Task
  const continueWithDeadline = async (deadlineStr: string | null) => {
    setShowDeadlinePicker(false);
    setIsAnalyzing(true);
    const originalName = pendingTaskNameRef.current;
    setTaskName(""); // Clear field

    try {
      const response = await classifyTask(originalName, deadlineStr);
      
      const newTask: Task = {
        id: generateId(),
        name: originalName,
        deadline: deadlineStr,
        priority: response.priority || "medium",
        category: response.category || "personal",
        estimatedMinutes: response.estimatedMinutes || 45,
        suggestedSubtasks: response.suggestedSubtasks || [],
        dependencyNote: response.dependencyNote || null,
        schedulingTip: response.schedulingTip || "Tackle during your free slot.",
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const updated = [newTask, ...tasks];
      updateTasks(updated);
      setActiveInsightsTask(newTask);

      // Rebuild Schedule
      await triggerAutoSchedule(updated);

    } catch (error) {
      console.error(error);
      // Fallback
      const fallbackTask: Task = {
        id: generateId(),
        name: originalName,
        deadline: deadlineStr,
        priority: "medium",
        category: "personal",
        estimatedMinutes: 45,
        suggestedSubtasks: ["Break into steps", "Review done parts"],
        dependencyNote: null,
        schedulingTip: "Saved locally with generic defaults.",
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const updated = [fallbackTask, ...tasks];
      updateTasks(updated);
      setActiveInsightsTask(fallbackTask);
      triggerError("Couldn't reach AI. Your task was saved.");
      await triggerAutoSchedule(updated);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Complete Subtask checkbox toggle
  const toggleSubtask = (taskId: string, subtask: string) => {
    const list = completedSubtasks[taskId] || [];
    let updatedList: string[];
    if (list.includes(subtask)) {
      updatedList = list.filter((s) => s !== subtask);
    } else {
      updatedList = [...list, subtask];
    }

    const updatedMap = { ...completedSubtasks, [taskId]: updatedList };
    setCompletedSubtasks(updatedMap);
    localStorage.setItem("clutch_completed_subtasks", JSON.stringify(updatedMap));
  };

  // Mark task as Done
  const handleMarkDone = (taskId: string) => {
    // Fade animation and state transition
    const updated = tasks.map((t) => {
      if (t.id === taskId) return { ...t, status: "done" as const };
      return t;
    });

    // Save history
    const history = JSON.parse(localStorage.getItem("clutch_history") || "[]");
    history.push({ taskId, action: "done", timestamp: new Date().toISOString() });
    localStorage.setItem("clutch_history", JSON.stringify(history));

    updateTasks(updated);

    // Toast
    setToast("Great work!");
    setTimeout(() => setToast(null), 1000);

    // Clean schedule of this item
    const cleanSched = schedule.filter((item) => item.taskId !== taskId);
    updateSchedule(cleanSched);

    // If active insights was completed, clear it
    if (activeInsightsTask?.id === taskId) {
      setActiveInsightsTask(null);
    }
    setExpandedTaskId(null);
  };

  // Open Reschedule Sheet
  const handleOpenReschedule = (task: Task) => {
    setRescheduleTask(task);
    setRescheduleLoading(true);
    setShowRescheduleSheet(true);
    setRecoveryData(null);
    setRescheduleManualMode(false);

    recoverTask(task.name, []).then((suggestions) => {
      setRecoveryData(suggestions);
      setRescheduleLoading(false);
    }).catch(() => {
      // Hardcoded fallback on fail
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateStr(tomorrow);

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = getLocalDateStr(dayAfter);

      setRecoveryData({
        suggestion1: { date: tomorrowStr, time: "10:00", reason: "Safe slot after class routine blocks." },
        suggestion2: { date: dayAfterStr, time: "19:00", reason: "Quiet night hour after dinner blocks." },
        motivationalNote: "Stay consistent. One slot at a time.",
      });
      setRescheduleLoading(false);
    });
  };

  // Confirm Reschedule (suggestion or manual)
  const handleConfirmReschedule = (date: string, time: string, sessionNote?: string) => {
    if (!rescheduleTask) return;

    // Remove old schedule items for this taskId
    const filteredSched = schedule.filter((item) => item.taskId !== rescheduleTask.id);

    // Create rescheduled item
    const newItem: ScheduleItem = {
      date,
      startTime: time,
      endTime: calculateEndTime(time, rescheduleTask.estimatedMinutes),
      taskId: rescheduleTask.id,
      taskName: rescheduleTask.name,
      sessionNote: sessionNote || rescheduleTask.schedulingTip || "Rescheduled session",
      category: rescheduleTask.category,
    };

    updateSchedule([...filteredSched, newItem]);

    // Update task status and set deadline to the rescheduled date so it aligns and shows on that day
    const updatedTasks = tasks.map((t) => {
      if (t.id === rescheduleTask.id) {
        return {
          ...t,
          status: "pending" as const,
          deadline: `${date}T23:59:00.000Z`
        };
      }
      return t;
    });
    updateTasks(updatedTasks);

    // Log to history
    const history = JSON.parse(localStorage.getItem("clutch_history") || "[]");
    history.push({ taskId: rescheduleTask.id, action: "rescheduled", timestamp: new Date().toISOString() });
    localStorage.setItem("clutch_history", JSON.stringify(history));

    setShowRescheduleSheet(false);
    setRescheduleTask(null);
    setExpandedTaskId(null);

    setToast("Rescheduled!");
    setTimeout(() => setToast(null), 1000);
  };

  const calculateEndTime = (start: string, durationMin: number): string => {
    const [h, m] = start.split(":").map(Number);
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  // Dismiss pressure alert banner
  const handleDismissAlert = () => {
    const today = getTodayStr();
    setDismissedAlertDate(today);
    localStorage.setItem("clutch_alert_dismissed", today);
  };

  // Today's schedule rendering lists
  const todayStr = getTodayStr();
  const todayScheduleItems = schedule.filter((item) => item.date === todayStr);

  // Unscheduled pending tasks due today
  const todayUnscheduledTasks = tasks.filter((t) => {
    if (t.status !== "pending") return false;
    if (!t.deadline) return false;
    const isDueToday = t.deadline.split("T")[0] === todayStr;
    const isScheduledAnywhere = schedule.some((s) => s.taskId === t.id);
    return isDueToday && !isScheduledAnywhere;
  });

  // Up next task calculation
  const getUpNextTask = () => {
    // 1. Get today's scheduled items that aren't finished yet
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const timeToMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const remainingScheduledToday = todayScheduleItems
      .filter((s) => {
        const taskObj = tasks.find((t) => t.id === s.taskId);
        return taskObj && taskObj.status === "pending";
      })
      .sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

    if (remainingScheduledToday.length > 0) {
      const nextItem = remainingScheduledToday[0];
      const taskObj = tasks.find((t) => t.id === nextItem.taskId)!;
      return {
        task: taskObj,
        scheduled: true,
        startTime: nextItem.startTime,
        sessionDuration: nextItem.sessionDuration,
        sessionNote: nextItem.sessionNote,
        isSplit: !!nextItem.sessionNumber,
        sessionNumber: nextItem.sessionNumber,
        totalSessions: nextItem.totalSessions,
      };
    }

    // 2. Or grab the highest priority unscheduled task
    const pendingUnscheduled = tasks.filter((t) => {
      const hasSched = schedule.some((s) => s.taskId === t.id);
      return t.status === "pending" && !hasSched;
    });

    if (pendingUnscheduled.length > 0) {
      return {
        task: pendingUnscheduled[0],
        scheduled: false,
        startTime: null,
      };
    }

    return null;
  };

  const upNext = getUpNextTask();

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] flex flex-col items-center justify-start pb-24 font-sans selection:bg-[#EDEBE8]">
      
      {/* ERROR BANNER */}
      <AnimatePresence>
        {errorBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 bg-[#FFF0F0] text-[#E24B4A] border border-[#E24B4A] rounded-[14px] p-4 flex items-start gap-3 shadow-md max-w-[358px] mx-auto"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] font-medium leading-tight">{errorBanner}</p>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-[#E24B4A]">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-3 rounded-[20px] flex items-center gap-2 shadow-xl"
          >
            <Check size={16} className="text-[#639922]" />
            <span className="text-[13px] font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER WORKSPACE CONTAINER */}
      <div className="w-full max-w-[390px] px-4 flex flex-col gap-6 pt-4">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between py-2 border-b border-[#EDEBE8]">
          <span className="text-[18px] font-medium tracking-tight lowercase text-[#1A1A1A]">clutch</span>
          <span className="text-[11px] text-[#BDBBB6] font-medium tracking-wider uppercase">
            {getTodayFormatted()}
          </span>
        </div>

        {/* PRESSURE ALERT BANNER */}
        {pressureAlert && pressureAlert.alert && dismissedAlertDate !== todayStr && (
          <div className="bg-[#FFF8EC] border border-[#E0DED9] rounded-[14px] p-4 flex items-start gap-3 text-[#BA7517]">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-[#BA7517]" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[12px] font-medium leading-snug">{pressureAlert.message}</span>
              {pressureAlert.todayAction && (
                <span className="text-[11px] text-[#BA7517]/80 leading-normal font-medium">
                  Tip: {pressureAlert.todayAction}
                </span>
              )}
            </div>
            <button onClick={handleDismissAlert} className="text-[#BA7517] hover:opacity-80 p-0.5">
              <X size={16} />
            </button>
          </div>
        )}

        {/* REBUILDING INDICATOR */}
        {isGeneratingSchedule && (
          <div className="flex items-center gap-2 py-1 text-[#BDBBB6]">
            <Loader2 size={13} className="animate-spin text-[#BDBBB6]" />
            <span className="text-[11px] font-medium tracking-wider uppercase">Rebuilding schedule...</span>
          </div>
        )}

        {/* UP NEXT CARD */}
        <div className="bg-[#1A1A1A] text-white rounded-[16px] p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[#888888] font-medium tracking-widest uppercase">UP NEXT</span>
            <button
              onClick={() => navigate("/schedule")}
              className="bg-[#2E2E2E] text-white hover:bg-[#3E3E3E] text-[11px] py-1 px-3 rounded-[20px] transition-all font-medium"
            >
              Schedule →
            </button>
          </div>

          {upNext ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-[17px] font-medium text-white tracking-tight leading-tight">
                {upNext.task.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="bg-[#2E2E2E] text-[#CCCCCC] text-[11px] font-medium py-0.5 px-2.5 rounded-[20px]">
                  {upNext.scheduled
                    ? `${upNext.startTime} · ${upNext.sessionDuration || upNext.task.estimatedMinutes} min`
                    : `${upNext.task.estimatedMinutes} min est.`}
                </span>

                {upNext.scheduled && upNext.isSplit && (
                  <span className="bg-[#BA7517] text-white text-[10px] font-medium py-0.5 px-2 rounded-[20px]">
                    Session {upNext.sessionNumber} of {upNext.totalSessions}
                  </span>
                )}

                {upNext.task.deadline && (
                  <span className="text-[11px] text-[#E24B4A] font-medium">
                    Due soon
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#888888] py-2">
              You're all clear. Add something below.
            </p>
          )}
        </div>

        {/* ADD A TASK BOX */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">ADD A TASK</span>
          
          <form
            onSubmit={handleTaskSubmit}
            className="bg-white border border-[#E0DED9] rounded-[14px] overflow-hidden flex flex-col relative"
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EDEBE8]">
              <Pencil size={16} className="text-[#BDBBB6] shrink-0" />
              <input
                type="text"
                id="taskNameInput"
                placeholder="What do you need to do?"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                disabled={isAnalyzing}
                className="w-full text-[14px] text-[#1A1A1A] placeholder-[#BDBBB6] focus:outline-none disabled:bg-transparent"
              />
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#FCFBFA]">
              {/* Voice capture button with pulse rings */}
              <div className="relative">
                <AnimatePresence>
                  {isListening && (
                    <>
                      <motion.div
                        className="absolute inset-0 bg-[#E24B4A] rounded-full"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-[#E24B4A] rounded-full"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.75 }}
                      />
                    </>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  id="voiceInputBtn"
                  onClick={startSpeech}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-[20px] border text-[11px] font-medium transition-all ${
                    isListening
                      ? "bg-[#E24B4A] text-white border-transparent z-10"
                      : "bg-[#F7F6F3] text-[#1A1A1A] border-[#E0DED9] hover:bg-[#EDEBE8]"
                  }`}
                >
                  <Mic size={12} />
                  <span>{isListening ? "Listening..." : "Voice input"}</span>
                </button>

                {voiceTooltip && (
                  <div className="absolute top-10 left-0 bg-[#1A1A1A] text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-20">
                    Try typing instead
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                id="addTaskSubmitBtn"
                disabled={!taskName.trim() || isAnalyzing}
                className="bg-[#1A1A1A] disabled:bg-[#EDEBE8] disabled:text-[#BDBBB6] text-white text-[12px] font-medium py-1.5 px-4.5 rounded-[20px] transition-all flex items-center gap-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Add task</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* AI INSIGHTS PANEL (POST TASK SUBMISSION) */}
        <AnimatePresence>
          {activeInsightsTask && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-4 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveInsightsTask(null)}
                className="absolute top-3 right-3 text-[#BDBBB6] hover:text-[#1A1A1A]"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-1.5 text-[#BA7517]">
                <Sparkles size={14} className="text-[#BA7517]" />
                <span className="text-[10px] font-medium tracking-wider uppercase">Clutch AI Analysis</span>
              </div>

              <div className="text-[13px] font-medium border-b border-[#EDEBE8] pb-2 text-[#1A1A1A]">
                {activeInsightsTask.name}
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-[#F7F6F3] text-[#1A1A1A] text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-[20px] border border-[#E0DED9]">
                  {activeInsightsTask.category}
                </span>
                <span className="bg-[#F7F6F3] text-[#1A1A1A] text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-[20px] border border-[#E0DED9]">
                  {activeInsightsTask.priority} priority
                </span>
                <span className="bg-[#F7F6F3] text-[#1A1A1A] text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-[20px] border border-[#E0DED9]">
                  {activeInsightsTask.estimatedMinutes} mins
                </span>
              </div>

              {/* Split Task Info */}
              {activeInsightsTask.estimatedMinutes > 90 && (
                <div className="bg-[#F7F6F3] border border-[#E0DED9] rounded-[8px] p-2.5 text-[11px] text-[#888780]">
                  This task is split into {splitIntoSessions(activeInsightsTask).sessions} sessions of {splitIntoSessions(activeInsightsTask).minutesEach} min each.
                </div>
              )}

              {/* Scheduling Tip */}
              <div className="bg-[#FFFDF9] border border-[#EDEBE8] rounded-[8px] p-3 text-[12px] text-[#BA7517] leading-relaxed">
                <span className="font-medium">Tip:</span> {activeInsightsTask.schedulingTip}
              </div>

              {/* Dependency Note */}
              {activeInsightsTask.dependencyNote && (
                <div className="bg-[#FFF8EC] text-[#BA7517] border border-[#E0DED9] rounded-[8px] p-2.5 text-[11px] leading-relaxed font-medium">
                  Note: {activeInsightsTask.dependencyNote}
                </div>
              )}

              {/* Suggested Subtasks Checklist */}
              {activeInsightsTask.suggestedSubtasks && activeInsightsTask.suggestedSubtasks.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">AI Subtasks</span>
                  <div className="flex flex-col gap-2">
                    {activeInsightsTask.suggestedSubtasks.map((sub, i) => {
                      const isDone = (completedSubtasks[activeInsightsTask.id] || []).includes(sub);
                      return (
                        <label key={i} className="flex items-start gap-2 text-[12px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleSubtask(activeInsightsTask.id, sub)}
                            className="mt-0.5 accent-[#1A1A1A] border-[#E0DED9] rounded"
                          />
                          <span className={isDone ? "line-through text-[#BDBBB6]" : "text-[#1A1A1A]"}>
                            {sub}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TODAY'S TASKS LIST */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">TODAY</span>

          <div className="bg-white border border-[#E0DED9] rounded-[14px] overflow-hidden">
            
            {/* Loading skeleton */}
            {isGeneratingSchedule && todayScheduleItems.length === 0 && todayUnscheduledTasks.length === 0 ? (
              <div className="flex flex-col">
                {[1, 2, 3].map((v) => (
                  <div key={v} className="p-4 border-b border-[#EDEBE8] flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-[#EDEBE8] rounded-full" />
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3 bg-[#EDEBE8] w-28 rounded" />
                        <div className="h-2.5 bg-[#EDEBE8] w-20 rounded" />
                      </div>
                    </div>
                    <div className="h-3 bg-[#EDEBE8] w-10 rounded" />
                  </div>
                ))}
              </div>
            ) : todayScheduleItems.length === 0 && todayUnscheduledTasks.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[#BDBBB6] italic">
                Nothing scheduled for today. Add a task above!
              </div>
            ) : (
              <div className="flex flex-col">
                <AnimatePresence initial={false}>
                  {/* Scheduled Items First */}
                  {todayScheduleItems.map((item) => {
                    const taskObj = tasks.find((t) => t.id === item.taskId);
                    if (!taskObj || taskObj.status !== "pending") return null;

                    const isExpanded = expandedTaskId === taskObj.id;

                    return (
                      <motion.div
                        key={`${item.taskId}-${item.startTime}`}
                        id={`task-row-${taskObj.id}`}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="border-b border-[#EDEBE8] last:border-0"
                      >
                        {/* Summary View */}
                        <div
                          onClick={() => setExpandedTaskId(isExpanded ? null : taskObj.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#FCFBFA] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getTaskColor(taskObj.category, taskObj.priority) }}
                            />
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-[#1A1A1A] truncate flex items-center gap-1.5">
                                <span>{taskObj.name}</span>
                                {item.sessionNumber && (
                                  <span className="text-[9px] bg-[#EDEBE8] text-[#888780] px-1 rounded">
                                    S{item.sessionNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#BDBBB6] uppercase tracking-wide">
                                {taskObj.category} · {taskObj.priority}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] text-[#888780] font-mono whitespace-nowrap">
                            {item.startTime}
                          </span>
                        </div>

                        {/* Extended Panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-[#FCFBFA] border-t border-[#EDEBE8]/50 flex flex-col gap-3 pt-3">
                            {/* Short AI Summary */}
                            <div className="text-[12px] text-[#888780] flex flex-col gap-1">
                              <div><span className="font-medium text-[#1A1A1A]">AI Advice:</span> {taskObj.schedulingTip}</div>
                              {taskObj.dependencyNote && (
                                <div className="text-[#BA7517] font-medium mt-1">Prep: {taskObj.dependencyNote}</div>
                              )}
                            </div>

                            {/* Done & Skip Buttons */}
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => handleMarkDone(taskObj.id)}
                                className="flex-1 bg-[#1A1A1A] text-white text-[12px] font-medium py-2 rounded-[20px] transition-all flex items-center justify-center gap-1.5"
                              >
                                <Check size={14} className="text-[#639922]" /> Done
                              </button>
                              <button
                                onClick={() => handleOpenReschedule(taskObj)}
                                className="flex-1 border border-[#E0DED9] text-[#1A1A1A] text-[12px] font-medium py-2 rounded-[20px] transition-all bg-white"
                              >
                                Skip & Reschedule
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Unscheduled Fallback Items */}
                  {todayUnscheduledTasks.map((taskObj) => {
                    const isExpanded = expandedTaskId === taskObj.id;

                    return (
                      <motion.div
                        key={taskObj.id}
                        id={`task-row-${taskObj.id}`}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="border-b border-[#EDEBE8] last:border-0"
                      >
                        {/* Summary View */}
                        <div
                          onClick={() => setExpandedTaskId(isExpanded ? null : taskObj.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#FCFBFA] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getTaskColor(taskObj.category, taskObj.priority) }}
                            />
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-[#1A1A1A] truncate">{taskObj.name}</div>
                              <div className="text-[11px] text-[#BDBBB6] uppercase tracking-wide">
                                {taskObj.category} · {taskObj.priority} · not scheduled
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-[#BDBBB6]" />
                        </div>

                        {/* Extended Panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-[#FCFBFA] border-t border-[#EDEBE8]/50 flex flex-col gap-3 pt-3">
                            <div className="text-[12px] text-[#888780]">
                              <span className="font-medium text-[#1A1A1A]">AI Advice:</span> {taskObj.schedulingTip}
                            </div>

                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => handleMarkDone(taskObj.id)}
                                className="flex-1 bg-[#1A1A1A] text-white text-[12px] font-medium py-2 rounded-[20px] transition-all flex items-center justify-center gap-1.5"
                              >
                                <Check size={14} className="text-[#639922]" /> Done
                              </button>
                              <button
                                onClick={() => handleOpenReschedule(taskObj)}
                                className="flex-1 border border-[#E0DED9] text-[#1A1A1A] text-[12px] font-medium py-2 rounded-[20px] transition-all bg-white"
                              >
                                Skip & Reschedule
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DEADLINE PICKER BOTTOM SHEET */}
      <AnimatePresence>
        {showDeadlinePicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeadlinePicker(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sheet */}
            <motion.div
              id="deadlinePickerSheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white rounded-t-[16px] z-50 p-6 flex flex-col gap-5 border-t border-[#E0DED9]"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium text-[#1A1A1A]">When is this due?</span>
                  <span className="text-[12px] text-[#BDBBB6]">Clutch will optimize schedule buffers around this.</span>
                </div>
                <button onClick={() => setShowDeadlinePicker(false)} className="text-[#BDBBB6] hover:text-[#1A1A1A] p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  id="deadlineTodayBtn"
                  onClick={() => continueWithDeadline(new Date().toISOString())}
                  className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-[#E0DED9] hover:border-[#1A1A1A] text-[13px] font-medium text-left"
                >
                  <Calendar size={15} className="text-[#BDBBB6]" />
                  <span>Today</span>
                </button>

                <button
                  type="button"
                  id="deadlineTomorrowBtn"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    continueWithDeadline(tom.toISOString());
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-[#E0DED9] hover:border-[#1A1A1A] text-[13px] font-medium text-left"
                >
                  <Clock size={15} className="text-[#BDBBB6]" />
                  <span>Tomorrow</span>
                </button>

                <button
                  type="button"
                  id="deadlineWeekBtn"
                  onClick={() => {
                    const week = new Date();
                    week.setDate(week.getDate() + 7);
                    continueWithDeadline(week.toISOString());
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-[12px] border border-[#E0DED9] hover:border-[#1A1A1A] text-[13px] font-medium text-left"
                >
                  <List size={15} className="text-[#BDBBB6]" />
                  <span>This Week</span>
                </button>

                {/* Native picker inline */}
                <div className="flex items-center gap-3 p-3 rounded-[12px] border border-[#E0DED9] hover:border-[#1A1A1A] text-[13px] font-medium relative bg-white">
                  <Calendar size={15} className="text-[#BDBBB6] shrink-0" />
                  <span className="shrink-0 text-left">Pick a date:</span>
                  <input
                    type="date"
                    id="deadlineNativePicker"
                    min={getLocalDateStr()}
                    onChange={(e) => {
                      if (e.target.value) {
                        const d = new Date(e.target.value);
                        continueWithDeadline(d.toISOString());
                      }
                    }}
                    className="flex-1 focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  id="deadlineNoneBtn"
                  onClick={() => continueWithDeadline(null)}
                  className="w-full text-center text-[#BDBBB6] hover:text-[#1A1A1A] text-[12px] font-medium py-2.5 mt-1"
                >
                  No deadline
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RESCHEDULE BOTTOM SHEET */}
      <AnimatePresence>
        {showRescheduleSheet && rescheduleTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRescheduleSheet(false);
                setRescheduleTask(null);
              }}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sheet */}
            <motion.div
              id="rescheduleSheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white rounded-t-[16px] z-50 p-6 flex flex-col gap-4 border-t border-[#E0DED9]"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium text-[#1A1A1A]">Let's find another time</span>
                  <span className="text-[12px] text-[#BDBBB6] truncate max-w-[280px]">
                    Rescheduling: "{rescheduleTask.name}"
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowRescheduleSheet(false);
                    setRescheduleTask(null);
                  }}
                  className="text-[#BDBBB6] hover:text-[#1A1A1A] p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {rescheduleLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-[#BDBBB6]">
                  <Loader2 className="animate-spin text-[#1A1A1A]" size={20} />
                  <span className="text-[11px] font-medium uppercase tracking-wider">Consulting Gemini scheduler...</span>
                </div>
              ) : (
                <>
                  {!rescheduleManualMode ? (
                    <div className="flex flex-col gap-4">
                      {recoveryData && (
                        <>
                          {/* Suggestion 1 */}
                          <div className="border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-3 hover:border-[#1A1A1A] transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium text-[#1A1A1A]">
                                Option 1: {formatDate(recoveryData.suggestion1.date)}
                              </span>
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono py-0.5 px-2 rounded-full">
                                {recoveryData.suggestion1.time}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#888780] leading-relaxed">
                              {recoveryData.suggestion1.reason}
                            </p>
                            <button
                              id="rescheduleOption1Btn"
                              onClick={() =>
                                handleConfirmReschedule(
                                  recoveryData.suggestion1.date,
                                  recoveryData.suggestion1.time,
                                  "Rescheduled Session 1"
                                )
                              }
                              className="w-full bg-[#1A1A1A] text-white text-[11px] font-medium py-2 rounded-[20px] transition-all"
                            >
                              Reschedule
                            </button>
                          </div>

                          {/* Suggestion 2 */}
                          <div className="border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-3 hover:border-[#1A1A1A] transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium text-[#1A1A1A]">
                                Option 2: {formatDate(recoveryData.suggestion2.date)}
                              </span>
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono py-0.5 px-2 rounded-full">
                                {recoveryData.suggestion2.time}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#888780] leading-relaxed">
                              {recoveryData.suggestion2.reason}
                            </p>
                            <button
                              id="rescheduleOption2Btn"
                              onClick={() =>
                                handleConfirmReschedule(
                                  recoveryData.suggestion2.date,
                                  recoveryData.suggestion2.time,
                                  "Rescheduled Session 2"
                                )
                              }
                              className="w-full bg-[#1A1A1A] text-white text-[11px] font-medium py-2 rounded-[20px] transition-all"
                            >
                              Reschedule
                            </button>
                          </div>

                          {/* Motivation */}
                          <p className="text-[11px] text-[#BDBBB6] italic text-center mt-1">
                            "{recoveryData.motivationalNote}"
                          </p>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleManualMode(true);
                          setManualDate(getTodayStr());
                        }}
                        className="text-center text-[11px] text-[#BDBBB6] hover:text-[#1A1A1A] font-medium underline mt-1"
                      >
                        Pick a custom time
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#BDBBB6] uppercase tracking-wider font-medium">Date</label>
                          <input
                            type="date"
                            value={manualDate}
                            min={getTodayStr()}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full bg-[#F7F6F3] border border-[#E0DED9] rounded-[8px] p-2 text.xs text-[13px] focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#BDBBB6] uppercase tracking-wider font-medium">Time</label>
                          <input
                            type="time"
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            className="w-full bg-[#F7F6F3] border border-[#E0DED9] rounded-[8px] p-2 text-[13px] focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmReschedule(manualDate, manualTime, "Manual Reschedule")}
                        className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-[20px] text-[12px] font-medium transition-all"
                      >
                        Confirm Reschedule
                      </button>

                      <button
                        type="button"
                        onClick={() => setRescheduleManualMode(false)}
                        className="text-center text-[11px] text-[#BDBBB6] hover:text-[#1A1A1A] font-medium underline"
                      >
                        Show AI Suggestions
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
