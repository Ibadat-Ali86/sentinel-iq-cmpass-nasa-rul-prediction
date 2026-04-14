"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroGeometricProps {
  badge?: string;
  title1?: string;
  title2?: string;
  className?: string;
}

export function HeroGeometric({ badge, title1, title2, className }: HeroGeometricProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Dynamic Geometric Gradient Shapes */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.4, scale: 1, rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full opacity-40 blur-[100px] bg-[var(--accent-glow)] filter mix-blend-screen"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1, rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[70%] rounded-full opacity-30 blur-[120px] bg-[var(--accent-glow2)] filter mix-blend-screen"
      />
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 0.5 }}
        transition={{ duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        className="absolute top-[20%] left-[60%] w-[20%] h-[30%] rotate-45 opacity-20 blur-[80px] bg-[var(--color-primary)]"
      />
      
      {/* Overlay Noise / Grid to blend */}
      <div 
        className="absolute inset-0 z-0 opacity-20 dark:opacity-10 mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--text-tertiary) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      
      {/* Text overlay removed so it purely operates as an ambient animated background */}
    </div>
  );
}
