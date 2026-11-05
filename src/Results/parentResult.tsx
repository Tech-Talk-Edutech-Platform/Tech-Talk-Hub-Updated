import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  User,
  BookOpen,
  Code,
  Monitor,
  Lightbulb,
  Star,
  MessageSquare,
  Rocket,
  ExternalLink,
} from 'lucide-react';

const StudentDashboard = () => {
  const { slug } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [slug]);

  async function fetchData() {
    if (!slug) return;

    const { data, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('slug', slug)
      .order('exam_date', { ascending: false });

    if (error) console.error("Fetch Error:", error.message);

    if (data?.length) {
      setData(data);
      setSelectedId(data[0].id);
    }

    setLoading(false);
  }

  const latest = data.find(d => d.id === selectedId) || data[0];

  // AVERAGES
  const avg = data.length
    ? {
        overall: data.reduce((s, i) => s + (i.overall_score || 0), 0) / data.length,
        theory: data.reduce((s, i) => s + (i.theory_score || 0), 0) / data.length,
        practical: data.reduce((s, i) => s + (i.practical_score || 0), 0) / data.length,
        logic: data.reduce((s, i) => s + (i.problem_solving_score || 0), 0) / data.length,
        creative: data.reduce((s, i) => s + (i.creativity_score || 0), 0) / data.length,
      }
    : null;

  if (loading)
    return <div className="p-10 text-center animate-pulse font-sans">Fetching Report Card...</div>;

  if (!data.length)
    return <div className="p-10 text-center font-sans">Result not found.</div>;

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20 font-sans shadow-2xl">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-b-3xl shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4">

          <div className="w-20 h-20 bg-indigo-100 rounded-full overflow-hidden border-4 border-white shadow-inner flex items-center justify-center">
            {latest.avatar_url ? (
              <img src={latest.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-indigo-500" />
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-gray-800">{latest.student_name}</h1>
            <p className="text-sm text-indigo-600 font-semibold">
              Grade {latest.grade_level} • {latest.course_name}
            </p>
          </div>

        </div>
      </div>

      {/* PROJECT */}
      {latest.project_url && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-5 rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-2 font-bold uppercase text-xs tracking-widest">
              <Rocket size={18} /> Student Project
            </div>

            <h3 className="text-lg font-black mb-3">
              Latest submission by {latest.student_name.split(' ')[0]}
            </h3>

            <a
              href={latest.project_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-white text-orange-600 font-black py-3 rounded-xl"
            >
              Launch Project <ExternalLink size={18} />
            </a>
          </div>
        </div>
      )}

      {/* OVERALL */}
      <div className="p-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50">
          <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide px-1">
            Overall Performance
          </h2>

          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center border-[10px] border-green-500 rounded-full">
              <div className="text-center">
                <span className="text-2xl font-black text-gray-800">
                  {latest.overall_score}%
                </span>
                <p className="text-[8px] text-green-500 font-bold uppercase">
                  {latest.performance_label || 'Score'}
                </p>
              </div>
            </div>

            <p className="flex-1 text-sm text-gray-600 leading-tight">
              <span className="font-bold text-gray-800">
                {latest.performance_label || 'Great Job'}!
              </span>{' '}
              Latest exam performance snapshot
            </p>
          </div>
        </div>
      </div>

      {/* EXAMS LIST */}
      <div className="px-4 mb-2">
        {data.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`bg-white p-4 rounded-2xl shadow-sm border-l-[6px] border-indigo-500 mb-3 cursor-pointer ${
              selectedId === item.id ? "ring-2 ring-indigo-400" : ""
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                  <BookOpen size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">
                    {item.exam_title}
                  </h3>

                 
            <p className="text-[10px] text-gray-400 mt-1">
  {item.created_at ? new Date(item.created_at).toDateString() : ''} • {item.overall_score}%
</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-green-500">
                  {item.overall_score}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 IMPROVED AVERAGE SUMMARY (ONLY CHANGE) */}
      <div className="p-4">
        <h2 className="font-bold text-gray-800 mb-3 text-sm px-1 uppercase tracking-wide">
          Average Summary
        </h2>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 grid grid-cols-2 gap-3 text-center">

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Overall</p>
            <p className="text-lg font-black text-gray-800">
              {avg?.overall.toFixed(1)}%
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Theory</p>
            <p className="text-lg font-black text-red-500">
              {avg?.theory.toFixed(1)}%
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Practical</p>
            <p className="text-lg font-black text-blue-500">
              {avg?.practical.toFixed(1)}%
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Logic</p>
            <p className="text-lg font-black text-yellow-500">
              {avg?.logic.toFixed(1)}%
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 col-span-2">
            <p className="text-xs text-gray-500">Creative</p>
            <p className="text-lg font-black text-purple-500">
              {avg?.creative.toFixed(1)}%
            </p>
          </div>

        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="p-4">
        <h2 className="font-bold text-gray-800 mb-3 text-sm px-1 uppercase tracking-wide">
          Section Breakdown
        </h2>

        <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-50 shadow-sm">
          <StatRow label="Theory" score={latest.theory_score} icon={<Code size={16} />} color="bg-red-50 text-red-500" />
          <StatRow label="Practical" score={latest.practical_score} icon={<Monitor size={16} />} color="bg-blue-50 text-blue-500" />
          <StatRow label="Logic" score={latest.problem_solving_score} icon={<Lightbulb size={16} />} color="bg-yellow-50 text-yellow-500" />
          <StatRow label="Creative" score={latest.creativity_score} icon={<Star size={16} />} color="bg-purple-50 text-purple-500" />
        </div>
      </div>

      {/* FEEDBACK */}
      <div className="px-4">
        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg">
          <div className="flex gap-2 items-center text-white font-bold mb-2 text-sm uppercase">
            <MessageSquare size={18} /> Tutor Feedback
          </div>

         <p className="text-sm text-indigo-50 italic leading-relaxed font-medium whitespace-pre-line">
  "{latest.tutor_feedback}"
</p>
        </div>
      </div>

    </div>
  );
};

const StatRow = ({ label, score, icon, color }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-2">
        <div className={`${color} p-1.5 rounded-lg`}>{icon}</div>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">
          {label}
        </span>
      </div>
      <div className="text-xs font-black text-gray-800">{score}%</div>
    </div>

    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
      <div className="bg-green-500 h-full rounded-full" style={{ width: `${score}%` }} />
    </div>
  </div>
);

export default StudentDashboard;
