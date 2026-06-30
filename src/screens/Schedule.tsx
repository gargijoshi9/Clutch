import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { ScheduleItem, Task } from "../types";
import { getWeekRange, getTaskColor, getMonday } from "../lib/utils";
import { generateSchedule } from "../lib/api";

export default function ScheduleScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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

    // Default select today
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedDateStr(todayStr);
  }, []);

  // Update localStorage helper
  const updateSchedule = (newSchedule: ScheduleItem[]) => {
    setSchedule(newSchedule);
    localStorage.setItem("clutch_schedule", JSON.stringify(newSchedule));
  };

  // Generate 7 days of the week based on weekOffset
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
  const monday = getMonday(baseDate);
  const weekdaysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const weekdayLetters = ["M", "T", "W", "T", "F", "S", "S"];

  // Re-generate schedule trigger
  const handleRegenerate = async () => {
    if (!profile || tasks.length === 0) return;
    setIsRegenerating(true);
    setErrorText(null);
    try {
      const result = await generateSchedule(
        profile.blockedBlocks,
        profile.peakTime,
        tasks,
        profile.timezone
      );
      updateSchedule(result);
    } catch (err) {
      console.error(err);
      setErrorText("Schedule update failed. Tap regenerate to retry.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Get selected day's blocks
  const filteredBlocks = schedule
    .filter((item) => item.date === selectedDateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] flex flex-col items-center justify-start pb-24 font-sans selection:bg-[#EDEBE8]">
      <div className="w-full max-w-[390px] px-4 flex flex-col gap-6 pt-4">
        
        {/* HEADER WITH WEEK SWITCHER */}
        <div className="flex items-center justify-between border-b border-[#EDEBE8] pb-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[21px] font-medium tracking-tight text-[#1A1A1A]">Schedule</h1>
            <span className="text-[10px] text-[#BDBBB6] font-bold tracking-wider uppercase">
              Week of {getWeekRange(monday)}
            </span>
          </div>
          
          <div className="flex items-center bg-white border border-[#E0DED9] p-0.5 rounded-[12px] shadow-sm">
            <button
              onClick={() => {
                const newOffset = weekOffset - 1;
                setWeekOffset(newOffset);
                const d = new Date();
                d.setDate(d.getDate() + (newOffset * 7));
                const nextMon = getMonday(d);
                setSelectedDateStr(nextMon.toISOString().split("T")[0]);
              }}
              className="p-1.5 rounded-[10px] text-[#888780] hover:text-[#1A1A1A] transition-colors focus:outline-none"
              title="Previous Week"
            >
              <ChevronLeft size={15} />
            </button>
            
            <button
              onClick={() => {
                setWeekOffset(0);
                const todayStr = new Date().toISOString().split("T")[0];
                setSelectedDateStr(todayStr);
              }}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-[10px] transition-all focus:outline-none ${
                weekOffset === 0
                  ? "bg-[#F7F6F3] text-[#1A1A1A] font-semibold"
                  : "text-[#888780] hover:text-[#1A1A1A]"
              }`}
            >
              This Week
            </button>
            
            <button
              onClick={() => {
                const newOffset = weekOffset + 1;
                setWeekOffset(newOffset);
                const d = new Date();
                d.setDate(d.getDate() + (newOffset * 7));
                const nextMon = getMonday(d);
                setSelectedDateStr(nextMon.toISOString().split("T")[0]);
              }}
              className="p-1.5 rounded-[10px] text-[#888780] hover:text-[#1A1A1A] transition-colors focus:outline-none"
              title="Next Week"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ERROR WARNING BANNER */}
        {errorText && (
          <div className="bg-[#FFF0F0] text-[#E24B4A] border border-[#E24B4A] rounded-[14px] p-4 text-[12px] font-medium">
            {errorText}
          </div>
        )}

        {/* DAY STRIP CARD */}
        <div className="bg-white border border-[#E0DED9] rounded-[14px] p-2 flex items-center justify-between">
          {weekdaysList.map((day, idx) => {
            const dateStr = day.toISOString().split("T")[0];
            const isActive = selectedDateStr === dateStr;
            const dayNum = day.getDate();

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className="flex-1 flex flex-col items-center gap-1.5 py-2 relative focus:outline-none"
              >
                <span className="text-[10px] text-[#BDBBB6] font-medium uppercase">
                  {weekdayLetters[idx]}
                </span>
                <span className={`text-[13px] font-medium z-10 ${isActive ? "text-[#1A1A1A]" : "text-[#888780]"}`}>
                  {dayNum}
                </span>

                {/* Animated active underline */}
                {isActive && (
                  <motion.div
                    layoutId="activeDayUnderline"
                    className="absolute bottom-0 w-8 h-[2px] bg-[#1A1A1A] rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* TIMELINE BLOCKS */}
        <div className="flex flex-col gap-3">
          {filteredBlocks.length > 0 ? (
            filteredBlocks.map((item, idx) => {
              // Find backing task to see if it's completed
              const backingTask = tasks.find((t) => t.id === item.taskId);
              const isTaskDone = backingTask?.status === "done";

              return (
                <div key={idx} className="flex items-start gap-4">
                  {/* Left Column: Start Time */}
                  <div className="w-[56px] pt-1.5 text-right">
                    <span className="font-mono text-[11px] text-[#BDBBB6] tracking-wider uppercase">
                      {item.startTime}
                    </span>
                  </div>

                  {/* Right Column: Card info */}
                  <div
                    className={`flex-1 bg-white rounded-[14px] p-3.5 border border-[#E0DED9] flex flex-col gap-1.5 transition-opacity ${
                      isTaskDone ? "opacity-50" : ""
                    }`}
                    style={{ borderLeft: `3.5px solid ${getTaskColor(item.category)}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[13px] font-medium leading-tight ${isTaskDone ? "line-through text-[#888780]" : "text-[#1A1A1A]"}`}>
                        {item.taskName}
                      </span>
                      {isTaskDone && (
                        <span className="bg-emerald-50 text-[#639922] text-[9px] font-medium py-0.5 px-2 rounded-[20px] shrink-0 border border-emerald-200">
                          done
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#BDBBB6] leading-snug">
                      {item.sessionNote}
                    </p>

                    <div className="text-[10px] text-[#BDBBB6] font-medium tracking-wider uppercase mt-1">
                      {item.sessionDuration || 45} mins · {item.category}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-[#E0DED9] rounded-[14px] p-8 text-center text-[13px] text-[#BDBBB6] italic">
              Nothing scheduled. Enjoy the break.
            </div>
          )}
        </div>

        {/* REGENERATE BUTTON */}
        <div className="mt-4">
          <button
            id="regenerateScheduleBtn"
            onClick={handleRegenerate}
            disabled={tasks.length === 0 || isRegenerating}
            className="w-full bg-white border border-[#E0DED9] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white disabled:bg-[#EDEBE8] disabled:text-[#BDBBB6] disabled:border-[#EDEBE8] py-3 rounded-[20px] text-[13px] font-medium transition-all flex items-center justify-center gap-2"
          >
            {isRegenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Regenerating...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Regenerate Schedule</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
