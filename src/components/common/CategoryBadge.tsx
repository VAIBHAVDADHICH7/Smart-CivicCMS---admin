import React from "react";
import { ComplaintCategory } from "@/types/database";
import { 
  AlertTriangle, 
  Trash2, 
  Lightbulb, 
  Droplets, 
  HelpCircle 
} from "lucide-react";

interface CategoryBadgeProps {
  category: ComplaintCategory;
  showIcon?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  showIcon = true,
  className = "",
}) => {
  const configMap: Record<
    ComplaintCategory,
    { label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    POTHOLE: { label: "Pothole", icon: AlertTriangle },
    GARBAGE: { label: "Garbage", icon: Trash2 },
    STREETLIGHT: { label: "Streetlight", icon: Lightbulb },
    WATER_LEAK: { label: "Water Leak", icon: Droplets },
    OTHER: { label: "Hazard", icon: HelpCircle },
  };

  const config = configMap[category] || configMap.OTHER;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60 ${className}`}
    >
      {showIcon && <IconComponent className="w-3 h-3 text-slate-400 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
