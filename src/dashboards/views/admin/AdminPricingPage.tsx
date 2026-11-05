"use client";

import { useEffect, useState } from "react";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "../../../supabase"

const initialForm = {
  name: "",
  slug: "",
  description: "",
  classes_per_week: 1,
  session_duration_minutes: 45,
  monthly_kes: "",
  monthly_usd: "",
  quarterly_kes: "",
  quarterly_usd: "",
  quarterly_discount: 5,
  yearly_kes: "",
  yearly_usd: "",
  yearly_discount: 10,
  features: "",
  is_popular: false,
  is_active: true,
  display_order: 0,
};

function formatPrice(value, currency = "KES") {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function planToForm(plan) {
  return {
    name: plan.name || "",
    slug: plan.slug || "",
    description: plan.description || "",
    classes_per_week: plan.classes_per_week || 1,
    session_duration_minutes:
      plan.session_duration_minutes || 45,
    monthly_kes: plan.monthly_kes ?? "",
    monthly_usd: plan.monthly_usd ?? "",
    quarterly_kes: plan.quarterly_kes ?? "",
    quarterly_usd: plan.quarterly_usd ?? "",
    quarterly_discount: plan.quarterly_discount ?? 5,
    yearly_kes: plan.yearly_kes ?? "",
    yearly_usd: plan.yearly_usd ?? "",
    yearly_discount: plan.yearly_discount ?? 10,
    features: Array.isArray(plan.features)
      ? plan.features.join("\n")
      : "",
    is_popular: Boolean(plan.is_popular),
    is_active: Boolean(plan.is_active),
    display_order: plan.display_order ?? 0,
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    slug: createSlug(form.slug || form.name),
    description: form.description.trim() || null,
    classes_per_week: Number(form.classes_per_week),
    session_duration_minutes: Number(
      form.session_duration_minutes
    ),
    monthly_kes: Number(form.monthly_kes),
    monthly_usd: Number(form.monthly_usd),
    quarterly_kes: Number(form.quarterly_kes),
    quarterly_usd: Number(form.quarterly_usd),
    quarterly_discount: Number(form.quarterly_discount),
    yearly_kes: Number(form.yearly_kes),
    yearly_usd: Number(form.yearly_usd),
    yearly_discount: Number(form.yearly_discount),
    features: form.features
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean),
    is_popular: Boolean(form.is_popular),
    is_active: Boolean(form.is_active),
    display_order: Number(form.display_order) || 0,
  };
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      />
    </div>
  );
}

