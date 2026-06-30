import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Plus, X, ArrowRight, Calendar } from "lucide-react";
import { BlockedBlock, UserProfile } from "../types";

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [name, setName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  // Step 2 State - Pre-filled block
  const [blockedBlocks, setBlockedBlocks] = useState<BlockedBlock[]>([
    {
      label: "College",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "08:00",
      endTime: "18:00",
    },
  ]);

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockLabel, setBlockLabel] = useState("");
  const [blockDays, setBlockDays] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("17:00");

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handleToggleDay = (day: string) => {
    if (blockDays.includes(day)) {
      setBlockDays(blockDays.filter((d) => d !== day));
    } else {
      setBlockDays([...blockDays, day]);
    }
  };

  const handleAddBlock = () => {
    if (!blockLabel.trim()) return;
    if (blockDays.length === 0) return;

    const newBlock: BlockedBlock = {
      label: blockLabel.trim(),
      days: blockDays,
      startTime: blockStart,
      endTime: blockEnd,
    };

    setBlockedBlocks([...blockedBlocks, newBlock]);
    setBlockLabel("");
    setBlockDays([]);
    setBlockStart("09:00");
    setBlockEnd("17:00");
    setShowBlockForm(false);
  };

  const handleRemoveBlock = (index: number) => {
    setBlockedBlocks(blockedBlocks.filter((_, i) => i !== index));
  };

  // Step 3 State
  const [peakTime, setPeakTime] = useState<"morning" | "night">("morning");
  const [dailyFreeHours, setDailyFreeHours] = useState(2);

  const handleFinish = () => {
    const profile: UserProfile = {
      name: name.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      blockedBlocks,
      peakTime,
      dailyFreeHours,
      categories: ["college", "exam_prep", "chore", "health", "personal", "work"],
    };

    localStorage.setItem("clutch_profile", JSON.stringify(profile));
    navigate("/dashboard");
  };

  // Slide animations
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] flex flex-col items-center justify-start p-6 pt-12 font-sans selection:bg-[#EDEBE8]">
      <div className="w-full max-w-[390px] flex flex-col gap-8">
        
        {/* Progress indicator */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#BDBBB6] font-medium tracking-wider uppercase">
            <span>Clutch Onboarding</span>
            <span>{step} / 3</span>
          </div>
          <div className="h-[2px] bg-[#EDEBE8] w-full rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="min-h-[420px] flex flex-col justify-between">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-medium tracking-tight text-[#1A1A1A]">
                    Hey, what's your name?
                  </h1>
                  <p className="text-[14px] text-[#BDBBB6]">
                    We'll build your schedule around your life.
                  </p>
                </div>

                <div className="w-full">
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="nameInput"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-[#E0DED9] rounded-[14px] px-4 py-3.5 text-[15px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                  />
                </div>

                <button
                  id="step1ContinueBtn"
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                  className="w-full mt-4 bg-[#1A1A1A] disabled:bg-[#EDEBE8] disabled:text-[#BDBBB6] text-white py-3.5 rounded-[20px] text-[14px] font-medium transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-medium tracking-tight text-[#1A1A1A]">
                    When are you NOT available?
                  </h1>
                  <p className="text-[13px] text-[#888780]">
                    Add your fixed time blocks. Clutch will never schedule tasks during these hours.
                  </p>
                </div>

                {/* Block List */}
                <div className="flex flex-wrap gap-2">
                  {blockedBlocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white border border-[#E0DED9] text-[12px] py-1 px-3 rounded-[20px] text-[#1A1A1A]"
                    >
                      <span className="font-medium">{block.label}</span>
                      <span className="text-[#BDBBB6]">·</span>
                      <span className="text-[#888780]">
                        {block.days.length === 7 ? "Daily" : block.days.join(", ")}
                      </span>
                      <span className="text-[#BDBBB6]">·</span>
                      <span className="text-[#888780]">
                        {block.startTime}–{block.endTime}
                      </span>
                      <button
                        onClick={() => handleRemoveBlock(idx)}
                        className="text-[#BDBBB6] hover:text-[#E24B4A] transition-colors p-0.5 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {blockedBlocks.length === 0 && (
                    <p className="text-[13px] text-[#BDBBB6] italic py-2">No unavailable times added yet.</p>
                  )}
                </div>

                {/* Inline Block Creator */}
                {showBlockForm ? (
                  <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">Block Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sleep, Gym, Part-time job"
                        value={blockLabel}
                        onChange={(e) => setBlockLabel(e.target.value)}
                        className="w-full border-b border-[#EDEBE8] py-1 text-[14px] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">Active Days</label>
                      <div className="flex justify-between gap-1">
                        {weekdays.map((day) => {
                          const isSelected = blockDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleDay(day)}
                              className={`w-9 h-9 rounded-full text-[11px] font-medium flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#1A1A1A] text-white"
                                  : "bg-[#F7F6F3] text-[#888780] border border-transparent hover:border-[#E0DED9]"
                              }`}
                            >
                              {day[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">Start Time</label>
                        <input
                          type="time"
                          value={blockStart}
                          onChange={(e) => setBlockStart(e.target.value)}
                          className="w-full bg-[#F7F6F3] rounded-[8px] p-2 text-[13px] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">End Time</label>
                        <input
                          type="time"
                          value={blockEnd}
                          onChange={(e) => setBlockEnd(e.target.value)}
                          className="w-full bg-[#F7F6F3] rounded-[8px] p-2 text-[13px] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        onClick={() => setShowBlockForm(false)}
                        className="text-[12px] font-medium px-3 py-1.5 text-[#888780] hover:text-[#1A1A1A]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddBlock}
                        disabled={!blockLabel.trim() || blockDays.length === 0}
                        className="bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-1.5 rounded-[20px] disabled:bg-[#EDEBE8] disabled:text-[#BDBBB6]"
                      >
                        Add Block
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBlockForm(true)}
                    className="w-full border border-dashed border-[#E0DED9] hover:border-[#1A1A1A] bg-white text-[#1A1A1A] py-3.5 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add time block
                  </button>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[#E0DED9] text-[#1A1A1A] py-3.5 rounded-[20px] text-[14px] font-medium hover:bg-white transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-[#1A1A1A] text-white py-3.5 rounded-[20px] text-[14px] font-medium transition-all"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-medium tracking-tight text-[#1A1A1A]">
                    One more thing
                  </h1>
                  <p className="text-[13px] text-[#888780]">
                    Tell us your peak timing and typical daily availability.
                  </p>
                </div>

                {/* Focus Best selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">
                    When do you focus best?
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="focusMorningBtn"
                      onClick={() => setPeakTime("morning")}
                      className={`flex flex-col items-center gap-3 p-4 rounded-[14px] border transition-all text-center ${
                        peakTime === "morning"
                          ? "bg-[#1A1A1A] text-white border-transparent"
                          : "bg-white text-[#1A1A1A] border-[#E0DED9] hover:border-[#1A1A1A]"
                      }`}
                    >
                      <Sun size={20} className={peakTime === "morning" ? "text-amber-400" : "text-[#BDBBB6]"} />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">Morning</span>
                        <span className={`text-[11px] ${peakTime === "morning" ? "text-[#CCCCCC]" : "text-[#BDBBB6]"}`}>
                          Before noon
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="focusNightBtn"
                      onClick={() => setPeakTime("night")}
                      className={`flex flex-col items-center gap-3 p-4 rounded-[14px] border transition-all text-center ${
                        peakTime === "night"
                          ? "bg-[#1A1A1A] text-white border-transparent"
                          : "bg-white text-[#1A1A1A] border-[#E0DED9] hover:border-[#1A1A1A]"
                      }`}
                    >
                      <Moon size={20} className={peakTime === "night" ? "text-indigo-300" : "text-[#BDBBB6]"} />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">Night owl</span>
                        <span className={`text-[11px] ${peakTime === "night" ? "text-[#CCCCCC]" : "text-[#BDBBB6]"}`}>
                          After 8pm
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Free Time daily */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-[#BDBBB6] tracking-wider uppercase font-medium">
                    How much free time daily (outside blocks)?
                  </span>
                  <div className="bg-white border border-[#E0DED9] rounded-[14px] p-4 flex flex-col gap-2">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={dailyFreeHours}
                      onChange={(e) => setDailyFreeHours(parseFloat(e.target.value))}
                      className="w-full accent-[#1A1A1A]"
                    />
                    <span className="text-[13px] font-medium text-[#1A1A1A] text-center">
                      ~{dailyFreeHours} hours free daily
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 border border-[#E0DED9] text-[#1A1A1A] py-3.5 rounded-[20px] text-[14px] font-medium hover:bg-white transition-all"
                  >
                    Back
                  </button>
                  <button
                    id="finishOnboardingBtn"
                    onClick={handleFinish}
                    className="flex-1 bg-[#1A1A1A] text-white py-3.5 rounded-[20px] text-[14px] font-medium transition-all"
                  >
                    Let's go →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
