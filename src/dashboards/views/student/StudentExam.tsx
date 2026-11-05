import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import { Clock, Flag, CheckCircle, ArrowLeft, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ExamPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  
  // UI Engine States
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); 
  const [flags, setFlags] = useState({}); 
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const fetchTimeoutRef = useRef(null);

  // 1. Core Fetcher Framework with Safety Timeout
  const fetchExamAndInitialize = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    try {
      setLoading(true);
      setTimedOut(false);

      // Set a 10-second safety timeout to prevent infinite hanging
      fetchTimeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setTimedOut(true);
          setLoading(false);
          toast.error("Network synchronization took too long.");
        }
      }, 10000);

      // Fetch Exam Configuration
      const { data: examData, error: examErr } = await supabase
        .from("exams")
        .select("*")
        .eq("id", id)
        .single();

      if (examErr || !examData) throw new Error("Exam context could not be located.");
      
      if (!isMounted) return;
      setExam(examData);
      setTimeLeft(examData.duration_minutes * 60);

      // Fetch Targeted Questions
      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examData.id);

      if (qErr) throw qErr;
      
      const fetchedQuestions = qData || [];
      if (!isMounted) return;
      setQuestions(fetchedQuestions);

      // CRITICAL STOP: Short-circuit completely if no questions exist
      if (fetchedQuestions.length === 0) {
        setIsEmpty(true);
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        setLoading(false);
        return; 
      }

      // Initialize or Retrieve Active Session Attempt
      const { data: attemptData, error: attemptErr } = await supabase
        .from("attempts")
        .select("*")
        .eq("exam_id", examData.id)
        .eq("student_id", user?.id)
        .is("end_time", null) 
        .order("start_time", { ascending: false })
        .limit(1);

      if (attemptErr) throw attemptErr;

      let activeAttempt = attemptData?.[0];

      if (!activeAttempt) {
        const { data: newAttempt, error: createErr } = await supabase
          .from("attempts")
          .insert({
            exam_id: examData.id,
            student_id: user?.id,
            start_time: new Date().toISOString()
          })
          .select()
          .single();

        if (createErr) throw createErr;
        activeAttempt = newAttempt;
      } else {
        const { data: savedAnswers, error: answersErr } = await supabase
          .from("answers")
          .select("question_id, answer")
          .eq("attempt_id", activeAttempt.id);

        if (!answersErr && savedAnswers) {
          const recoveredAnswers = {};
          savedAnswers.forEach(row => {
            recoveredAnswers[row.question_id] = row.answer;
          });
          setAnswers(recoveredAnswers);
        }
      }

      if (isMounted) {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        setAttempt(activeAttempt);
        setLoading(false); 
      }
    } catch (err) {
      console.error(err);
      if (isMounted) {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        toast.error(err.message || "Initialization error occurred.");
        setLoading(false);
      }
    }
  }, [id, user]);

  useEffect(() => {
    let isMounted = true;
    if (id && user) {
      fetchExamAndInitialize();
    } else if (!id) {
      setLoading(false);
    }
    return () => {
      isMounted = false;
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [id, user, fetchExamAndInitialize]);

  // 2. Evaluation Engine & Submission Handler
  const submitExam = useCallback(async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: databaseAnswers } = await supabase
        .from("answers")
        .select("*")
        .eq("attempt_id", attempt.id);

      let computedScore = 0;
      databaseAnswers?.forEach(savedAns => {
        const matchingQuestion = questions.find(q => q.id === savedAns.question_id);
        if (matchingQuestion?.type === "mcq" && savedAns.answer === matchingQuestion.correct_answer) {
          computedScore += matchingQuestion.marks || 1;
        }
      });

      const { error: updateError } = await supabase
        .from("attempts")
        .update({ 
          score: computedScore, 
          end_time: new Date().toISOString() 
        })
        .eq("id", attempt.id);

      if (updateError) throw updateError;

      toast.success("Exam submitted safely!");
      alert(`Exam complete! Your recorded score is: ${computedScore}`);
      navigate(-1); 
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, questions, isSubmitting, navigate]);

  // 3. Timer Heartbeat Hook
  useEffect(() => {
    if (!attempt || !exam || isSubmitting || questions.length === 0) return;

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - new Date(attempt.start_time).getTime()) / 1000;
      const remainingTime = (exam.duration_minutes * 60) - elapsedSeconds;

      setTimeLeft(Math.max(0, remainingTime));

      if (remainingTime <= 0) {
        clearInterval(interval);
        toast.error("Time is up! Submitting answers immediately...", { duration: 5000 });
        submitExam();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, exam, submitExam, isSubmitting, questions.length]);

  // 4. Persistence Mutator for Database State Upserts
  const saveAnswerToDB = async (questionId, responseValue) => {
    if (!attempt) return;
    
    setAnswers(prev => ({ ...prev, [questionId]: responseValue }));

    const { error } = await supabase
      .from("answers")
      .upsert({
        attempt_id: attempt.id,
        question_id: questionId,
        answer: responseValue
      }, { onConflict: "attempt_id,question_id" });

    if (error) {
      console.error("Answer failed to sync: ", error);
      toast.error("Network sync lag detected.");
    }
  };

  const toggleFlag = (qId) => setFlags(prev => ({ ...prev, [qId]: !prev[qId] }));

  // Guard: Handle missing ID
  if (!id) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-4">
      <AlertTriangle className="text-amber-500" size={48} />
      <div className="text-center">
        <p className="font-black text-slate-800 dark:text-white text-lg">No Exam Selected</p>
        <p className="text-slate-400 text-sm font-medium max-w-xs mt-1">Please select an assessment to view and start taking it.</p>
      </div>
      <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition">
        Go Back
      </button>
    </div>
  );

  // Guard: Make sure user actually exists
  if (!user) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-3">
      <Loader2 className="animate-spin text-indigo-600" size={36} />
      <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">Authenticating user credentials...</span>
    </div>
  );

  // Timeout Fallback View
  if (timedOut) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-4">
      <AlertTriangle className="text-amber-500" size={48} />
      <div className="text-center">
        <p className="font-black text-slate-800 dark:text-white text-lg">Connection Timed Out</p>
        <p className="text-slate-400 text-sm font-medium max-w-xs mt-1">We couldn't connect to the assessment server in time.</p>
      </div>
      <div className="flex gap-3 mt-2">
        <button onClick={fetchExamAndInitialize} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2">
          <RefreshCw size={16} /> Retry
        </button>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold rounded-xl text-sm transition">
          Go Back
        </button>
      </div>
    </div>
  );

  // Absolute fallback layer handling empty DB configurations cleanly
  if (isEmpty || (!loading && questions.length === 0)) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-4">
      <AlertTriangle className="text-amber-500" size={48} />
      <div className="text-center">
        <p className="font-black text-slate-800 dark:text-white text-lg">Exam Is Empty</p>
        <p className="text-slate-400 text-sm font-medium max-w-xs mt-1">This assessment doesn't contain any questions yet. Please contact your administrator.</p>
      </div>
      <button onClick={() => navigate(-1)} className="px-5 py-2 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white font-bold rounded-xl text-sm transition">
        Go Back
      </button>
    </div>
  );

  // Loading Screen Fallback Barrier
  if (loading) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-3">
      <Loader2 className="animate-spin text-indigo-600" size={36} />
      <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">Synchronizing assessment nodes...</span>
    </div>
  );

  // Extra guard check in case configuration records are missing altogether
  if (!exam) return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-dashboard-night gap-4">
      <AlertTriangle className="text-amber-500" size={48} />
      <div className="text-center">
        <p className="font-black text-slate-800 dark:text-white text-lg">Configuration Error</p>
        <p className="text-slate-400 text-sm font-medium max-w-xs mt-1">Failed to gather exam details.</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentIdx] || {};

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-dashboard-night text-gray-900 dark:text-white">
      {/* ===== SIDEBAR COMPONENT MATRIX ===== */}
      <aside className="w-80 bg-white dark:bg-white/5 border-r border-slate-100 dark:border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <button 
            onClick={() => { if(confirm("Abandon exam? Progress saves but timer keeps running!")) navigate(-1); }} 
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 font-bold text-xs uppercase"
          >
            <ArrowLeft size={14} /> Exit Room
          </button>
          
          <h3 className="font-black text-slate-900 dark:text-white text-xs tracking-wider uppercase mb-4">Navigation Tree</h3>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, idx) => {
              const isFlagged = flags[q.id];
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-11 w-11 rounded-xl border text-sm font-black transition active:scale-95 flex items-center justify-center ${
                    isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900' : ''
                  } ${
                    isFlagged ? 'bg-amber-400 border-amber-500 text-white shadow-sm' :
                    isAnswered ? 'bg-emerald-500 border-emerald-600 text-white' : 
                    'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl space-y-2 mt-6 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"/> Saved Response</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400"/> Flagged For Review</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-50 dark:bg-white/10 border dark:border-white/20"/> Not Attempted</div>
        </div>
      </aside>

      {/* ===== MAIN WORKSPACE ===== */}
      <main className="flex-1 flex flex-col">
        {/* Header Block */}
        <header className="bg-white dark:bg-white/5 px-8 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{exam.title}</h1>
            <p className="text-slate-400 text-xs font-bold">Targeted Assessment Sandbox</p>
          </div>

          <div className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-mono font-black text-sm shadow-sm border transition-all ${
            timeLeft < 120 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-slate-900 dark:bg-white/10 text-white border-transparent'
          }`}>
            <Clock size={16} />
            {Math.floor(timeLeft / 60)}:{("0" + Math.floor(timeLeft % 60)).slice(-2)}
          </div>
        </header>

        {/* Interactive Workspace Area */}
        <section className="flex-1 p-8 overflow-y-auto max-w-4xl w-full mx-auto">
          <div className="bg-white dark:bg-white/5 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-white/10">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black tracking-widest uppercase">
              Question {currentIdx + 1} of {questions.length} ({currentQuestion.marks || 1} Marks)
            </span>
            <h2 className="text-xl text-slate-800 dark:text-white font-bold mt-4 mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* MCQ Input Mode */}
            {currentQuestion.type === "mcq" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isChecked = answers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => saveAnswerToDB(currentQuestion.id, opt)}
                      className={`block w-full text-left p-4 border-2 rounded-2xl font-medium text-sm transition-all active:scale-[0.99] ${
                        isChecked 
                          ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-600 text-indigo-900 dark:text-indigo-300 font-bold' 
                          : 'border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50/80 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open Form Inputs */}
            {(currentQuestion.type === "short" || currentQuestion.type === "debug") && (
              <textarea
                className="w-full border-2 border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-5 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-white/10 outline-none transition font-medium text-slate-700 dark:text-white text-sm placeholder:text-slate-300 dark:placeholder:text-slate-500 shadow-inner"
                rows={6}
                value={answers[currentQuestion.id] || ""}
                placeholder="Type your formal code snippet or textual response evaluation here..."
                onChange={e => saveAnswerToDB(currentQuestion.id, e.target.value)}
              />
            )}
          </div>
        </section>

        {/* Action Bottom Control Navigation Bar */}
        <footer className="px-8 py-5 bg-white dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-between items-center shadow-lg">
          <button 
            onClick={() => toggleFlag(currentQuestion.id)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              flags[currentQuestion.id] ? 'bg-amber-400 text-white' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-white/5'
            }`}
          >
            <Flag size={16} className={flags[currentQuestion.id] ? "fill-white" : ""} /> Flag for Review
          </button>

          <div className="flex gap-3">
            <button 
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(p => p - 1)} 
              className="px-5 py-2.5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-black text-xs rounded-xl disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Previous
            </button>
            
            {currentIdx < questions.length - 1 ? (
              <button 
                onClick={() => setCurrentIdx(p => p + 1)} 
                className="px-6 py-2.5 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white font-black text-xs rounded-xl uppercase tracking-wider"
              >
                Next
              </button>
            ) : (
              <button 
                disabled={isSubmitting}
                onClick={() => { if(confirm("Are you sure you want to finish and submit?")) submitExam(); }} 
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-md"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Submit Exam
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}