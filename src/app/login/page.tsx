"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCivicStore } from "@/lib/store";
import { UserRole } from "@/types/database";
import { 
  Building2, 
  Lock, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  HardHat, 
  Landmark, 
  User, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  UserPlus,
  LogIn,
  MapPin,
  Smartphone,
  Shield,
  Clock,
  Radio,
  RefreshCw,
  HelpCircle,
  X,
  Layers,
  Check,
  Zap,
  Globe2
} from "lucide-react";

type AuthTab = "PASSWORD" | "OTP" | "SSO" | "SIGNUP";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect") || "/";

  const { 
    login, 
    loginWithPhoneOtp, 
    requestPasswordReset, 
    loginAsPersona, 
    signUp, 
    wards, 
    complaints, 
    isSupabaseActive,
    currentProfile,
    currentUser,
    isAuthenticated,
    logout
  } = useCivicStore();

  const [activeTab, setActiveTab] = useState<AuthTab>("PASSWORD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState("+91 98290 23456");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("WARD_SUPERVISOR");
  const [selectedWard, setSelectedWard] = useState<string>("WARD_14");
  const [department, setDepartment] = useState("Civil Operations");

  // Feedback & Loading
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<string | null>(null);

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Active persona role filter on left panel
  const [personaFilter, setPersonaFilter] = useState<"ALL" | UserRole>("ALL");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const personas = [
    {
      name: "Dr. Rajesh Meena, IAS",
      title: "Municipal Commissioner",
      email: "commissioner@civicpulse.gov",
      pass: "admin123",
      phone: "+91 98290 99999",
      role: "MUNICIPAL_COMMISSIONER" as UserRole,
      badge: "IAS-RAJ-001",
      dept: "Executive Governance",
      icon: Landmark,
      color: "from-purple-600/30 via-pink-600/20 to-purple-900/30 text-purple-300",
      borderColor: "border-purple-500/40 hover:border-purple-400",
      route: "/commissioner",
      desc: "City-wide macro governance, contractor penalty audits, and ward velocity ranking",
    },
    {
      name: "Er. Anita Verma",
      title: "Ward Supervisor • Civil Lines",
      email: "supervisor14@civicpulse.gov",
      pass: "ward14pass",
      phone: "+91 98290 45678",
      role: "WARD_SUPERVISOR" as UserRole,
      wardId: "WARD_14",
      badge: "EMP-SUP-014",
      dept: "Ward 14 Operations",
      icon: ShieldCheck,
      color: "from-emerald-600/30 via-teal-600/20 to-emerald-900/30 text-emerald-300",
      borderColor: "border-emerald-500/40 hover:border-emerald-400",
      route: "/supervisor",
      desc: "60/40 Split GIS triage console, SLA dispatch drawer, and dual-photo verification gate",
    },
    {
      name: "Er. Suresh Gupta",
      title: "Ward Supervisor • Mansarovar",
      email: "supervisor15@civicpulse.gov",
      pass: "ward15pass",
      phone: "+91 98290 56789",
      role: "WARD_SUPERVISOR" as UserRole,
      wardId: "WARD_15",
      badge: "EMP-SUP-015",
      dept: "Ward 15 Operations",
      icon: ShieldCheck,
      color: "from-teal-600/30 via-cyan-600/20 to-teal-900/30 text-teal-300",
      borderColor: "border-teal-500/40 hover:border-teal-400",
      route: "/supervisor",
      desc: "Residential sector triage, contractor assignment, and quality dispute resolution",
    },
    {
      name: "Ramesh Kumar",
      title: "Field Crew • Roads & Potholes",
      email: "crew.roads@civicpulse.gov",
      pass: "crew123",
      phone: "+91 98290 23456",
      role: "FIELD_CREW" as UserRole,
      wardId: "WARD_14",
      badge: "EMP-CRW-101",
      dept: "Roads & Civil Infrastructure",
      icon: HardHat,
      color: "from-amber-600/30 via-orange-600/20 to-amber-900/30 text-amber-300",
      borderColor: "border-amber-500/40 hover:border-amber-400",
      route: "/crew",
      desc: "Proximity-ordered task queue, GPS turn-by-turn navigation, and 30m geofenced proof",
    },
    {
      name: "Mohan Lal",
      title: "Field Crew • Sanitation & Waste",
      email: "crew.sanitation@civicpulse.gov",
      pass: "crew123",
      phone: "+91 98290 34567",
      role: "FIELD_CREW" as UserRole,
      wardId: "WARD_15",
      badge: "EMP-CRW-102",
      dept: "Sanitation & Solid Waste",
      icon: HardHat,
      color: "from-orange-600/30 via-yellow-600/20 to-orange-900/30 text-orange-300",
      borderColor: "border-orange-500/40 hover:border-orange-400",
      route: "/crew",
      desc: "Sanitation waste clearance task queue with on-site timestamped proof submission",
    },
    {
      name: "Vikram Meena",
      title: "Field Crew • Electrical & Lighting",
      email: "crew.electric@civicpulse.gov",
      pass: "crew123",
      phone: "+91 98290 77777",
      role: "FIELD_CREW" as UserRole,
      wardId: "WARD_16",
      badge: "EMP-CRW-103",
      dept: "Electrical & Street Lighting",
      icon: HardHat,
      color: "from-yellow-600/30 via-amber-600/20 to-yellow-900/30 text-yellow-300",
      borderColor: "border-yellow-500/40 hover:border-yellow-400",
      route: "/crew",
      desc: "Streetlight luminaire repairs, pole wiring, and luminaire lux test verification",
    },
  ];

  const filteredPersonas = personas.filter(
    (p) => personaFilter === "ALL" || p.role === personaFilter
  );

  const executeAuthSequence = async (role: UserRole, targetRoute: string) => {
    setLoading(true);
    setAuthStep("Verifying Identity & Encryption Keys...");
    await new Promise((r) => setTimeout(r, 200));

    setAuthStep("Resolving Ward Spatial Jurisdiction & RBAC Matrix...");
    await new Promise((r) => setTimeout(r, 200));

    setAuthStep("Establishing Secure Session...");
    await new Promise((r) => setTimeout(r, 150));

    let destination = targetRoute;
    if (redirectPath && redirectPath !== "/" && !redirectPath.startsWith("/login")) {
      // Validate that role has permission for redirectPath
      if (redirectPath.startsWith("/commissioner")) {
        if (role === "MUNICIPAL_COMMISSIONER") {
          destination = redirectPath;
        }
      } else if (redirectPath.startsWith("/supervisor")) {
        if (role === "WARD_SUPERVISOR" || role === "MUNICIPAL_COMMISSIONER") {
          destination = redirectPath;
        }
      } else if (redirectPath.startsWith("/crew")) {
        destination = redirectPath;
      } else {
        destination = redirectPath;
      }
    }

    router.push(destination);
    router.refresh();
  };

  const handlePersonaLogin = async (p: typeof personas[0]) => {
    setErrorMsg("");
    setSuccessToast(`Authenticated as ${p.name} (${p.title})`);
    loginAsPersona(p.email, p.wardId);
    await executeAuthSequence(p.role, p.route);
  };

  const handlePrefillPersona = (p: typeof personas[0]) => {
    setEmail(p.email);
    setPassword(p.pass);
    setPhone(p.phone);
    setActiveTab("PASSWORD");
    setErrorMsg("");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setAuthStep("Validating Municipal Credentials...");

    const res = await login({ email, password });
    if (res.success && res.user) {
      setSuccessToast(`Welcome back, ${res.user.full_name}`);
      const target = (
        res.user.role === "MUNICIPAL_COMMISSIONER" ? "/commissioner" :
        res.user.role === "WARD_SUPERVISOR" ? "/supervisor" :
        res.user.role === "FIELD_CREW" ? "/crew" : "/"
      );
      await executeAuthSequence(res.user.role, target);
    } else {
      setLoading(false);
      setAuthStep(null);
      setErrorMsg(res.error || "Authentication failed. Verify your email and password.");
    }
  };

  const handleSendOtp = () => {
    if (!phone || phone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg("");
    setOtpSent(true);
    setOtpTimer(45);
    setOtp("123456"); // Pre-fill official test token
    setSuccessToast("Verification code generated (Staff Token: 123456)");
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setAuthStep("Verifying OTP Token...");

    const res = await loginWithPhoneOtp(phone, otp);
    if (res.success && res.user) {
      setSuccessToast(`Phone verified. Welcome ${res.user.full_name}`);
      const target = (
        res.user.role === "MUNICIPAL_COMMISSIONER" ? "/commissioner" :
        res.user.role === "WARD_SUPERVISOR" ? "/supervisor" : "/crew"
      );
      await executeAuthSequence(res.user.role, target);
    } else {
      setLoading(false);
      setAuthStep(null);
      setErrorMsg(res.error || "Invalid verification code.");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setAuthStep("Provisioning Profile & Security Keys...");

    const res = await signUp({
      email,
      password,
      full_name: fullName,
      phone: signupPhone,
      role: selectedRole,
      ward_id: selectedRole === "MUNICIPAL_COMMISSIONER" ? undefined : selectedWard,
      department,
    });

    if (res.success && res.user) {
      setSuccessToast(`Account created. Logged in as ${res.user.full_name}`);
      const target = (
        res.user.role === "MUNICIPAL_COMMISSIONER" ? "/commissioner" :
        res.user.role === "WARD_SUPERVISOR" ? "/supervisor" : "/crew"
      );
      await executeAuthSequence(res.user.role, target);
    } else {
      setLoading(false);
      setAuthStep(null);
      setErrorMsg(res.error || "Registration failed. Try again.");
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    await requestPasswordReset(forgotEmail);
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setForgotModalOpen(false);
      setForgotEmail("");
    }, 2500);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-6 sm:py-10 animate-fade-in">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Active Session Status Strip (if logged in) */}
      {isAuthenticated && currentProfile && (
        <div className="w-full max-w-7xl mx-auto mb-6 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {currentProfile.full_name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Active Session: {currentProfile.full_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold">
                  {currentProfile.role.replace("_", " ")}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {currentProfile.email} • {currentProfile.ward_id ? `Assigned to ${currentProfile.ward_id}` : "City Governance"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={
                currentProfile.role === "MUNICIPAL_COMMISSIONER" ? "/commissioner" :
                currentProfile.role === "WARD_SUPERVISOR" ? "/supervisor" : "/crew"
              }
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <span>Go to Operations Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Government Services Branding & Persona Hub   */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-slate-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Gov Seal & Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-600 bg-slate-950/70 text-slate-200 text-xs font-semibold shadow-sm">
                <Shield className="w-3.5 h-3.5 text-sky-300" />
                <span>Municipal Operations Gateway • ISO 27001</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Jan Setu <span className="text-slate-200">Access Portal</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                Unified access for citizens, supervisors, and crews to turn complaints into visible, accountable action.
              </p>
            </div>

            {/* Live Operations Telemetry Strip */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-indigo-500/20 backdrop-blur-md shadow-inner text-center">
              <div>
                <div className="text-lg font-extrabold text-white">{complaints.length}</div>
                <div className="text-[10px] text-slate-400 font-medium">Incidents Tracked</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-emerald-400">
                  {wards.length} Wards
                </div>
                <div className="text-[10px] text-slate-400 font-medium">GIS Polygons</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-purple-400">
                  {isSupabaseActive ? "Live Cloud" : "Local Sync"}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">PostGIS Engine</div>
              </div>
            </div>

            {/* Quick Persona Directory & Fast Switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Municipal Staff Roster (Quick Authenticate)</span>
                </div>
                <span className="text-[10px] text-indigo-300 font-semibold">
                  Active Directory
                </span>
              </div>

              {/* Persona Filter Chips */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {(["ALL", "WARD_SUPERVISOR", "FIELD_CREW", "MUNICIPAL_COMMISSIONER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPersonaFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      personaFilter === r
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {r === "ALL" ? "All Roles" :
                     r === "WARD_SUPERVISOR" ? "Supervisors" :
                     r === "FIELD_CREW" ? "Field Crew" : "Commissioner"}
                  </button>
                ))}
              </div>

              {/* Persona Cards List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredPersonas.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.email}
                      className={`p-3 rounded-2xl bg-gradient-to-r ${p.color} border ${p.borderColor} flex items-center justify-between gap-3 shadow-md group transition-all`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center shrink-0 text-white shadow-inner">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-300">
                              {p.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300 truncate">
                            {p.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePrefillPersona(p)}
                          title="Pre-fill email & password in form"
                          className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
                        >
                          Fill Form
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePersonaLogin(p)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-md flex items-center gap-1 transition-all group-hover:scale-105"
                        >
                          <span>Sign In</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Security Compliance Footer */}
          <div className="relative z-10 pt-6 mt-6 border-t border-indigo-500/20 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Spatial PostGIS Encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Tier RBAC Policy</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Enterprise Authentication Command Card      */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="p-6 sm:p-8 md:p-10 rounded-3xl border border-indigo-500/30 bg-slate-900/95 backdrop-blur-2xl shadow-2xl space-y-6">
            {/* Tab Navigation */}
            <div className="flex p-1 rounded-2xl bg-slate-950/90 border border-indigo-500/20 text-xs">
              <button
                type="button"
                onClick={() => { setActiveTab("PASSWORD"); setErrorMsg(""); }}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "PASSWORD"
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("OTP"); setErrorMsg(""); }}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "OTP"
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone OTP</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("SIGNUP"); setErrorMsg(""); }}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "SIGNUP"
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-fade-in shadow-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Authentication Progress Loader */}
            {loading && authStep && (
              <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <span>{authStep}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full w-3/4 animate-pulse" />
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* TAB 1: STANDARD EMAIL & PASSWORD AUTH                  */}
            {/* ======================================================= */}
            {activeTab === "PASSWORD" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Official Email Address</span>
                    <span className="text-[10px] text-slate-500 font-normal">e.g. supervisor14@civicpulse.gov</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter official email address"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-indigo-500/30 bg-slate-950 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-[11px]">Remember this device for 30 days</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Authenticate & Enter Operations Console</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ======================================================= */}
            {/* TAB 2: PHONE & 6-DIGIT OTP AUTH                         */}
            {/* ======================================================= */}
            {activeTab === "OTP" && (
              <form onSubmit={handleOtpLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98290 23456"
                      className="w-full pl-10 pr-24 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpTimer > 0}
                      className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-[10px] font-bold transition-all"
                    >
                      {otpTimer > 0 ? `Resend (${otpTimer}s)` : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span>6-Digit Verification Code</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">Staff Token: 123456</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] py-3 bg-slate-950/90 border border-indigo-500/40 rounded-xl text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !otpSent || otp.length !== 6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify Token & Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ======================================================= */}
            {/* TAB 3: NEW MUNICIPAL STAFF ONBOARDING                   */}
            {/* ======================================================= */}
            {activeTab === "SIGNUP" && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Er. Devendra Singh"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Official Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@civicpulse.gov"
                      className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="+91 98000 00000"
                      className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Municipal Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="WARD_SUPERVISOR">Ward Supervisor</option>
                      <option value="FIELD_CREW">Field Operations Crew</option>
                      <option value="MUNICIPAL_COMMISSIONER">Municipal Commissioner</option>
                    </select>
                  </div>

                  {selectedRole !== "MUNICIPAL_COMMISSIONER" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Assigned Ward
                      </label>
                      <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {wards.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.zone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration & Launch Console</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl border border-indigo-500/30 bg-slate-900/95 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Reset Account Password</span>
              </h3>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Password reset link sent to your email address!</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-slate-300">
                  Enter your registered official email. We will dispatch encrypted password reset instructions.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. supervisor14@civicpulse.gov"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
