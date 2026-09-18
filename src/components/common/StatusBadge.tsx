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
    { label: string; bg: string; text: string; dot: string }
  > = {
    PENDING: {
      label: "Reported",
      bg: "bg-rose-500/10 border-rose-500/20",
      text: "text-rose-400",
      dot: "bg-rose-500",
    },
    ASSIGNED: {
      label: "Assigned",
      bg: "bg-sky-500/10 border-sky-500/20",
      text: "text-sky-400",
      dot: "bg-sky-500",
    },
    WORK_SUBMITTED: {
      label: "Work Completed",
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-400",
      dot: "bg-amber-500",
    },
    RESOLVED: {
      label: "Fixed & Verified",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
      dot: "bg-emerald-500",
    },
    ESCALATED: {
      label: "Overdue",
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      dot: "bg-red-500",
    },
    REOPENED: {
      label: "Reopened",
      bg: "bg-purple-500/10 border-purple-500/20",
      text: "text-purple-400",
      dot: "bg-purple-500",
    },
    REJECTED: {
      label: "Rejected",
      bg: "bg-slate-700/20 border-slate-700/40",
      text: "text-slate-400",
      dot: "bg-slate-500",
    },
  };

  const config = configMap[status] || configMap.PENDING;
  const sizeStyles = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${sizeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
