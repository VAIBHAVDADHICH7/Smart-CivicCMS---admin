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
    { label: string; icon: React.ComponentType<{ className?: string }>; gradient: string; border: string; text: string; iconColor: string }
  > = {
    POTHOLE: { 
      label: "Pothole", 
      icon: AlertTriangle,
      gradient: "bg-gradient-to-r from-amber-500/15 to-orange-500/15",
      border: "border-amber-500/30",
      text: "text-amber-200",
      iconColor: "text-amber-400",
    },
    GARBAGE: { 
      label: "Garbage & Waste", 
      icon: Trash2,
      gradient: "bg-gradient-to-r from-emerald-500/15 to-teal-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-200",
      iconColor: "text-emerald-400",
    },
    STREETLIGHT: { 
      label: "Streetlight", 
      icon: Lightbulb,
      gradient: "bg-gradient-to-r from-yellow-500/15 to-amber-500/15",
      border: "border-yellow-500/30",
      text: "text-yellow-200",
      iconColor: "text-yellow-400",
    },
    WATER_LEAK: { 
      label: "Water Leak", 
      icon: Droplets,
      gradient: "bg-gradient-to-r from-cyan-500/15 to-blue-500/15",
      border: "border-cyan-500/30",
      text: "text-cyan-200",
      iconColor: "text-cyan-400",
    },
    OTHER: { 
      label: "Civic Hazard", 
      icon: HelpCircle,
      gradient: "bg-gradient-to-r from-purple-500/15 to-pink-500/15",
      border: "border-purple-500/30",
      text: "text-purple-200",
      iconColor: "text-purple-400",
    },
  };

  const config = configMap[category] || configMap.OTHER;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold backdrop-blur-md border ${config.gradient} ${config.border} ${config.text} ${className}`}
    >
      {showIcon && <IconComponent className={`w-3.5 h-3.5 ${config.iconColor} flex-shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
