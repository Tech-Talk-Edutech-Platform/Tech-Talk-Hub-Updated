import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { isAppRole, type AppRole } from "../types/roles";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: readonly AppRole[];
}

export default function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const [status, setStatus] = useState("loading"); // loading, unauthorized, authorized
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setStatus("unauthorized");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .abortSignal(controller.signal)
        .single();

      if (!active) return;

      if (error || !data || !isAppRole(data.role) || !allowedRoles.includes(data.role)) {
        setStatus("unauthorized");
      } else {
        setStatus("authorized");

        // Auto-redirect if user is on landing page
        // if (window.location.pathname === "/login") {
        //   navigate(`/${data.role}`, { replace: true });
        // }
        // Auto-redirect for logged-in users trying to access public pages
// if (window.location.pathname === "/" || window.location.pathname === "/login") {
//   navigate(`/${data.role}`, { replace: true });
// }

      }
    };

    void checkAccess();
    return () => {
      active = false;
      controller.abort();
    };
  }, [allowedRoles, navigate]);

  if (status === "loading") {
    return(
      <div className="h-screen flex items-center justify-center font-black animate-pulse bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-900 tracking-widest uppercase text-xs">Verifying Access...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-900">ACCESS DENIED</h1>
        <p className="text-slate-500 mt-2 max-w-sm">
          Your account does not have the required permissions to access this dashboard.
        </p>
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/");
          }} 
          className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
        >
          Login with Different Account
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
