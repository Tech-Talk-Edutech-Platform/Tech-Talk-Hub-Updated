import React, { useState } from "react";
import {
  FormProvider,
  useForm,
  type SubmitHandler,
} from "react-hook-form";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "../../../supabase";
import { toast } from "react-hot-toast";
import { FormTextField } from "../../../components/forms/FormTextField";
import { Button } from "../../../components/ui/Button";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";

const phaseSchema = z.object({
  phaseTitle: z.string().trim().min(1, "Please enter a phase title"),
  phaseFocus: z.string(),
  lessonCount: z.number().int().min(1).max(20),
});
type PhaseFormValues = z.infer<typeof phaseSchema>;

type AddPhaseModalProps = { courseId: string; onPhaseAdded?: () => void };

export default function AddPhaseModal({ courseId, onPhaseAdded }: AddPhaseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: { phaseTitle: "", phaseFocus: "", lessonCount: 8 },
  });

  const handleCreatePhaseWithLessonsAndNotes: SubmitHandler<PhaseFormValues> = async ({
    phaseTitle,
    phaseFocus,
    lessonCount,
  }) => {
    setLoading(true);
    try {
      const { data: existingPhases } = await supabase
        .from("course_phases")
        .select("phase_number")
        .eq("course_id", courseId)
        .order("phase_number", { ascending: false })
        .limit(1);

      const nextPhaseNumber = existingPhases?.length ? existingPhases[0].phase_number + 1 : 1;

      const { data: phaseData, error: phaseError } = await supabase
        .from("course_phases")
        .insert([{ course_id: courseId, phase_number: nextPhaseNumber, title: phaseTitle.trim(), focus: phaseFocus.trim() || null }])
        .select()
        .single();

      if (phaseError) throw phaseError;

      for (let i = 1; i <= lessonCount; i++) {
        const lessonTitle = `Lesson ${i}: Core Concept & Practice`;
        const { data: lessonData } = await supabase
          .from("course_lessons")
          .insert([{ phase_id: phaseData.id, title: lessonTitle, position: i }])
          .select()
          .single();

        if (lessonData) {
          await supabase.from("notes").insert([{
            course_id: courseId,
            title: lessonTitle,
            content: `Welcome to ${lessonTitle}. Focus: ${phaseFocus || 'Practical implementation'}.`,
            lesson_order: i
          }]);
        }
      }

      toast.success(`Phase added with ${lessonCount} lessons & notes!`);
      form.reset();
      setIsOpen(false);
      if (onPhaseAdded) onPhaseAdded();
    } catch (error: unknown) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-700 focus-visible:ring-blue-500"
      >
        <Plus size={16} /> Add Structured Phase
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-lg w-full shadow-2xl space-y-6 border border-white/10">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-blue-500" size={20} /> Add Curriculum Phase
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close add phase dialog"
                className="text-slate-400"
              >
                ✕
              </Button>
            </div>

            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(handleCreatePhaseWithLessonsAndNotes)} className="space-y-4">
                <FormTextField<PhaseFormValues>
                  name="phaseTitle"
                  label="Phase title"
                  type="text"
                  required
                  placeholder="Phase Title (e.g., Phase 1: Getting Started)"
                  rules={{ required: "Please enter a phase title" }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <textarea rows={2} placeholder="Focus Description..." {...form.register("phaseFocus")} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
                <FormTextField<PhaseFormValues>
                  name="lessonCount"
                  label="Number of lessons"
                  type="number"
                  min="1"
                  max="20"
                  required
                  rules={{
                    required: "Enter a lesson count",
                    min: { value: 1, message: "At least one lesson is required" },
                    max: { value: 20, message: "A phase can have at most 20 lessons" },
                    setValueAs: (value: unknown) =>
                      typeof value === "string"
                        ? Number.parseInt(value, 10) || 8
                        : 8,
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} className="rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase dark:bg-white/5 dark:text-slate-300">Cancel</Button>
                  <Button type="submit" loading={loading} className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase hover:bg-blue-700 focus-visible:ring-blue-500">
                    Save Phase
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      )}
    </>
  );
}
// <div className="pt-4">
//   <AddPhaseModal 
//     courseId={selectedCourse.id} 
//     onPhaseAdded={() => {
//       fetchCourseDetails(selectedCourse.id);
//       fetchCourses();
//     }} 
//   />
// </div>
