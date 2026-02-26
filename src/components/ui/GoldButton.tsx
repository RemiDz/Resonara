"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function GoldButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: GoldButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-40 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-gold-dark via-gold to-gold-light text-deep-primary hover:shadow-[0_0_30px_rgba(212,168,67,0.3)] active:scale-95",
    secondary:
      "border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/50 active:scale-95",
    ghost:
      "text-gold hover:bg-gold/5 active:scale-95",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
