"use client";

import React from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

// Luxury, high-end cubic-bezier transition easing
export const MOTION_EASING = [0.16, 1, 0.3, 1] as const;

export const MOTION_TRANSITION = {
  duration: 0.75,
  ease: MOTION_EASING,
};

export const createStaggerContainer = (
  staggerDelay = 0.1,
  delayChildren = 0
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

export const MOTION_VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: MOTION_TRANSITION,
    },
  } as Variants,
  fadeDown: {
    hidden: { opacity: 0, y: -36, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: MOTION_TRANSITION,
    },
  } as Variants,
  slideLeft: {
    hidden: { opacity: 0, x: -40, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: MOTION_TRANSITION,
    },
  } as Variants,
  slideRight: {
    hidden: { opacity: 0, x: 40, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: MOTION_TRANSITION,
    },
  } as Variants,
  scaleUp: {
    hidden: { opacity: 0, scale: 0.94, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.75,
        ease: MOTION_EASING,
      },
    },
  } as Variants,
  staggerContainer: createStaggerContainer,
};

export type MotionVariantKey =
  | "fadeUp"
  | "fadeDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp";

interface MotionFadeInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  amount?: number;
  className?: string;
}

export function MotionFadeIn({
  children,
  delay = 0,
  direction = "up",
  amount = 0.15,
  className,
  ...props
}: MotionFadeInProps) {
  const getInitial = () => {
    switch (direction) {
      case "up":
        return { opacity: 0, y: 40, filter: "blur(12px)" };
      case "down":
        return { opacity: 0, y: -36, filter: "blur(12px)" };
      case "left":
        return { opacity: 0, x: -40, filter: "blur(12px)" };
      case "right":
        return { opacity: 0, x: 40, filter: "blur(12px)" };
      case "none":
        return { opacity: 0, filter: "blur(12px)" };
    }
  };

  const getTarget = () => {
    switch (direction) {
      case "up":
      case "down":
        return { opacity: 1, y: 0, filter: "blur(0px)" };
      case "left":
      case "right":
        return { opacity: 1, x: 0, filter: "blur(0px)" };
      case "none":
        return { opacity: 1, filter: "blur(0px)" };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={getTarget()}
      viewport={{ once: false, amount }}
      transition={{
        duration: 0.75,
        delay,
        ease: MOTION_EASING,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionStaggerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
  amount?: number;
  className?: string;
}

export function MotionStagger({
  children,
  staggerDelay = 0.1,
  delayChildren = 0.05,
  amount = 0.15,
  className,
  ...props
}: MotionStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount }}
      variants={createStaggerContainer(staggerDelay, delayChildren)}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: MotionVariantKey;
  className?: string;
}

export function MotionItem({
  children,
  variant = "fadeUp",
  className,
  ...props
}: MotionItemProps) {
  return (
    <motion.div
      variants={MOTION_VARIANTS[variant]}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function MotionCard({
  children,
  className,
  hoverEffect = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      variants={MOTION_VARIANTS.fadeUp}
      whileHover={
        hoverEffect
          ? {
              y: -4,
              transition: { duration: 0.25, ease: "easeOut" },
            }
          : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
