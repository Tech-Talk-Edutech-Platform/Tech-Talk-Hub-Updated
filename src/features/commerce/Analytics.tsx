import SalesDashboard from "./SalesDashboard";
import SalesDashboardCharts from "./SalesDashboardCharts";
import { BarChart3, X } from "lucide-react";

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-6xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-black flex items-center gap-2">
            <BarChart3 className="text-purple-600" /> Sales Analytics
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <SalesDashboard />
          <SalesDashboardCharts />
        </div>
      </div>
    </div>
  );
}
