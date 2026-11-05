// import React, { useState, useEffect } from 'react';
// import { supabase } from "../../../supabase"; 
// import toast from "react-hot-toast";
// import { ChevronDown, ChevronUp, Plus, Loader2, Save } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { supabase } from "../../../supabase"; // Ensure this is your local file
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";

interface CreateExamProps {
  examId?: string;
}

export default function CreateExam({ examId }: CreateExamProps) {
  const [questions, setQuestions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (examId) {
      fetchQuestions();
    } else {
      setLoading(false);
    }
  }, [examId]);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Fetch Error:", error);
      toast.error("Could not load questions.");
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }

  async function addQuestion() {
    if (!examId) {
      toast.error("No Exam ID found!");
      return;
    }

    const newQ = { 
      exam_id: examId, 
      question_text: "New Question", 
      options: { A: '', B: '', C: '', D: '' },
      correct_answer: '' 
    };

    const { data, error } = await supabase
      .from("questions")
      .insert([newQ])
      .select();

    if (error) {
      console.error("Insert Error:", error);
      toast.error("Database error: " + error.message);
    } else {
      // Add the new question to state
      setQuestions([...questions, ...data]);
      setExpandedId(data[0].id); // Auto-expand the new question
      toast.success("Question added!");
    }
  }

  async function updateQuestion(id, updates) {
    const { error } = await supabase.from("questions").update(updates).eq("id", id);
    if (error) {
      toast.error("Failed to save changes");
    } else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    }
  }

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto p-10 bg-white shadow-xl rounded-3xl mt-10">
      <div className="border-b pb-6 mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Exam Builder (Exam: {examId || "Not set"})</h1>
        <button 
          onClick={addQuestion} 
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Add Question
        </button>
      </div>
      
      {questions.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl text-gray-400">
          No questions yet. Click "Add Question" to start.
        </div>
      ) : (
        questions.map((q, idx) => (
          <div key={q.id} className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-200">
            <div 
              className="flex justify-between items-center cursor-pointer" 
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <h3 className="font-bold text-lg text-gray-800">Question {idx + 1}</h3>
              {expandedId === q.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>

            {expandedId === q.id && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-300">
                <input 
                  defaultValue={q.question_text}
                  onBlur={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                  className="w-full p-3 border rounded-xl shadow-sm outline-none focus:ring-2 ring-blue-200"
                  placeholder="Type your question text here..."
                />
                <div className="grid grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map((key) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Option {key}</span>
                      <input 
                        placeholder={`Value for ${key}`}
                        defaultValue={q.options?.[key] || ''}
                        onBlur={(e) => {
                          const newOpts = { ...q.options, [key]: e.target.value };
                          updateQuestion(q.id, { options: newOpts });
                        }}
                        className="p-3 border rounded-xl shadow-sm outline-none focus:ring-2 ring-blue-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
