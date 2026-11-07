'use client'

import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Loader2,
  X,
  Upload,
  Eye,
  EyeOff,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { isAdminRole } from '../../../types/roles'
import type { Tables } from '../../../types/database'
import { getErrorMessage } from '../../../lib/getErrorMessage'

type ShopProduct = Tables<'shop_products'>

interface ShopProductForm {
  name: string
  slug: string
  category: string
  program: string
  short_description: string
  description: string
  price: number | string
  compare_at_price: number | string
  currency: string
  badge: string
  stock_quantity: number | string
  is_featured: boolean
  is_active: boolean
  display_order: number | string
  image_url: string
}

const productCategories = [
  'Books',
  'Learning Kits',
  'Games & Activities',
  'Stationery & Tech Gear',
  'Merchandise',
]

const emptyForm: ShopProductForm = {
  name: '',
  slug: '',
  category: '',
  program: 'general',
  short_description: '',
  description: '',
  price: '',
  compare_at_price: '',
  currency: 'KES',
  badge: '',
  stock_quantity: 0,
  is_featured: false,
  is_active: true,
  display_order: 0,
  image_url: '',
}

const PROGRAM_LABELS: Record<string, string> = {
  'junior-coders': 'Junior Coders',
  'future-developers': 'Future Developers',
  'tech-professionals': 'Tech Professionals',
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatPrice(product: ShopProduct) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: product.currency || 'KES',
    maximumFractionDigits: 0,
  }).format(product.price)
}

function formatProgram(program: string | null) {
  return (program && PROGRAM_LABELS[program]) || 'General'
}

async function loadProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
  }

  return data || []
}

/** Where to send someone who can't manage the shop, or `null` if they can. */
async function getShopRedirect(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return '/login'

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile && isAdminRole(profile.role) ? null : '/'
}

