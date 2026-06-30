import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Sparkles, Check, ChevronRight, X, AlertTriangle, Calendar } from "lucide-react";
import { Task, ScheduleItem } from "../types";
import { getTaskColor, formatDate, splitIntoSessions } from "../lib/utils";
import { generateSchedule } from "../lib/api";

export default function TasksScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});
  
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load state on mount
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
  }, []);

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem("clutch_tasks", JSON.stringify(newTasks));
  };

  const updateSchedule = (newSchedule: ScheduleItem[]) => {
    setSchedule(newSchedule);
    localStorage.setItem("clutch_schedule", JSON.stringify(newSchedule));
  };

  // Trigger reschedule
  const triggerReschedule = async (currentTasks: Task[]) => {
    if (!profile) return;
    try {
      const result = await generateSchedule(
        profile.blockedBlocks,
        profile.peakTime,
        currentTasks,
        profile.timezone
      );
      updateSchedule(result);
    } catch (err) {
      console.error("Rescheduling failed:", err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid expanding
    const updated = tasks.filter((t) => t.id !== taskId);
    updateTasks(updated);

    // Clean schedule
    const cleanedSched = schedule.filter((s) => s.taskId !== taskId);
    updateSchedule(cleanedSched);

    setToast("Task deleted");
    setTimeout(() => setToast(null), 1000);

    await triggerReschedule(updated);
  };

  // Toggle Done status
  const handleToggleDone = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === "done" ? "pending" : "done";
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    updateTasks(updated);

    // Rebuild schedule if toggled back to pending or deleted if done
    const currentTask = tasks.find((t) => t.id === taskId);
    if (currentTask) {
      if (currentTask.status === "pending") {
        // Was pending, now done: clear schedule
        const cleanedSched = schedule.filter((s) => s.taskId !== taskId);
        updateSchedule(cleanedSched);
      } else {
        // Was done, now pending: trigger scheduling
        await triggerReschedule(updated);
      }
    }

    setToast("Status updated");
    setTimeout(() => setToast(null), 1000);
  };

  // Subtask checkbox toggling
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

  // Filters setup
  const filters = ["All", "College", "Chore", "Health", "Personal", "Work", "Done"];

  // Sort logic for lists:
  // Pending: Priority (critical > high > medium > low), then Deadline (soonest first)
  const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  
  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      const pA = priorityWeight[a.priority] || 2;
      const pB = priorityWeight[b.priority] || 2;
      if (pA !== pB) return pB - pA;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  };

  // Filter tasks
  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  let displayedPending = sortTasks(pendingTasks);
  let displayedDone = doneTasks;

  if (activeFilter !== "All" && activeFilter !== "Done") {
    displayedPending = displayedPending.filter((t) => t.category.toLowerCase() === activeFilter.toLowerCase());
    displayedDone = displayedDone.filter((t) => t.category.toLowerCase() === activeFilter.toLowerCase());
  } else if (activeFilter === "Done") {
    displayedPending = []; // Show only done
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] flex flex-col items-center justify-start pb-24 font-sans selection:bg-[#EDEBE8]">
      
      {/* TOAST NOTIFICATION */}
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

      <div className="w-full max-w-[390px] px-4 flex flex-col gap-6 pt-4">
        
        {/* HEADER */}
        <div className="flex flex-col gap-1 border-b border-[#EDEBE8] pb-2">
          <h1 className="text-[21px] font-medium tracking-tight text-[#1A1A1A]">All Tasks</h1>
          <span className="text-[11px] text-[#BDBBB6] font-medium tracking-wide uppercase">
            {pendingTasks.length} pending · {doneTasks.length} done
          </span>
        </div>

        {/* HORIZONTAL FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 select-none -mx-4 px-4">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setExpandedTaskId(null);
                }}
                className={`shrink-0 text-[12px] font-medium py-1.5 px-4 rounded-[20px] border transition-all ${
                  isActive
                    ? "bg-[#1A1A1A] text-white border-transparent"
                    : "bg-white text-[#1A1A1A] border-[#E0DED9] hover:bg-[#F7F6F3]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* TASKS LIST MODULE */}
        <div className="bg-white border border-[#E0DED9] rounded-[14px] overflow-hidden">
          {displayedPending.length === 0 && displayedDone.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#BDBBB6] italic">
              No tasks yet. Add one from the dashboard!
            </div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                
                {/* PENDING TASKS FIRST */}
                {activeFilter !== "Done" &&
                  displayedPending.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    const dotColor = getTaskColor(task.category, task.priority);

                    return (
                      <motion.div
                        key={task.id}
                        exit={{ opacity: 0 }}
                        className="border-b border-[#EDEBE8] last:border-0"
                      >
                        {/* Row Summary */}
                        <div
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#FCFBFA] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkmark Circle (Interactive Done Toggle) */}
                            <button
                              onClick={(e) => handleToggleDone(task.id, e)}
                              className="w-5 h-5 rounded-full border border-[#E0DED9] hover:border-[#1A1A1A] flex items-center justify-center shrink-0 bg-white"
                            >
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                            </button>

                            <div className="min-w-0">
                              <span className="text-[13px] font-medium text-[#1A1A1A] block truncate">
                                {task.name}
                              </span>
                              <span className="text-[11px] text-[#BDBBB6] uppercase tracking-wide">
                                {task.category} · {task.priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {task.deadline && (
                              <span className="text-[11px] text-[#888780] font-medium">
                                {formatDate(task.deadline)}
                              </span>
                            )}
                            <button
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              className="text-[#BDBBB6] hover:text-[#E24B4A] transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Compact AI Insights Panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-[#FCFBFA] border-t border-[#EDEBE8]/50 flex flex-col gap-3 pt-3">
                            <div className="flex items-center gap-1.5 text-[#BA7517]">
                              <Sparkles size={12} />
                              <span className="text-[10px] font-semibold tracking-wide uppercase">AI Insight</span>
                            </div>

                            <p className="text-[12px] text-[#888780] leading-relaxed">
                              {task.schedulingTip}
                            </p>

                            {task.estimatedMinutes > 90 && (
                              <div className="bg-[#F7F6F3] border border-[#E0DED9] rounded-[8px] p-2 text-[11px] text-[#888780]">
                                Split: {splitIntoSessions(task).sessions} sessions ({splitIntoSessions(task).minutesEach} min each).
                              </div>
                            )}

                            {/* Subtasks checklist */}
                            {task.suggestedSubtasks && task.suggestedSubtasks.length > 0 && (
                              <div className="flex flex-col gap-2 mt-1">
                                <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">Subtasks</span>
                                <div className="flex flex-col gap-2">
                                  {task.suggestedSubtasks.map((sub, idx) => {
                                    const isSubDone = (completedSubtasks[task.id] || []).includes(sub);
                                    return (
                                      <label key={idx} className="flex items-start gap-2 text-[12px] cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isSubDone}
                                          onChange={() => toggleSubtask(task.id, sub)}
                                          className="mt-0.5 accent-[#1A1A1A] border-[#E0DED9] rounded"
                                        />
                                        <span className={isSubDone ? "line-through text-[#BDBBB6]" : "text-[#1A1A1A]"}>
                                          {sub}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                {/* COMPLETED TASKS AT THE BOTTOM */}
                {displayedDone.map((task) => {
                  return (
                    <motion.div
                      key={task.id}
                      exit={{ opacity: 0 }}
                      className="border-b border-[#EDEBE8] last:border-0 bg-[#FCFBFA]"
                    >
                      <div className="p-4 flex items-center justify-between opacity-55">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Active Done Circle Checkmark */}
                          <button
                            onClick={(e) => handleToggleDone(task.id, e)}
                            className="w-5 h-5 rounded-full border border-[#639922] bg-[#639922] flex items-center justify-center shrink-0"
                          >
                            <Check size={11} className="text-white" />
                          </button>

                          <div className="min-w-0">
                            <span className="text-[13px] font-medium text-[#888780] line-through block truncate">
                              {task.name}
                            </span>
                            <span className="text-[11px] text-[#BDBBB6] uppercase tracking-wide">
                              {task.category} · completed
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="text-[#BDBBB6] hover:text-[#E24B4A] transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
