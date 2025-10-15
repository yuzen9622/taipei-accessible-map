"use client";
import { motion } from "motion/react";
import Image from "next/image";

type SplashProps = {
  show?: boolean;
};

export default function Splash({ show = true }: SplashProps) {
  if (!show) return null;
  const MotionImage = motion.create(Image);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center  bg-background">
      <div className="flex  items-center gap-6">
        {/* Logo + 脈動光暈 */}

        <MotionImage
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          transition={{ ease: [], delay: 0.5, duration: 0.5 }}
          src="/logo.webp"
          alt={"無障礙台北"}
          width={100}
          className=" absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 z-50 "
          height={100}
          draggable={false}
        />

        {/* 標題 */}
        <motion.h1
          initial={{ opacity: 1, x: 100 }}
          animate={{ opacity: 0, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [] }}
          className="text-4xl   font-bold z-0"
        >
          <span>無障礙台北</span>
        </motion.h1>
      </div>
    </div>
  );
}
