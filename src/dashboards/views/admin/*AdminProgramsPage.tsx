"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../supabase"
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers3,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

export default function AdminProgramsPage() {
  const supabase = createClient();

  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expandedProgram, setExpandedProgram] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    age_range: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: programsData, error: programsError },
      { data: coursesData, error: coursesError },
    ] = await Promise.all([
      supabase
        .from("programs")
        .select(`
          *,
          program_courses (
            id,
            course_id,
            display_order,
            courses (
              id,
              title,
              description,
              thumbnail_url,
              duration_lessons,
              is_active
            )
          )
        `)
        .order("display_order"),

      supabase
        .from("courses")
        .select("*")
        .order("title"),
    ]);

    if (programsError) {
      console.error("Programs error:", programsError);
    }

    if (coursesError) {
      console.error("Courses error:", coursesError);
    }

    const cleanedPrograms = (programsData || []).map((program) => ({
      ...program,
      program_courses: [...(program.program_courses || [])].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      ),
    }));

    setPrograms(cleanedPrograms);
    setCourses(coursesData || []);
    setLoading(false);
  };

  const generateSlug = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleNameChange = (value) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: generateSlug(value),
    }));
  };

  const createProgram = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) return;

    setSaving(true);

    const { error } = await supabase.from("programs").insert({
      name: form.name.trim(),
      slug: form.slug || generateSlug(form.name),
      age_range: form.age_range.trim(),
      description: form.description.trim(),
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setForm({
      name: "",
      slug: "",
      age_range: "",
      description: "",
      display_order: 0,
      is_active: true,
    });

    setShowForm(false);
    fetchData();
  };

  const deleteProgram = async (programId) => {
    const confirmed = window.confirm(
      "Delete this program? The courses themselves will NOT be deleted."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", programId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchData();
  };

  const assignCourse = async (programId, courseId) => {
    if (!courseId) return;

    const program = programs.find((item) => item.id === programId);

    const alreadyAssigned = program?.program_courses?.some(
      (item) => item.course_id === courseId
    );

    if (alreadyAssigned) {
      alert("This course is already assigned to this program.");
      return;
    }

    const nextOrder = (program?.program_courses?.length || 0) + 1;

    const { error } = await supabase.from("program_courses").insert({
      program_id: programId,
      course_id: courseId,
      display_order: nextOrder,
    });

    if (error) {
      alert(error.message);
      return;
    }

    fetchData();
  };

  const removeCourse = async (programCourseId) => {
    const { error } = await supabase
      .from("program_courses")
      .delete()
      .eq("id", programCourseId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchData();
  };

  const moveCourse = async (program, index, direction) => {
    const items = [...program.program_courses];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];

    const currentOrder = current.display_order ?? index + 1;
    const targetOrder = target.display_order ?? targetIndex + 1;

    const { error: firstError } = await supabase
      .from("program_courses")
      .update({ display_order: targetOrder })
      .eq("id", current.id);

    if (firstError) {
      alert(firstError.message);
      return;
    }

    const { error: secondError } = await supabase
      .from("program_courses")
      .update({ display_order: currentOrder })
      .eq("id", target.id);

    if (secondError) {
      alert(secondError.message);
      return;
    }

    fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-600">
              <Layers3 size={17} />
              Curriculum Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Programs
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Organize existing courses into learning programs such as Junior
              Coders, Future Developers and Tech Professionals.
            </p>
          </div>

          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? "Close" : "New Program"}
          </button>
        </div>

        {/* Create Program */}
        {showForm && (
          <form
            onSubmit={createProgram}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-lg font-bold text-slate-900">
              Create Program
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Program Name
                </label>

                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Junior Coders"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  URL Slug
                </label>

                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  placeholder="junior-coders"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Age Range
                </label>

                <input
                  value={form.age_range}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      age_range: e.target.value,
                    })
                  }
                  placeholder="Ages 5–8"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Display Order
                </label>

                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      display_order: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
              </label>

              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Describe this learning program..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
              />
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
              Active program
            </label>

            <button
              disabled={saving}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}

              Save Program
            </button>
          </form>
        )}

        {/* Programs */}
        <div className="space-y-5">
          {programs.map((program) => {
            const expanded = expandedProgram === program.id;

            const assignedIds = new Set(
              (program.program_courses || []).map(
                (item) => item.course_id
              )
            );

            const availableCourses = courses.filter(
              (course) => !assignedIds.has(course.id)
            );

            return (
              <div
                key={program.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Program header */}
                <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {program.name}
                      </h2>

                      <span className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                        {program.age_range}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                          program.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {program.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="max-w-2xl text-sm leading-6 text-slate-500">
                      {program.description}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      {program.program_courses?.length || 0} courses
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setExpandedProgram(expanded ? null : program.id)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Manage Courses
                      {expanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => deleteProgram(program.id)}
                      className="rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete program"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Courses */}
                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-6">

                    <div className="mb-6">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Add Existing Course
                      </label>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          assignCourse(program.id, e.target.value);
                          e.target.value = "";
                        }}
                        className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-400"
                      >
                        <option value="">
                          Select a course...
                        </option>

                        {availableCourses.map((course) => (
                          <option
                            key={course.id}
                            value={course.id}
                          >
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {program.program_courses?.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                        <BookOpen className="mx-auto mb-3 text-slate-300" />

                        <p className="font-semibold text-slate-700">
                          No courses assigned yet
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Select an existing course above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {program.program_courses.map((item, index) => {
                          const course = item.courses;

                          if (!course) return null;

                          return (
                            <div
                              key={item.id}
                              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                  <BookOpen size={19} />
                                </div>

                                <div>
                                  <p className="font-bold text-slate-900">
                                    {course.title}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {course.duration_lessons || 0} lessons
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  disabled={index === 0}
                                  onClick={() =>
                                    moveCourse(program, index, -1)
                                  }
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                                >
                                  <ChevronUp size={17} />
                                </button>

                                <button
                                  disabled={
                                    index ===
                                    program.program_courses.length - 1
                                  }
                                  onClick={() =>
                                    moveCourse(program, index, 1)
                                  }
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                                >
                                  <ChevronDown size={17} />
                                </button>

                                <button
                                  onClick={() => removeCourse(item.id)}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {programs.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Layers3 className="mx-auto mb-4 text-slate-300" size={35} />

            <h2 className="font-bold text-slate-800">
              No programs yet
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create your first learning program.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}