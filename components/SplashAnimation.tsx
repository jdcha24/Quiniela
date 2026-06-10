"use client";

import { useEffect, useState } from "react";

export default function SplashAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [startPulse, setStartPulse] = useState(false);

  useEffect(() => {
    // Check if the splash screen was already shown in the current session
    const splashShown = sessionStorage.getItem("splash-shown");
    
    if (!splashShown) {
      setIsVisible(true);

      // 1. Start the breathing pulse animation after the entry animation finishes (1 second)
      const pulseTimer = setTimeout(() => {
        setStartPulse(true);
      }, 1000);

      // 2. Start fading out the entire overlay at 2.3 seconds
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 2300);

      // 3. Dismount the component and flag as shown at 3.0 seconds (2300ms + 700ms transition)
      const destroyTimer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem("splash-shown", "true");
      }, 3000);

      return () => {
        clearTimeout(pulseTimer);
        clearTimeout(fadeTimer);
        clearTimeout(destroyTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#080810] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background glow orb that pulses */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[100px] animate-splash-bg-pulse" />

      {/* Main Logo Container */}
      <div className="relative flex flex-col items-center gap-6">
        <div
          className={`w-36 h-36 relative select-none animate-splash-logo-enter ${
            startPulse ? "animate-splash-logo-pulse" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Quiniela Logo"
            className="w-full h-full object-contain filter invert drop-shadow-[0_0_12px_rgba(124,58,237,0.2)]"
            draggable={false}
          />
        </div>

        {/* Text styling or sub-brand (optional but premium) */}
        <div className="text-center mt-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h1 className="text-2xl font-black tracking-widest text-white uppercase">
            Quiniela<span className="text-violet-500">⚽</span>
          </h1>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
            Predice · Compite · Gana
          </p>
        </div>
      </div>

      {/* Loading micro-bar indicator at the bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full animate-pulse w-full" />
      </div>
    </div>
  );
}
