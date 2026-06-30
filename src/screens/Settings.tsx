import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Trash2,
  Sun,
  Moon,
  Save,
  ShieldAlert,
  Loader2,
  Check,
} from "lucide-react";
import { BlockedBlock, UserProfile } from "../types";

export default function SettingsScreen() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states for general settings
  const [peakTime, setPeakTime] = useState<"morning" | "night">("morning");
  const [dailyFreeHours, setDailyFreeHours] = useState(2);

  // Form states for Routine Builder
  const [blockedBlocks, setBlockedBlocks] = useState<BlockedBlock[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockLabel, setBlockLabel] = useState("");
  const [blockDays, setBlockDays] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("17:00");

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Feedback states
  const [toast, setToast] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    const loadedProfile = localStorage.getItem("clutch_profile");
    if (loadedProfile) {
      const parsed: UserProfile = JSON.parse(loadedProfile);
      setProfile(parsed);
      setPeakTime(parsed.peakTime);
      setDailyFreeHours(parsed.dailyFreeHours);
      setBlockedBlocks(parsed.blockedBlocks || []);
    }
  }, []);

  const handleToggleDay = (day: string) => {
    if (blockDays.includes(day)) {
      setBlockDays(blockDays.filter((d) => d !== day));
    } else {
      setBlockDays([...blockDays, day]);
    }
  };

  const handleAddBlock = () => {
    if (!blockLabel.trim() || blockDays.length === 0) return;

    const newBlock: BlockedBlock = {
      label: blockLabel.trim(),
      days: blockDays,
      startTime: blockStart,
      endTime: blockEnd,
    };

    const updatedBlocks = [...blockedBlocks, newBlock];
    setBlockedBlocks(updatedBlocks);
    
    // Save routine block instantly
    if (profile) {
      const updatedProfile = { ...profile, blockedBlocks: updatedBlocks };
      setProfile(updatedProfile);
      localStorage.setItem("clutch_profile", JSON.stringify(updatedProfile));
    }

    setBlockLabel("");
    setBlockDays([]);
    setBlockStart("09:00");
    setBlockEnd("17:00");
    setShowBlockForm(false);

    triggerToast("Routine block added!");
  };

  const handleRemoveBlock = (index: number) => {
    const updatedBlocks = blockedBlocks.filter((_, i) => i !== index);
    setBlockedBlocks(updatedBlocks);

    if (profile) {
      const updatedProfile = { ...profile, blockedBlocks: updatedBlocks };
      setProfile(updatedProfile);
      localStorage.setItem("clutch_profile", JSON.stringify(updatedProfile));
    }

    triggerToast("Routine block removed");
  };

  const handleSavePreferences = () => {
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      peakTime,
      dailyFreeHours,
      blockedBlocks,
    };

    setProfile(updatedProfile);
    localStorage.setItem("clutch_profile", JSON.stringify(updatedProfile));
    triggerToast("Preferences saved!");
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  };

  const handleResetApp = () => {
    localStorage.clear();
    setShowResetDialog(false);
    navigate("/onboard");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] flex flex-col items-center justify-start pb-24 font-sans selection:bg-[#EDEBE8]">
      
      {/* TOAST MESSAGE */}
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
          <h1 className="text-[21px] font-medium tracking-tight text-[#1A1A1A]">Settings</h1>
          <span className="text-[10px] text-[#BDBBB6] font-medium tracking-wide uppercase">
            Customize Routine & Preferences
          </span>
        </div>

        {/* SECTION: YOUR ROUTINE */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-semibold">
            YOUR ROUTINE
          </span>

          <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-4">
            <span className="text-[12px] text-[#888780] leading-snug">
              Clutch will block these times and will never schedule tasks during these slots.
            </span>

            {/* Block Pills */}
            <div className="flex flex-wrap gap-2">
              {blockedBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-[#F7F6F3] border border-[#E0DED9] text-[12px] py-1 px-3 rounded-[20px] text-[#1A1A1A]"
                >
                  <span className="font-semibold">{block.label}</span>
                  <span className="text-[#BDBBB6]">·</span>
                  <span className="text-[#888780]">{block.days.join(", ")}</span>
                  <span className="text-[#BDBBB6]">·</span>
                  <span className="text-[#888780]">{block.startTime}–{block.endTime}</span>
                  <button
                    onClick={() => handleRemoveBlock(idx)}
                    className="text-[#BDBBB6] hover:text-[#E24B4A] transition-colors ml-1 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {blockedBlocks.length === 0 && (
                <span className="text-[13px] text-[#BDBBB6] italic">No blocked hours configured.</span>
              )}
            </div>

            {/* Block builder */}
            {showBlockForm ? (
              <div className="bg-[#F7F6F3] border border-[#E0DED9] rounded-[10px] p-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[#BDBBB6] tracking-wider uppercase font-semibold">Block Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Gym, Commute"
                    value={blockLabel}
                    onChange={(e) => setBlockLabel(e.target.value)}
                    className="w-full bg-white border border-[#E0DED9] rounded-[6px] px-2.5 py-1.5 text-[13px] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[#BDBBB6] tracking-wider uppercase font-semibold font-sans">Days</label>
                  <div className="flex justify-between gap-1">
                    {weekdays.map((day) => {
                      const isSelected = blockDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#1A1A1A] text-white"
                              : "bg-white text-[#888780] border border-[#E0DED9]"
                          }`}
                        >
                          {day[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[#BDBBB6] tracking-wider uppercase font-semibold">Start</label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full bg-white border border-[#E0DED9] rounded-[6px] p-1.5 text-[12px] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[#BDBBB6] tracking-wider uppercase font-semibold">End</label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full bg-white border border-[#E0DED9] rounded-[6px] p-1.5 text-[12px] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setShowBlockForm(false)}
                    className="text-[11px] font-semibold text-[#888780] hover:text-[#1A1A1A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBlock}
                    disabled={!blockLabel.trim() || blockDays.length === 0}
                    className="bg-[#1A1A1A] text-white text-[11px] font-semibold px-3 py-1 rounded-[15px] disabled:bg-[#EDEBE8] disabled:text-[#BDBBB6]"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowBlockForm(true)}
                className="border border-dashed border-[#E0DED9] hover:border-[#1A1A1A] text-[#1A1A1A] py-2.5 rounded-[20px] text-[12px] font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add Unavailable Block
              </button>
            )}
          </div>
        </div>

        {/* SECTION: PREFERENCES */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-semibold">
            PREFERENCES
          </span>

          <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-4">
            
            {/* Peak Window */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#BDBBB6] uppercase tracking-wider font-semibold">
                When do you focus best?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPeakTime("morning")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-[12px] border transition-all ${
                    peakTime === "morning"
                      ? "bg-[#1A1A1A] text-white border-transparent"
                      : "bg-white text-[#1A1A1A] border-[#E0DED9]"
                  }`}
                >
                  <Sun size={18} className={peakTime === "morning" ? "text-amber-400" : "text-[#BDBBB6]"} />
                  <span className="text-[12px] font-medium">Morning</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeakTime("night")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-[12px] border transition-all ${
                    peakTime === "night"
                      ? "bg-[#1A1A1A] text-white border-transparent"
                      : "bg-white text-[#1A1A1A] border-[#E0DED9]"
                  }`}
                >
                  <Moon size={18} className={peakTime === "night" ? "text-indigo-300" : "text-[#BDBBB6]"} />
                  <span className="text-[12px] font-medium">Night owl</span>
                </button>
              </div>
            </div>

            {/* Daily Hours Slider */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] text-[#BDBBB6] uppercase tracking-wider font-semibold">
                Daily Free Availability
              </label>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={dailyFreeHours}
                onChange={(e) => setDailyFreeHours(parseFloat(e.target.value))}
                className="w-full accent-[#1A1A1A]"
              />
              <span className="text-[12px] font-medium text-[#1A1A1A] text-center">
                ~{dailyFreeHours} hours free daily
              </span>
            </div>

            <button
              onClick={handleSavePreferences}
              className="w-full bg-[#1A1A1A] hover:bg-[#2E2E2E] text-white text-[12px] font-semibold py-2.5 rounded-[20px] transition-all flex items-center justify-center gap-1.5"
            >
              <Save size={13} /> Save Preferences
            </button>
          </div>
        </div>

        {/* SECTION: ACCOUNT */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-semibold">
            ACCOUNT
          </span>
          <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-1.5">
            <div className="text-[13px] font-medium">
              Name: <span className="text-[#888780]">{profile?.name || "Clutch User"}</span>
            </div>
            <div className="text-[12px] text-[#BDBBB6]">
              Timezone: <span className="font-mono">{profile?.timezone || "UTC"}</span>
            </div>
          </div>
        </div>

        {/* SECTION: DANGER ZONE */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-semibold">
            DANGER ZONE
          </span>
          <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-3">
            <button
              onClick={() => setShowResetDialog(true)}
              className="w-full bg-white border border-[#E24B4A] text-[#E24B4A] hover:bg-[#FFF0F0] text-[12px] font-semibold py-2.5 rounded-[20px] transition-all"
            >
              Reset app
            </button>
          </div>
        </div>

        {/* Version label */}
        <div className="text-center text-[11px] text-[#BDBBB6] font-semibold tracking-widest uppercase mt-6">
          Clutch v1.0
        </div>

      </div>

      {/* RESET APP CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showResetDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetDialog(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[320px] w-full bg-white border border-[#E0DED9] rounded-[16px] z-50 p-5 flex flex-col gap-4 text-center shadow-xl"
            >
              <div className="mx-auto text-[#E24B4A] bg-[#FFF0F0] p-3 rounded-full">
                <ShieldAlert size={24} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[15px] font-semibold text-[#1A1A1A]">Reset all application data?</span>
                <span className="text-[12px] text-[#888780] leading-relaxed">
                  This action is irreversible. All of your custom tasks, schedule settings, and user profile data will be permanently deleted.
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="flex-1 border border-[#E0DED9] text-[#1A1A1A] text-[12px] font-semibold py-2.5 rounded-[20px] hover:bg-[#F7F6F3]"
                >
                  Cancel
                </button>
                <button
                  id="confirmResetBtn"
                  onClick={handleResetApp}
                  className="flex-1 bg-[#E24B4A] text-white text-[12px] font-semibold py-2.5 rounded-[20px] hover:bg-[#C23B3A]"
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
