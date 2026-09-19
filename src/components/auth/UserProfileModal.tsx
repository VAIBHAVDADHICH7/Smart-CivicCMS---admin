"use client";

import React, { useState } from "react";
import { useCivicStore } from "@/lib/store";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  HardHat, 
  Landmark, 
  CheckCircle2, 
  X, 
  LogOut, 
  BadgeCheck, 
  Clock, 
  ToggleLeft, 
  ToggleRight,
  Sparkles
} from "lucide-react";
import { UserRole } from "@/types/database";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentProfile, updateCurrentProfile, logout, wards } = useCivicStore();

  const [fullName, setFullName] = useState(currentProfile.full_name);
  const [phone, setPhone] = useState(currentProfile.phone || "");
  const [department, setDepartment] = useState(currentProfile.department || "");
  const [isActive, setIsActive] = useState(currentProfile.is_active ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen && currentProfile) {
      setFullName(currentProfile.full_name);
      setPhone(currentProfile.phone || "");
      setDepartment(currentProfile.department || "");
      setIsActive(currentProfile.is_active ?? true);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const currentWard = wards.find((w) => w.id === currentProfile.ward_id);

  const roleMeta: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    FIELD_CREW: { label: "Field Operations Worker", icon: HardHat, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    WARD_SUPERVISOR: { label: "Ward Authority Supervisor", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    MUNICIPAL_COMMISSIONER: { label: "Municipal Commissioner", icon: Landmark, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  };

  const meta = roleMeta[currentProfile.role] || roleMeta.WARD_SUPERVISOR;
  const RoleIcon = meta.icon;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentProfile({
      full_name: fullName,
      phone,
      department,
      is_active: isActive,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-6 border-b border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/20">
                {currentProfile.full_name.charAt(0)}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{currentProfile.full_name}</span>
                <BadgeCheck className="w-4 h-4 text-indigo-400" />
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  <span>{meta.label}</span>
                </span>
                {currentProfile.employee_id && (
                  <span className="text-[10px] font-mono font-medium text-slate-400">
                    {currentProfile.employee_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content / Edit Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>
            </div>

            {/* Email (Read only) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Official Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={currentProfile.email || "staff@civicpulse.gov"}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Civil Infrastructure"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* Assigned Ward Banner */}
          {currentWard && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>Assigned Jurisdiction:</span>
                <span className="font-bold text-white">{currentWard.name}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                {currentWard.zone}
              </span>
            </div>
          )}

          {/* On-Duty Availability Toggle */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Active Duty / Assignment Availability</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isActive ? "Ready to receive and triage field tickets" : "Off duty — new dispatches paused"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`p-1 rounded-xl text-2xl transition-all ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
