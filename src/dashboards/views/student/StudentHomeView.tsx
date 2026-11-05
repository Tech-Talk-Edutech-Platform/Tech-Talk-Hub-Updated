import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";
import { 
  Rocket, 
  Flame, 
  Crown, 
  Sparkles, 
  Star, 
  Calendar,
  User as UserIcon,
  Video,
  PlayCircle,
  GraduationCap,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentHomeView({ userId }) {
  const [student, setStudent] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [latestRecordings, setLatestRecordings] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      // 1. Fetch Student Info
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      setStudent(user);

      // 2. Fetch Latest Result
      const { data: resultData } = await supabase
        .from("student_results")
        .select("*")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      setLatestResult(resultData?.[0] ?? null);

      // 3. Fetch Class Recordings with the Joined Tutor Name
      const { data: recordingData, error } = await supabase
        .from("class_recordings")
        .select(`
          *,
          tutor:users!class_recordings_tutor_id_fkey (
            full_name
          )
        `)
        .or(`student_id.eq.${userId},student_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!error && recordingData) {
        setLatestRecordings(recordingData);
      }
    };

    loadData();
  }, [userId]);

  const studentAvatar = latestResult?.avatar_url || student?.avatar_url;
  const studentName = student?.full_name || "Active Student";
  const overallScore = latestResult?.overall_score ?? 0;

  const streak = 0;
  const level = 1;  
  const firstName = studentName.split(" ")[0];
  const clampedScore = Math.min(Math.max(overallScore, 0), 100);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#f5f7ff] dark:bg-dashboard-night text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/20 dark:bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/15 dark:bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-fade-in">

        {/* WELCOME BANNER HEADER */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 rounded-[25px] sm:rounded-[30px] md:rounded-[35px] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border border-purple-700/30">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-200 border border-white/10">
              <Sparkles size={12} className="text-pink-400 animate-spin" /> Student Dashboard ⭐
            </div>

            <div className="flex items-center gap-4">
              {studentAvatar ? (
                <img 
                  src={studentAvatar} 
                  alt={studentName} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-pink-400/60 shadow-md shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center border-2 border-white/30 shadow-md shrink-0">
                  <UserIcon size={20} />
                </div>
              )}
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                Welcome back,{" "}
                <span className="text-pink-300">
                  {firstName}
                </span>{" "}
                💜
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-purple-200 font-medium max-w-xl">
              Continue your courses, track your learning progress, and unlock new achievements today.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs">
                <Flame className="text-orange-400" size={16} />
                <span className="text-xs font-bold text-white">{streak} Day Streak</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs">
                <Crown className="text-yellow-400" size={16} />
                <span className="text-xs font-bold text-white">Level {level}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs">
                <Sparkles className="text-pink-400" size={16} />
                <span className="text-xs font-bold text-white">{clampedScore}% Score</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-lg min-w-[260px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg shadow-md">
                  🎯
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-purple-200 font-bold">
                    Next Goal
                  </p>
                  <h3 className="font-black text-white text-sm">
                    Reach Level {level + 1}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-purple-200">
                Complete your next lesson to unlock new achievements.
              </p>

              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-semibold mb-1.5 text-purple-200">
                  <span>Progress</span>
                  <span>{clampedScore}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                    style={{ width: `${clampedScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* RECENT CLASS RECORDINGS SECTION */}
      <div className="bg-white/90 dark:bg-white/5 backdrop-blur-2xl rounded-[32px] p-6 md:p-8 border border-purple-200/60 dark:border-purple-500/25 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
              <Video size={20} />
            </div>
            <h3 className="text-lg font-black tracking-tight">Class Recordings</h3>
          </div>
        </div>

        {latestRecordings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestRecordings.map((recording) => {
              const resolvedTutorName = 
                recording.tutor?.full_name || 
                recording.tutor_name || 
                "Assigned Tutor";

              return (
                <div 
                  key={recording.id} 
                  className="bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-500/20 p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:border-purple-400/40 transition-all"
                >
                  {recording.recording_url ? (
                    <a
                      href={recording.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video bg-black/80 rounded-xl overflow-hidden shadow-md flex items-center justify-center relative cursor-pointer group block"
                    >
                      {recording.thumbnail_url ? (
                        <img 
                          src={recording.thumbnail_url} 
                          alt={recording.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}

                      <div className={`absolute inset-0 ${recording.thumbnail_url ? 'bg-black/40 group-hover:bg-black/20' : 'bg-purple-900/20 group-hover:bg-purple-900/0'} transition-colors flex items-center justify-center`}>
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <PlayCircle size={28} />
                        </div>
                      </div>
                       
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        Watch Session <ExternalLink size={10} />
                      </span>
                    </a>
                  ) : (
                    <div className="aspect-video bg-black/80 rounded-xl overflow-hidden shadow-md flex items-center justify-center relative">
                      <div className="text-gray-400 text-xs flex flex-col items-center gap-2">
                        <PlayCircle size={32} />
                        <span>Video link unavailable</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="bg-purple-600/15 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                        {recording.course_name || "Live Session"}
                      </span>
                      {recording.created_at && (
                        <span className="text-[10px] font-bold text-pink-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(recording.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                     
                    <h4 className="font-extrabold text-base line-clamp-1">
                      {recording.title || "Catch up on what you missed!"}
                    </h4>

                    <div className="pt-1 flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-300 border-t border-purple-100 dark:border-purple-500/15 mt-2">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-purple-500 shrink-0" />
                        <span className="font-bold text-purple-600 dark:text-purple-400">Tutor:</span>
                        <span className="font-semibold">{resolvedTutorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-purple-600 dark:text-purple-400 pl-5">Student:</span>
                        <span>{studentName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-purple-50/30 dark:bg-purple-950/20 rounded-2xl border border-dashed border-purple-200 dark:border-purple-500/20">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              No class recordings available yet. Check back soon after your next live session!
            </p>
          </div>
        )}
        </div>

        {/* MAIN FEATURED HERO CARD */}
        <div className="bg-white/90 dark:bg-white/5 backdrop-blur-2xl rounded-[32px] p-6 md:p-10 border border-purple-200/60 dark:border-purple-500/25 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            <div className="lg:col-span-3 flex flex-col items-center justify-center bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-500/30 p-6 rounded-3xl shadow-inner">
              <h3 className="font-black text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-6 flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500" /> Magic Skill Jar
              </h3>
              <div className="relative w-32 h-40">
                <div className="absolute inset-0 bg-purple-400/20 blur-3xl rounded-full" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full z-20 shadow-md" />
                <div className="absolute top-3 w-full h-36 rounded-[2.2rem] bg-gradient-to-b from-purple-100/90 to-indigo-200/90 dark:from-purple-900/40 dark:to-indigo-950/50 border-[6px] border-white dark:border-purple-500/30 shadow-xl overflow-hidden backdrop-blur-md">
                  <div className="absolute left-3 top-3 w-3 h-20 bg-white/50 rounded-full" />
                  <div className="absolute top-6 left-5 text-xl animate-bounce">⚙️</div>
                  <div className="absolute top-9 right-4 text-lg animate-pulse">💡</div>
                  <div className="absolute bottom-8 left-6 text-xl animate-bounce">🎮</div>
                  <div className="absolute bottom-6 right-5 text-lg animate-pulse">🚀</div>
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 text-base animate-spin">💜</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 bg-purple-600/15 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-purple-500/30">
                <Star size={14} className="text-purple-500" /> Current Enrolled Course
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                {latestResult?.course_name || "Scratch Programming & Logic"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-purple-200 font-medium leading-relaxed">
                You're making fantastic progress! Keep completing exercises and building your coding projects to rank higher.
              </p>

              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/30 px-3 py-2 rounded-xl w-fit border border-purple-200 dark:border-purple-500/20">
                <Calendar size={14} className="text-pink-500" />
                <span>Next Live Class: Tomorrow at 4:00 PM</span>
              </div>

              <div className="pt-3">
                <Link to="/courses" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:scale-105 active:scale-[0.98] rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-purple-950/30 border border-purple-400/30">
                  <span>Continue Learning</span>
                  <Rocket size={18} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col items-center justify-center bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-500/30 p-6 rounded-3xl shadow-inner">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-purple-200/60 dark:text-purple-950 fill-transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="fill-transparent transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <h3 className="text-3xl font-black tracking-tight">{clampedScore}%</h3>
                  <p className="text-[10px] uppercase tracking-widest text-purple-700 dark:text-purple-300 font-black mt-1">
                    {latestResult?.performance_label || "Mastery"}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
