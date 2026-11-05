"use client";

import { useEffect, useState } from "react";

import {
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "../../../supabase"

const initialForm = {
  parent_name: "",
  feedback: "",
  source: "whatsapp",
  display_order: 0,
  is_featured: false,
  is_published: true,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTestimonials();
  }, []);

  async function loadTestimonials() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("testimonials")
      .select("*")
      .order("display_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTestimonials(data || []);
    }

    setLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!screenshot) {
      setError("Please select a screenshot.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const extension =
        screenshot.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const filePath = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonials")
        .upload(filePath, screenshot, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("testimonials")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("testimonials")
        .insert({
          ...form,
          parent_name: form.parent_name.trim() || null,
          feedback: form.feedback.trim() || null,
          display_order: Number(form.display_order) || 0,
          screenshot_url: publicUrlData.publicUrl,
        });

      if (insertError) {
        await supabase.storage
          .from("testimonials")
          .remove([filePath]);

        throw insertError;
      }

      setForm(initialForm);
      setScreenshot(null);

      const fileInput =
        document.getElementById("testimonial-screenshot");

      if (fileInput) {
        fileInput.value = "";
      }

      await loadTestimonials();
    } catch (submitError) {
      setError(
        submitError.message || "Failed to save testimonial."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(testimonial) {
    setError("");

    const { error: updateError } = await supabase
      .from("testimonials")
      .update({
        is_published: !testimonial.is_published,
      })
      .eq("id", testimonial.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadTestimonials();
  }

  async function deleteTestimonial(testimonial) {
    const confirmed = window.confirm(
      "Delete this testimonial permanently?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    const { error: deleteError } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", testimonial.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const marker = "/testimonials/";

    if (testimonial.screenshot_url?.includes(marker)) {
      const filePath =
        testimonial.screenshot_url.split(marker)[1];

      if (filePath) {
        await supabase.storage
          .from("testimonials")
          .remove([decodeURIComponent(filePath)]);
      }
    }

    await loadTestimonials();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-bold text-secondary">
            Website Content
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Testimonials
          </h1>

          <p className="mt-2 text-slate-600">
            Upload approved WhatsApp or email feedback for the
            website.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Upload form */}
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Plus className="h-5 w-5 text-secondary" />
              Add Testimonial
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Screenshot
                </label>

                <input
                  id="testimonial-screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) =>
                    setScreenshot(
                      event.target.files?.[0] || null
                    )
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Blur phone numbers and private information
                  before uploading.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Source
                </label>

                <select
                  value={form.source}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      source: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  <option value="whatsapp">
                    WhatsApp
                  </option>

                  <option value="email">
                    Email
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Parent name
                </label>

                <input
                  type="text"
                  value={form.parent_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      parent_name: event.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Short quote
                </label>

                <textarea
                  rows={4}
                  value={form.feedback}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      feedback: event.target.value,
                    })
                  }
                  placeholder="Optional supporting quote"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Display order
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      display_order: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_featured: event.target.checked,
                    })
                  }
                />

                Feature this testimonial
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_published: event.target.checked,
                    })
                  }
                />

                Publish immediately
              </label>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading
                  </>
                ) : (
                  "Add Testimonial"
                )}
              </button>
            </div>
          </form>

          {/* Existing testimonials */}
          <section>
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              Existing Testimonials
            </h2>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : testimonials.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                No testimonials have been uploaded.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {testimonials.map((testimonial) => (
                  <article
                    key={testimonial.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/5] bg-slate-100">
                      <img
                        src={testimonial.screenshot_url}
                        alt="Testimonial screenshot"
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-contain"
                      />
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                          {testimonial.source ===
                          "whatsapp" ? (
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Mail className="h-4 w-4 text-blue-600" />
                          )}

                          {testimonial.parent_name ||
                            "Verified Parent"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            testimonial.is_published
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {testimonial.is_published
                            ? "Published"
                            : "Hidden"}
                        </span>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            togglePublished(testimonial)
                          }
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {testimonial.is_published
                            ? "Hide"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteTestimonial(testimonial)
                          }
                          aria-label="Delete testimonial"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}