export default function AdminShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [form, setForm] = useState<ShopProductForm>(emptyForm)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function initialise() {
      const redirect = await getShopRedirect()
      if (cancelled) return

      if (redirect) {
        window.location.assign(redirect)
        return
      }

      const rows = await loadProducts()
      if (cancelled) return
      setProducts(rows)
      setLoading(false)
    }

    void initialise()

    return () => {
      cancelled = true
    }
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setProducts(await loadProducts())
    setLoading(false)
  }

  function handleNameChange(value: string) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: editingId && previous.slug ? previous.slug : generateSlug(value),
    }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(product: ShopProduct) {
    setEditingId(product.id)

    setForm({
      name: product.name || '',
      slug: product.slug || '',
      category: product.category || '',
      program: product.program || 'general',
      short_description: product.short_description || '',
      description: product.description || '',
      price: product.price || '',
      compare_at_price: product.compare_at_price || '',
      currency: product.currency || 'KES',
      badge: product.badge || '',
      stock_quantity: product.stock_quantity ?? 0,
      is_featured: product.is_featured ?? false,
      is_active: product.is_active ?? true,
      display_order: product.display_order ?? 0,
      image_url: product.image_url || '',
    })

    setModalOpen(true)
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return

    try {
      setUploading(true)

      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be smaller than 5MB.')
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

      const fileName = `${crypto.randomUUID()}.${extension}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('shop-products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('shop-products')
        .getPublicUrl(filePath)

      if (!data?.publicUrl) {
        throw new Error('Could not get image URL.')
      }

      setForm((previous) => ({
        ...previous,
        image_url: data.publicUrl,
      }))
    } catch (error) {
      console.error('Product image upload failed:', error)

      alert(getErrorMessage(error, 'Image upload failed. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name || !form.category || !form.price) {
      alert('Name, category and price are required.')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),

      slug: form.slug.trim() || generateSlug(form.name),

      category: form.category.trim(),

      program: form.program || 'general',

      short_description: form.short_description.trim() || null,

      description: form.description.trim() || null,

      price: Number(form.price),

      compare_at_price: form.compare_at_price
        ? Number(form.compare_at_price)
        : null,

      currency: form.currency || 'KES',

      badge: form.badge.trim() || null,

      stock_quantity: Number(form.stock_quantity) || 0,

      is_featured: form.is_featured,

      is_active: form.is_active,

      display_order: Number(form.display_order) || 0,

      image_url: form.image_url || null,
    }

    let result

    if (editingId) {
      result = await supabase
        .from('shop_products')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase.from('shop_products').insert(payload)
    }

    if (result.error) {
      alert(result.error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)

    await fetchProducts()
  }

  async function toggleActive(product: ShopProduct) {
    const { error } = await supabase
      .from('shop_products')
      .update({
        is_active: !product.is_active,
      })
      .eq('id', product.id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProducts()
  }

  async function deleteProduct(product: ShopProduct) {
    const confirmed = window.confirm(`Delete "${product.name}"?`)

    if (!confirmed) return

    const { error } = await supabase
      .from('shop_products')
      .delete()
      .eq('id', product.id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProducts()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-secondary">
              Tech Talk Hub
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Shop Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage products, programs, prices, stock and visibility.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard title="Total Products" value={products.length} />

          <StatCard
            title="Active Products"
            value={products.filter((product) => product.is_active).length}
          />

          <StatCard
            title="Featured"
            value={products.filter((product) => product.is_featured).length}
          />
        </div>

        {/* Product List */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Package className="h-10 w-10 text-slate-300" />

              <h2 className="mt-4 font-bold text-slate-800">No products yet</h2>

              <button
                onClick={openCreate}
                className="mt-4 text-sm font-semibold text-primary"
              >
                Add your first product →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  {/* Image */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}

                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {product.name}
                      </h3>

                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">
                        {formatProgram(product.program)}
                      </span>

                      {!product.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">
                          Hidden
                        </span>
                      )}

                      {product.is_featured && (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-bold text-primary uppercase">
                          Featured
                        </span>
                      )}

                      {product.badge && (
                        <span className="rounded-full bg-pink-100 px-2 py-1 text-[10px] font-bold text-secondary uppercase">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {product.category} • {formatPrice(product)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Stock: {product.stock_quantity}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={
                        product.is_active ? 'Hide product' : 'Show product'
                      }
                      onClick={() => void toggleActive(product)}
                      title={
                        product.is_active ? 'Hide product' : 'Show product'
                      }
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-100"
                    >
                      {product.is_active ? (
                        <Eye size={17} />
                      ) : (
                        <EyeOff size={17} />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => openEdit(product)}
                      className="rounded-xl border border-slate-200 p-2.5 text-primary transition hover:bg-purple-50"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => void deleteProduct(product)}
                      className="rounded-xl border border-red-100 p-2.5 text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          PRODUCT MODAL
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {editingId ? 'Edit Product' : 'Add Product'}
                </h2>

                <p className="text-sm text-slate-500">
                  Product information and availability
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-6 p-6"
            >
              {/* Image */}
              <div>
                <p className="mb-2 block text-sm font-semibold text-slate-700">
                  Product Image
                </p>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-slate-100">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt="Product"

                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    {uploading ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Upload size={17} />
                    )}
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) =>
                        void uploadImage(event.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <Field label="Product Name">
                <input
                  required
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className={inputClass}
                  placeholder="e.g. My First Coding Activity Book"
                />
              </Field>

              {/* Program + Category */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Program">
                  <select
                    value={form.program}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        program: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="general">General</option>

                    <option value="junior-coders">Junior Coders</option>

                    <option value="future-developers">Future Developers</option>

                    <option value="tech-professionals">
                      Tech Professionals
                    </option>
                  </select>
                </Field>

                <Field label="Category">
                  <select
                    required
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Select category</option>

                    {productCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Slug */}
              <Field label="Slug">
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      slug: event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="my-first-coding-book"
                />
              </Field>

              {/* Short Description */}
              <Field label="Short Description">
                <input
                  value={form.short_description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      short_description: event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Short description shown on product cards"
                />
              </Field>

              {/* Description */}
              <Field label="Full Description">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Full product description..."
                />
              </Field>

              {/* Pricing */}
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Price">
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        price: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="1500"
                  />
                </Field>

                <Field label="Old Price">
                  <input
                    type="number"
                    min="0"
                    value={form.compare_at_price}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        compare_at_price: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="1800"
                  />
                </Field>

                <Field label="Currency">
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        currency: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="KES">KES</option>

                    <option value="USD">USD</option>

                    <option value="UGX">UGX</option>

                    <option value="TZS">TZS</option>
                  </select>
                </Field>
              </div>

              {/* Stock / Badge / Order */}
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        stock_quantity: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Badge">
                  <input
                    placeholder="Best Seller"
                    value={form.badge}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        badge: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Display Order">
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        display_order: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 rounded-2xl bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        is_active: event.target.checked,
                      })
                    }
                  />
                  Active
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
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
                  Featured
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  disabled={saving || uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}

                  {editingId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-hidden transition focus:border-primary focus:ring-4 focus:ring-primary/10'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <p className="text-sm text-slate-500">{title}</p>

      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}
