import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabase";
import { Settings, User, Lock, Bell, Shield, Save, Loader2, Sun, Moon, LogOut, Camera } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettingsView({ user }) {
  const [fullName, setFullName] = useState(user?.full_name || user?.name || "");
  const [email] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [examReminders, setExamReminders] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains("dark"));

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("users")
        .select("is_dark_mode")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data && typeof data.is_dark_mode === "boolean") {
            setIsDarkMode(data.is_dark_mode);
            if (data.is_dark_mode) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
        });
    }
  }, [user?.id]);

  const toggleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);

    if (nextMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    toast.success(nextMode ? "Dark mode activated" : "Light mode activated");

    if (user?.id) {
      await supabase
        .from("users")
        .update({ is_dark_mode: nextMode })
        .eq("id", user.id);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsUpdatingProfile(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully.");
      window.location.reload();
    } catch (err) {
      toast.error("Failed to sign out.");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="text-blue-600" /> Platform Settings & Controls
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configure global notification triggers, access thresholds, and system preferences.</p>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl">
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Interface Theme</h3>
            <p className="text-xs text-slate-400">Switch between light and dark viewing mode.</p>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="px-5 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition flex items-center gap-2"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Profile & Avatar</h3>
            <p className="text-xs text-slate-400">Update your profile identity and picture.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 flex items-center justify-center font-bold text-purple-600 text-xl">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              fullName?.charAt(0)?.toUpperCase() || "A"
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer px-4 py-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 font-bold rounded-xl text-xs transition inline-flex items-center gap-2">
              <Camera size={14} /> Change Avatar
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <p className="text-[11px] text-slate-400 mt-1">Recommended: Square JPG or PNG under 2MB.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition text-sm font-medium text-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address (Locked)</label>
              <input 
                type="email"
                value={email}
                disabled
                className="w-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-4 py-3 rounded-xl opacity-60 cursor-not-allowed text-sm font-medium text-slate-500 dark:text-slate-400"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isUpdatingProfile}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Profile
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Security & Password</h3>
            <p className="text-xs text-slate-400">Ensure your account is secure by updating your password regularly.</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition text-sm font-medium text-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Confirm New Password</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition text-sm font-medium text-slate-800 dark:text-white"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isUpdatingPassword}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdatingPassword ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-50 dark:bg-pink-500/10 text-pink-600 rounded-2xl">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Notifications</h3>
            <p className="text-xs text-slate-400">Manage how you receive alerts and system updates.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">Email Alerts</p>
              <p className="text-xs text-slate-400">Receive system-wide announcements and reports.</p>
            </div>
            <input 
              type="checkbox" 
              checked={emailNotifications} 
              onChange={() => setEmailNotifications(!emailNotifications)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer">
            <div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">System Reminders</p>
              <p className="text-xs text-slate-400">Get notified when platform activities or reviews are logged.</p>
            </div>
            <input 
              type="checkbox" 
              checked={examReminders} 
              onChange={() => setExamReminders(!examReminders)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/10">
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Automated Attendance Reminders</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Ping tutors 5 minutes prior to un-logged live sessions.</p>
          </div>
          <button onClick={() => toast.success("Settings updated successfully!")} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
            Configure
          </button>
        </div>

        <div className="p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5 flex justify-between items-center">
          <div>
            <h4 className="font-black text-rose-900 dark:text-rose-400 text-sm">Maintenance Mode</h4>
            <p className="text-xs text-rose-500 font-medium mt-0.5">Temporarily restrict student login access for system updates.</p>
          </div>
          <button onClick={() => toast.error("Action requires Master Owner privileges.")} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
            Toggle
          </button>
        </div>
      </div>

      <div className="bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-3xl p-8 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-red-600 dark:text-red-400 text-base">Terminate Session</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sign out securely from your admin account on this device.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-500/20 flex items-center gap-2"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}