export default function AdminPricingPage() {
  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [busyPlanId, setBusyPlanId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [editingPlan, setEditingPlan] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from("pricing_plans")
        .select("*")
        .order("display_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

      if (fetchError) {
        throw fetchError;
      }

      setPlans(data || []);
    } catch (fetchError) {
      setError(
        fetchError.message ||
          "Unable to load pricing plans."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingPlan(null);

    setForm({
      ...initialForm,
      display_order: plans.length + 1,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(plan) {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setEditingPlan(null);
    setForm(initialForm);
    setShowForm(false);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "name" && !editingPlan) {
        next.slug = createSlug(value);
      }

      return next;
    });
  }

  function calculateDiscountedPrices() {
    const monthlyKes = Number(form.monthly_kes);
    const monthlyUsd = Number(form.monthly_usd);

    const quarterlyDiscount = Number(
      form.quarterly_discount
    );

    const yearlyDiscount = Number(form.yearly_discount);

    if (
      !Number.isFinite(monthlyKes) ||
      !Number.isFinite(monthlyUsd) ||
      monthlyKes < 0 ||
      monthlyUsd < 0
    ) {
      setError(
        "Enter valid monthly KES and USD prices first."
      );

      return;
    }

    if (
      quarterlyDiscount < 0 ||
      quarterlyDiscount > 100 ||
      yearlyDiscount < 0 ||
      yearlyDiscount > 100
    ) {
      setError("Discounts must be between 0% and 100%.");

      return;
    }

    setForm((current) => ({
      ...current,

      quarterly_kes: Math.round(
        monthlyKes *
          3 *
          (1 - quarterlyDiscount / 100)
      ),

      quarterly_usd: Math.round(
        monthlyUsd *
          3 *
          (1 - quarterlyDiscount / 100)
      ),

      yearly_kes: Math.round(
        monthlyKes * 12 * (1 - yearlyDiscount / 100)
      ),

      yearly_usd: Math.round(
        monthlyUsd * 12 * (1 - yearlyDiscount / 100)
      ),
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildPayload(form);

      if (!payload.name || !payload.slug) {
        throw new Error(
          "Plan name and slug are required."
        );
      }

      if (
        payload.is_active &&
        payload.is_popular
      ) {
        const anotherPopularPlan = plans.find(
          (plan) =>
            plan.id !== editingPlan?.id &&
            plan.is_active &&
            plan.is_popular
        );

        if (anotherPopularPlan) {
          throw new Error(
            `${anotherPopularPlan.name} is already marked as Most Popular. Remove that label first.`
          );
        }
      }

      let request;

      if (editingPlan) {
        request = await supabase
          .from("pricing_plans")
          .update(payload)
          .eq("id", editingPlan.id)
          .select()
          .single();
      } else {
        request = await supabase
          .from("pricing_plans")
          .insert(payload)
          .select()
          .single();
      }

      if (request.error) {
        throw request.error;
      }

      setSuccess(
        editingPlan
          ? `${payload.name} was updated successfully.`
          : `${payload.name} was created successfully.`
      );

      setShowForm(false);
      setEditingPlan(null);
      setForm(initialForm);

      await loadPlans();
    } catch (submitError) {
      setError(
        submitError.message ||
          "Unable to save pricing plan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan) {
    setBusyPlanId(plan.id);
    setError("");
    setSuccess("");

    try {
      const nextActive = !plan.is_active;

      if (nextActive && plan.is_popular) {
        const anotherPopularPlan = plans.find(
          (item) =>
            item.id !== plan.id &&
            item.is_active &&
            item.is_popular
        );

        if (anotherPopularPlan) {
          throw new Error(
            `${anotherPopularPlan.name} is already the active Most Popular plan. Edit one of the plans before publishing this one.`
          );
        }
      }

      const { error: updateError } = await supabase
        .from("pricing_plans")
        .update({
          is_active: nextActive,
        })
        .eq("id", plan.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        nextActive
          ? `${plan.name} is now visible on the website.`
          : `${plan.name} has been hidden from the website.`
      );

      await loadPlans();
    } catch (updateError) {
      setError(
        updateError.message ||
          "Unable to update plan visibility."
      );
    } finally {
      setBusyPlanId(null);
    }
  }

  async function deletePlan(plan) {
    const confirmed = window.confirm(
      `Delete the ${plan.name} plan permanently? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setBusyPlanId(plan.id);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("pricing_plans")
        .delete()
        .eq("id", plan.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        `${plan.name} was deleted successfully.`
      );

      await loadPlans();
    } catch (deleteError) {
      setError(
        deleteError.message ||
          "Unable to delete pricing plan."
      );
    } finally {
      setBusyPlanId(null);
    }
  }

  const activePlans = plans.filter(
    (plan) => plan.is_active
  ).length;

  const popularPlan = plans.find(
    (plan) => plan.is_active && plan.is_popular
  );

  return (
    <div className="min-h-screen bg-slate-50 p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-pink-500">
              Website Management
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Pricing Plans
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Manage subscriptions, prices, discounts,
              features and public availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadPlans}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />

              Add Plan
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />

            {success}
          </div>
        )}

        {/* Overview */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Plans
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {plans.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Published Plans
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-600">
              {activePlans}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Most Popular
            </p>

            <p className="mt-2 text-2xl font-black text-purple-600">
              {popularPlan?.name || "Not selected"}
            </p>
          </div>
        </div>

        {/* Existing plans */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-lg font-bold text-slate-800">
                No pricing plans yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create your first plan to display it on the
                website.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />

                Add Your First Plan
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black text-slate-900">
                            {plan.name}
                          </h2>

                          {plan.is_popular && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-600">
                              <Sparkles className="h-3 w-3" />

                              Most Popular
                            </span>
                          )}

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              plan.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {plan.is_active
                              ? "Published"
                              : "Hidden"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {plan.classes_per_week}{" "}
                          {plan.classes_per_week === 1
                            ? "class"
                            : "classes"}{" "}
                          per week ·{" "}
                          {plan.session_duration_minutes}{" "}
                          minutes each
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-slate-400">
                        Order: {plan.display_order}
                      </p>
                    </div>

                    {plan.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing summary */}
                  <div className="grid grid-cols-3 gap-3 border-b border-slate-100 p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Monthly
                      </p>

                      <p className="mt-2 text-sm font-bold text-purple-700">
                        {formatPrice(plan.monthly_kes)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatPrice(
                          plan.monthly_usd,
                          "USD"
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Quarterly
                      </p>

                      <p className="mt-2 text-sm font-bold text-purple-700">
                        {formatPrice(plan.quarterly_kes)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {plan.quarterly_discount}% discount
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Yearly
                      </p>

                      <p className="mt-2 text-sm font-bold text-purple-700">
                        {formatPrice(plan.yearly_kes)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {plan.yearly_discount}% discount
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Included Features
                    </p>

                    <ul className="mt-3 space-y-2">
                      {(plan.features || [])
                        .slice(0, 4)
                        .map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                            {feature}
                          </li>
                        ))}

                      {(plan.features || []).length > 4 && (
                        <li className="text-xs font-semibold text-purple-600">
                          +
                          {plan.features.length - 4} more
                          features
                        </li>
                      )}
                    </ul>

                    {/* Actions */}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(plan)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-200 hover:bg-purple-50"
                      >
                        <Pencil className="h-4 w-4" />

                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyPlanId === plan.id
                        }
                        onClick={() =>
                          toggleActive(plan)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {busyPlanId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : plan.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}

                        {plan.is_active
                          ? "Hide"
                          : "Publish"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyPlanId === plan.id
                        }
                        onClick={() =>
                          deletePlan(plan)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />

                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-plan-form-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-500">
                  Pricing Management
                </p>

                <h2
                  id="pricing-plan-form-title"
                  className="mt-1 text-xl font-black text-slate-900"
                >
                  {editingPlan
                    ? `Edit ${editingPlan.name}`
                    : "Add Pricing Plan"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-8 p-6 sm:p-8"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Plan information */}
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Plan Information
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Plan Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Pro"
                    required
                  />

                  <InputField
                    label="URL Slug"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="e.g. pro"
                    required
                  />

                  <InputField
                    label="Classes Per Week"
                    name="classes_per_week"
                    type="number"
                    value={form.classes_per_week}
                    onChange={handleChange}
                    min={1}
                    required
                  />

                  <InputField
                    label="Session Duration (minutes)"
                    name="session_duration_minutes"
                    type="number"
                    value={
                      form.session_duration_minutes
                    }
                    onChange={handleChange}
                    min={1}
                    required
                  />

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Description
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={form.description}
                      onChange={handleChange}
                      placeholder="A short description of this plan."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </section>

              {/* Monthly prices */}
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Monthly Pricing
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Monthly Price (KES)"
                    name="monthly_kes"
                    type="number"
                    value={form.monthly_kes}
                    onChange={handleChange}
                    min={0}
                    placeholder="10000"
                    required
                  />

                  <InputField
                    label="Monthly Price (USD)"
                    name="monthly_usd"
                    type="number"
                    value={form.monthly_usd}
                    onChange={handleChange}
                    min={0}
                    placeholder="75"
                    required
                  />
                </div>
              </section>

              {/* Discounts */}
              <section>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h3 className="text-base font-bold text-slate-900">
                    Discounts
                  </h3>

                  <button
                    type="button"
                    onClick={
                      calculateDiscountedPrices
                    }
                    className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-700"
                  >
                    <RefreshCw className="h-4 w-4" />

                    Calculate discounted prices
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Quarterly Discount (%)"
                    name="quarterly_discount"
                    type="number"
                    value={form.quarterly_discount}
                    onChange={handleChange}
                    min={0}
                    max={100}
                    required
                  />

                  <InputField
                    label="Yearly Discount (%)"
                    name="yearly_discount"
                    type="number"
                    value={form.yearly_discount}
                    onChange={handleChange}
                    min={0}
                    max={100}
                    required
                  />
                </div>
              </section>

              {/* Quarterly prices */}
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Quarterly Pricing
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Quarterly Price (KES)"
                    name="quarterly_kes"
                    type="number"
                    value={form.quarterly_kes}
                    onChange={handleChange}
                    min={0}
                    required
                  />

                  <InputField
                    label="Quarterly Price (USD)"
                    name="quarterly_usd"
                    type="number"
                    value={form.quarterly_usd}
                    onChange={handleChange}
                    min={0}
                    required
                  />
                </div>
              </section>

              {/* Yearly prices */}
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Yearly Pricing
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Yearly Price (KES)"
                    name="yearly_kes"
                    type="number"
                    value={form.yearly_kes}
                    onChange={handleChange}
                    min={0}
                    required
                  />

                  <InputField
                    label="Yearly Price (USD)"
                    name="yearly_usd"
                    type="number"
                    value={form.yearly_usd}
                    onChange={handleChange}
                    min={0}
                    required
                  />
                </div>
              </section>

              {/* Features */}
              <section>
                <label
                  htmlFor="features"
                  className="block text-base font-bold text-slate-900"
                >
                  Included Features
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  Write one feature per line.
                </p>

                <textarea
                  id="features"
                  name="features"
                  rows={6}
                  value={form.features}
                  onChange={handleChange}
                  placeholder={
                    "2 personalized live classes each week\n45-minute learning sessions\nGuided projects and assignments"
                  }
                  className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                />
              </section>

              {/* Display options */}
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Display Settings
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Display Order"
                    name="display_order"
                    type="number"
                    value={form.display_order}
                    onChange={handleChange}
                    min={0}
                  />

                  <div className="space-y-4 pt-2 sm:pt-8">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={form.is_active}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 accent-purple-600"
                      />

                      Show on public website
                    </label>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="is_popular"
                        checked={form.is_popular}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 accent-pink-500"
                      />

                      Mark as Most Popular
                    </label>
                  </div>
                </div>
              </section>

              {/* Form actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />

                      {editingPlan
                        ? "Update Plan"
                        : "Create Plan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}