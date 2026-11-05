import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // 1️⃣ Auto-redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role) {
          navigate(`/${profile.role}`, { replace: true });
          return;
        }
      }

      setAuthChecking(false);
    };

    checkUser();

    // Only listen to auth changes for redirect AFTER login
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) navigate(`/${profile.role}`, { replace: true });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  // 2️⃣ Email/password login
  const handleLogin = async ({ email, password }: LoginValues) => {
    setLoading(true);

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      toast.error("Authentication did not return a user.");
      setLoading(false);
      return;
    }

    const { data: profile, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !profile) {
      toast.error("Profile not found.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate(`/${profile.role}`, { replace: true });
  };

  // 3️⃣ Google OAuth login (forces account selection)
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account", // ⚡ Important: forces Google to show account chooser
        },
      },
    });

    if (error) toast.error(error.message);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-bold">
        Authenticating...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8DAFC] flex items-center justify-center p-6">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-xl border border-white">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-black italic">TT</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Login</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">African Tech Talk</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl mb-6 hover:bg-slate-50 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            required
          />
          {errors.email && <p id="login-email-error" role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
          <input
            type="password"
            placeholder="Password"
            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            required
          />
          {errors.password && <p id="login-password-error" role="alert" className="text-sm text-red-600">{errors.password.message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "LOG IN TO DASHBOARD"}
          </button>
        </form>
      </div>
    </div>
  );
}
