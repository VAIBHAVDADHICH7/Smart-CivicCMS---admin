import React from "react";
import { ComplaintStatus } from "@/types/database";

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  className = "",
}) => {
  const configMap: Record<
    ComplaintStatus,
    { label: string; gradient: string; border: string; text: string; dot: string; glow: string }
  > = {
    PENDING: {
      label: "Reported",
      gradient: "bg-gradient-to-r from-rose-500/20 to-orange-500/20",
      border: "border-rose-500/40",
      text: "text-rose-300 font-semibold",
      dot: "bg-rose-400 animate-pulse",
      glow: "shadow-sm shadow-rose-500/20",
    },
    ASSIGNED: {
      label: "Assigned",
      gradient: "bg-gradient-to-r from-sky-500/20 to-indigo-500/20",
      border: "border-sky-400/40",
      text: "text-sky-300 font-semibold",
      dot: "bg-sky-400",
      glow: "shadow-sm shadow-sky-500/20",
    },
    WORK_SUBMITTED: {
      label: "Work Submitted",
      gradient: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
      border: "border-amber-400/40",
      text: "text-amber-300 font-semibold",
      dot: "bg-amber-400 animate-pulse",
      glow: "shadow-sm shadow-amber-500/20",
    },
    RESOLVED: {
      label: "Fixed & Verified",
      gradient: "bg-gradient-to-r from-emerald-500/20 to-teal-500/20",
      border: "border-emerald-400/40",
      text: "text-emerald-300 font-semibold",
      dot: "bg-emerald-400",
      glow: "shadow-sm shadow-emerald-500/20",
    },
    ESCALATED: {
      label: "Overdue / Escalated",
      gradient: "bg-gradient-to-r from-red-600/30 to-pink-600/30",
      border: "border-red-500/50",
      text: "text-red-300 font-bold",
      dot: "bg-red-400 animate-ping",
      glow: "shadow-md shadow-red-500/30",
    },
    REOPENED: {
      label: "Reopened / Dispute",
      gradient: "bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20",
      border: "border-purple-400/40",
      text: "text-purple-300 font-semibold",
      dot: "bg-purple-400",
      glow: "shadow-sm shadow-purple-500/20",
    },
    REJECTED: {
      label: "Rejected",
      gradient: "bg-slate-800/60",
      border: "border-slate-700",
      text: "text-slate-400",
      dot: "bg-slate-500",
      glow: "",
    },
  };

  const config = configMap[status] || configMap.PENDING;
  const sizeStyles = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md ${config.gradient} ${config.border} ${config.text} ${config.glow} ${sizeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
