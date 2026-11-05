import React from "react";
import { BarChart3 } from "lucide-react";
import AnalyticsDashboard from "../../../features/commerce/Analytics";

export default function AdminAnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-xs">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-2">
          <BarChart3 className="text-purple-600" /> Advanced Financial & Growth Analytics
        </h2>
        <p className="text-xs text-slate-400 font-bold">Comprehensive telemetry tracking platform revenue, conversion funnels, and usage metrics.</p>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xs">
        <AnalyticsDashboard isOpen={true} onClose={() => undefined} />
      </div>
    </div>
  );
}
