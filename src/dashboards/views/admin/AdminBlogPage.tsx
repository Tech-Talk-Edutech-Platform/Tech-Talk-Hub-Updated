import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

import {
  ArrowLeft,
  Bold,
  Calendar,
  Edit3,
  Eye,
  FileImage,
  FileText,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Quote,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import BlogArticlePreview from './BlogArticlePreview'
import { supabase } from '../../../supabase'
import type { TablesInsert } from '../../../types/database'
import { isAdminRole } from '../../../types/roles'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const BLOG_CATEGORIES = [
  'Coding for Kids',
  'Parent Guides',
  'Student Stories',
  'Education',
  'Technology',
  'Learning Tips',
]

const emptyForm = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  category: '',
  content: '',
  cover_image_url: '',
  status: 'draft',
  published_at: null,
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  content: string
  cover_image_url: string | null
  status: string
  published_at: string | null
  created_at?: string | null
  updated_at?: string | null
  author_id?: string | null
}

interface BlogForm {
  id: string | null
  title: string
  slug: string
  excerpt: string
  category: string
  content: string
  cover_image_url: string
  status: string
  published_at: string | null
}

interface AlertMessage {
  type: 'error' | 'success'
  text: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function createSlug(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not published'
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function countWords(value = '') {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function getReadingTime(value = '') {
  return Math.max(1, Math.ceil(countWords(value) / 220))
}

function ToolbarButton({
  title,
  onClick,
  children,
  disabled = false,
}: {
  title: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-2 text-gray-600 transition hover:bg-white hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function MessageAlert({ message }: { message: AlertMessage | null }) {
  if (!message) {
    return null
  }

  return (
    <div
      className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
        message.type === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-green-200 bg-green-50 text-green-700'
      }`}
    >
      {message.text}
    </div>
  )
}

export default function AdminBlogPage({
  userId,
  role,
}: {
  userId: string | null
  role: string
}) {
  const contentRef = useRef<HTMLTextAreaElement | null>(null)

  const [posts, setPosts] = useState<BlogPost[]>([])

  const [form, setForm] = useState<BlogForm>(emptyForm)

  const [view, setView] = useState('list')

  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [uploadingCover, setUploadingCover] = useState(false)

  const [uploadingArticleImage, setUploadingArticleImage] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [message, setMessage] = useState<AlertMessage | null>(null)

  const [showPreview, setShowPreview] = useState(false)

  const isAdmin = isAdminRole(role)

  const isUploading = uploadingCover || uploadingArticleImage

  const loadPosts = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        throw error
      }

      setPosts(data || [])

      return true
    } catch (error) {
      setMessage({
        type: 'error',

        text: getErrorMessage(error) || 'Unable to load articles.',
      })

      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadPosts()
    } else {
      setLoading(false)
    }
  }, [isAdmin, loadPosts])

  function updateField(name: keyof BlogForm, value: string) {
    setForm((current) => ({
      ...current,

      [name]: value,
    }))
  }

  function handleTitleChange(value: string) {
    setForm((current) => {
      const previousAutomaticSlug = createSlug(current.title)

      const shouldUpdateSlug =
        !current.slug || current.slug === previousAutomaticSlug

      return {
        ...current,

        title: value,

        slug: shouldUpdateSlug ? createSlug(value) : current.slug,
      }
    })
  }

  function startCreating() {
    setForm({
      ...emptyForm,
    })

    setMessage(null)

    setView('editor')
  }

  function startEditing(post: BlogPost) {
    setForm({
      ...emptyForm,

      ...post,

      title: post.title || '',

      slug: post.slug || '',

      excerpt: post.excerpt || '',

      category: post.category || '',

      content: post.content || '',

      cover_image_url: post.cover_image_url || '',
    })

    setMessage(null)

    setView('editor')
  }

  function returnToList() {
    setForm({
      ...emptyForm,
    })

    setMessage(null)

    setView('list')
  }

  function validateImage(file: File | null) {
    if (!file) {
      return 'Please choose an image.'
    }

    if (!file.type.startsWith('image/')) {
      return 'Please choose a valid image file.'
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return 'Images must be smaller than 5 MB.'
    }

    if (!userId) {
      return 'Your user account could not be identified. Please sign in again.'
    }

    return null
  }

  async function uploadImageToStorage(file: File, folder: string) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const fileName =
      `${userId}/${folder}/` +
      `${Date.now()}-${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from('blog-covers')
      .upload(fileName, file, {
        cacheControl: '3600',

        upsert: false,

        contentType: file.type,
      })

    if (error) {
      throw error
    }

    const { data } = supabase.storage.from('blog-covers').getPublicUrl(fileName)

    if (!data?.publicUrl) {
      throw new Error('Could not generate an image URL.')
    }

    return data.publicUrl
  }

  async function uploadCoverImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target

    const file = input.files?.[0]

    if (!file) {
      return
    }

    const validationError = validateImage(file)

    if (validationError) {
      setMessage({
        type: 'error',

        text: validationError,
      })

      input.value = ''

      return
    }

    setUploadingCover(true)

    setMessage(null)

    try {
      const publicUrl = await uploadImageToStorage(file, 'covers')

      updateField('cover_image_url', publicUrl)

      setMessage({
        type: 'success',

        text: 'Cover image uploaded successfully.',
      })
    } catch (error) {
      setMessage({
        type: 'error',

        text: getErrorMessage(error) || 'Unable to upload the cover image.',
      })
    } finally {
      setUploadingCover(false)

      input.value = ''
    }
  }

  function removeCoverImage() {
    updateField('cover_image_url', '')

    setMessage({
      type: 'success',

      text: 'Cover image removed from the article.',
    })
  }

  function insertMarkdown(before: string, after = '', placeholder = '') {
    const textarea = contentRef.current

    if (!textarea) {
      return
    }

    const start = textarea.selectionStart

    const end = textarea.selectionEnd

    const selectedText = form.content.slice(start, end)

    const insertedText = selectedText || placeholder

    const replacement = `${before}${insertedText}${after}`

    const nextContent =
      form.content.slice(0, start) + replacement + form.content.slice(end)

    updateField('content', nextContent)

    requestAnimationFrame(() => {
      textarea.focus()

      const selectionStart = start + before.length

      const selectionEnd = selectionStart + insertedText.length

      textarea.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  function insertBlock(prefix: string, placeholder = '') {
    const textarea = contentRef.current

    if (!textarea) {
      return
    }

    const start = textarea.selectionStart

    const end = textarea.selectionEnd

    const selectedText = form.content.slice(start, end) || placeholder

    const lines = selectedText.split('\n')

    const formattedText = lines
      .map((line, index) => {
        if (prefix === '1. ') {
          return `${index + 1}. ${line}`
        }

        return `${prefix}${line}`
      })
      .join('\n')

    const beforeContent = form.content.slice(0, start)

    const afterContent = form.content.slice(end)

    const leadingBreak =
      beforeContent && !beforeContent.endsWith('\n') ? '\n\n' : ''

    const trailingBreak =
      afterContent && !afterContent.startsWith('\n') ? '\n\n' : ''

    const nextContent =
      beforeContent +
      leadingBreak +
      formattedText +
      trailingBreak +
      afterContent

    updateField('content', nextContent)

    requestAnimationFrame(() => {
      textarea.focus()

      const cursorPosition =
        beforeContent.length + leadingBreak.length + formattedText.length

      textarea.setSelectionRange(cursorPosition, cursorPosition)
    })
  }

  async function uploadArticleImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target

    const file = input.files?.[0]

    if (!file) {
      return
    }

    const validationError = validateImage(file)

    if (validationError) {
      setMessage({
        type: 'error',

        text: validationError,
      })

      input.value = ''

      return
    }

    const textarea = contentRef.current

    const cursorPosition = textarea?.selectionStart ?? form.content.length

    setUploadingArticleImage(true)

    setMessage(null)

    try {
      const publicUrl = await uploadImageToStorage(file, 'article-images')

      const imageDescription = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/[[\]]/g, '')
        .trim()

      const imageMarkdown = `\n\n![${imageDescription}]` + `(${publicUrl})\n\n`

      setForm((current) => ({
        ...current,

        content:
          current.content.slice(0, cursorPosition) +
          imageMarkdown +
          current.content.slice(cursorPosition),
      }))

      setMessage({
        type: 'success',

        text: 'Article image inserted successfully.',
      })

      requestAnimationFrame(() => {
        if (!textarea) {
          return
        }

        textarea.focus()

        const nextCursor = cursorPosition + imageMarkdown.length

        textarea.setSelectionRange(nextCursor, nextCursor)
      })
    } catch (error) {
      setMessage({
        type: 'error',

        text: getErrorMessage(error) || 'Unable to upload the article image.',
      })
    } finally {
      setUploadingArticleImage(false)

      input.value = ''
    }
  }

  async function publishFromPreview() {
    await savePost('published')

    setShowPreview(false)
  }

  async function savePost(status: string) {
    const title = form.title.trim()

    const slug = createSlug(form.slug || form.title)

    const content = form.content.trim()

    if (!userId) {
      setMessage({
        type: 'error',

        text: 'Your user account could not be identified. Please sign in again.',
      })

      return
    }

    if (!title || !slug || !content) {
      setMessage({
        type: 'error',

        text: 'Title, slug and article content are required.',
      })

      return
    }

    if (isUploading) {
      setMessage({
        type: 'error',

        text: 'Please wait for image uploads to finish.',
      })

      return
    }

    setSaving(true)

    setMessage(null)

    const publishedAt =
      status === 'published'
        ? form.published_at || new Date().toISOString()
        : null

    const payload: TablesInsert<'blog_posts'> = {
      title,

      slug,

      excerpt: form.excerpt.trim() || null,

      category: form.category.trim() || null,

      content,

      cover_image_url: form.cover_image_url.trim() || null,

      status,

      published_at: publishedAt,

      updated_at: new Date().toISOString(),
    }

    if (!form.id) {
      payload.author_id = userId
    }

    try {
      let result

      if (form.id) {
        result = await supabase
          .from('blog_posts')
          .update(payload)
          .eq('id', form.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('blog_posts')
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      await loadPosts()

      setForm({
        ...emptyForm,

        ...result.data,
      })

      setView('list')

      setMessage({
        type: 'success',

        text:
          status === 'published'
            ? 'Article published successfully.'
            : 'Draft saved successfully.',
      })
    } catch (error) {
      setMessage({
        type: 'error',

        text:
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === '23505'
            ? 'That slug is already being used.'
            : getErrorMessage(error) || 'Unable to save the article.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(post: BlogPost) {
    const confirmed = window.confirm(
      `Delete “${post.title}”? This cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setDeletingId(post.id)

    setMessage(null)

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', post.id)

      if (error) {
        throw error
      }

      setPosts((current) => current.filter((item) => item.id !== post.id))

      setMessage({
        type: 'success',

        text: 'Article deleted.',
      })
    } catch (error) {
      setMessage({
        type: 'error',

        text: getErrorMessage(error) || 'Unable to delete the article.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPosts = posts.filter((post) => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return true
    }

    return (
      post.title?.toLowerCase().includes(value) ||
      post.category?.toLowerCase().includes(value) ||
      post.status?.toLowerCase().includes(value)
    )
  })

  const wordCount = countWords(form.content)

  const readingTime = getReadingTime(form.content)

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          You do not have permission to manage blog posts.
        </div>
      </div>
    )
  }

  if (view === 'editor') {
    return (
      <div className="min-h-screen p-5 sm:p-8">
        {showPreview && (
          <BlogArticlePreview
            article={form}
            onClose={() => setShowPreview(false)}
            onPublish={publishFromPreview}
            publishing={saving}
          />
        )}
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={returnToList}
            disabled={saving}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-purple-600 disabled:opacity-50"
          >
            <ArrowLeft size={17} />
            Back to articles
          </button>

          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
                Blog Management
              </p>

              <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
                {form.id ? 'Edit Article' : 'Create Article'}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Write, format and publish engaging articles.
              </p>
            </div>

            {/*<div className="flex flex-wrap gap-3">*/}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving || isUploading}
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye size={17} />
                Preview
              </button>
              <button
                type="button"
                disabled={saving || isUploading}
                onClick={() => savePost('draft')}
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Save Draft
              </button>

              <button
                type="button"
                disabled={saving || isUploading}
                onClick={() => savePost('published')}
                className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}

                {form.status === 'published' ? 'Update Article' : 'Publish'}
              </button>
            </div>
          </div>

          <MessageAlert message={message} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5 sm:p-8">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Article title
                </label>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Coding for Kids: A Parent’s Guide to Getting Started"
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 outline-hidden transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Slug</label>

                <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10 dark:border-white/10">
                  <span className="hidden items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 dark:border-white/10 dark:bg-white/5 sm:flex">
                    blog/
                  </span>

                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      updateField(
                        'slug',

                        createSlug(event.target.value),
                      )
                    }
                    placeholder="coding-for-kids"
                    className="w-full bg-transparent px-4 py-3 text-sm outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-bold">
                    Short excerpt
                  </label>

                  <span className="text-xs text-gray-400">
                    {form.excerpt.length}
                    /180
                  </span>
                </div>

                <textarea
                  rows={3}
                  maxLength={180}
                  value={form.excerpt}
                  onChange={(event) =>
                    updateField(
                      'excerpt',

                      event.target.value,
                    )
                  }
                  placeholder="A short description displayed on the blog page and search results."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-transparent px-4 py-3 outline-hidden transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-white/10"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-bold">
                    Article content
                  </label>

                  <span className="text-xs text-gray-400">
                    Markdown supported
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <ToolbarButton
                      title="Section heading"
                      onClick={() =>
                        insertBlock(
                          '## ',

                          'Section heading',
                        )
                      }
                    >
                      <Heading2 size={18} />
                    </ToolbarButton>

                    <ToolbarButton
                      title="Subheading"
                      onClick={() =>
                        insertBlock(
                          '### ',

                          'Subheading',
                        )
                      }
                    >
                      <Heading3 size={18} />
                    </ToolbarButton>

                    <span className="mx-1 h-6 w-px bg-gray-200 dark:bg-white/10" />

                    <ToolbarButton
                      title="Bold"
                      onClick={() =>
                        insertMarkdown(
                          '**',

                          '**',

                          'Important text',
                        )
                      }
                    >
                      <Bold size={18} />
                    </ToolbarButton>

                    <ToolbarButton
                      title="Italic"
                      onClick={() =>
                        insertMarkdown(
                          '*',

                          '*',

                          'Emphasized text',
                        )
                      }
                    >
                      <Italic size={18} />
                    </ToolbarButton>

                    <span className="mx-1 h-6 w-px bg-gray-200 dark:bg-white/10" />

                    <ToolbarButton
                      title="Bullet list"
                      onClick={() =>
                        insertBlock(
                          '- ',

                          'List item',
                        )
                      }
                    >
                      <List size={18} />
                    </ToolbarButton>

                    <ToolbarButton
                      title="Numbered list"
                      onClick={() =>
                        insertBlock(
                          '1. ',

                          'List item',
                        )
                      }
                    >
                      <ListOrdered size={18} />
                    </ToolbarButton>

                    <ToolbarButton
                      title="Quote"
                      onClick={() =>
                        insertBlock(
                          '> ',

                          'Add an important quote',
                        )
                      }
                    >
                      <Quote size={18} />
                    </ToolbarButton>

                    <ToolbarButton
                      title="Insert link"
                      onClick={() =>
                        insertMarkdown(
                          '[',

                          '](https://techtalk-hub.com)',

                          'Link text',
                        )
                      }
                    >
                      <Link2 size={18} />
                    </ToolbarButton>

                    <span className="mx-1 h-6 w-px bg-gray-200 dark:bg-white/10" />

                    <label
                      title="Upload article image"
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                        uploadingArticleImage
                          ? 'pointer-events-none text-gray-400'
                          : 'cursor-pointer text-purple-600 hover:bg-purple-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {uploadingArticleImage ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <ImagePlus size={18} />
                      )}

                      <span className="hidden sm:inline">
                        {uploadingArticleImage ? 'Uploading...' : 'Add Image'}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingArticleImage}
                        onChange={uploadArticleImage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <textarea
                    ref={contentRef}
                    rows={24}
                    value={form.content}
                    onChange={(event) =>
                      updateField(
                        'content',

                        event.target.value,
                      )
                    }
                    placeholder={`Start writing your article...

## What Is Coding for Kids?

Write your introduction here.

### Ages 5–8: Learning Through Play

- How computers follow instructions
- Sequences and patterns
- Basic problem-solving

**Important information**

> Highlight an important idea.

Use the Add Image button to insert pictures between sections.`}
                    className="min-h-[560px] w-full resize-y bg-transparent px-5 py-5 text-sm leading-8 outline-hidden sm:text-base"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
                  <p>
                    Add headings, lists, quotes, links and images using the
                    toolbar.
                  </p>

                  <span>
                    {wordCount} words · {readingTime} min read
                  </span>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5">
                <label className="mb-2 block text-sm font-bold">Category</label>

                <input
                  type="text"
                  list="blog-categories"
                  value={form.category}
                  onChange={(event) =>
                    updateField(
                      'category',

                      event.target.value,
                    )
                  }
                  placeholder="Parent Guides"
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 outline-hidden transition focus:border-purple-500 dark:border-white/10"
                />

                <datalist id="blog-categories">
                  {BLOG_CATEGORIES.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>

                <p className="mt-2 text-xs text-gray-400">
                  Choose an existing category or create a new one.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold">Cover image</p>

                  {form.cover_image_url && (
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      title="Remove cover image"
                      className="rounded-lg p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                {form.cover_image_url ? (
                  <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-purple-50 dark:border-white/10">
                    <img
                      src={form.cover_image_url}
                      alt="Article cover preview"
                      className="aspect-video w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-purple-50 text-purple-300">
                    <FileImage size={35} />

                    <span className="text-xs font-medium">No cover image</span>
                  </div>
                )}

                <label
                  className={`flex items-center justify-center gap-2 rounded-xl border border-purple-200 px-4 py-3 text-sm font-bold transition ${
                    uploadingCover
                      ? 'pointer-events-none text-gray-400'
                      : 'cursor-pointer text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {uploadingCover ? (
                    <Loader2
                      size={17}

                      className="animate-spin"
                    />
                  ) : (
                    <Upload size={17} />
                  )}

                  {uploadingCover
                    ? 'Uploading...'
                    : form.cover_image_url
                      ? 'Replace Image'
                      : 'Upload Image'}

                  <input
                    type="file"

                    accept="image/*"

                    disabled={uploadingCover}

                    onChange={uploadCoverImage}

                    className="hidden"
                  />
                </label>

                <p className="mt-3 text-xs leading-5 text-gray-400">
                  Recommended ratio: 16:9. Maximum file size: 5 MB.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6 text-sm shadow-xs dark:border-white/10 dark:bg-white/5">
                <p className="font-bold">Current status</p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    form.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {form.status || 'draft'}
                </span>

                {form.published_at && (
                  <p className="mt-4 text-xs text-gray-400">
                    Published {formatDate(form.published_at)}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-purple-100 bg-purple-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-bold text-purple-800 dark:text-purple-300">
                  Formatting guide
                </p>

                <div className="mt-4 space-y-3 text-xs text-gray-600 dark:text-gray-300">
                  <div>
                    <code className="rounded-sm bg-white px-2 py-1 text-purple-700">
                      ## Heading
                    </code>

                    <span className="ml-2">Main section</span>
                  </div>

                  <div>
                    <code className="rounded-sm bg-white px-2 py-1 text-purple-700">
                      ### Heading
                    </code>

                    <span className="ml-2">Subsection</span>
                  </div>

                  <div>
                    <code className="rounded-sm bg-white px-2 py-1 text-purple-700">
                      **Text**
                    </code>

                    <span className="ml-2">Bold text</span>
                  </div>

                  <div>
                    <code className="rounded-sm bg-white px-2 py-1 text-purple-700">
                      - Item
                    </code>

                    <span className="ml-2">Bullet point</span>
                  </div>

                  <div>
                    <code className="rounded-sm bg-white px-2 py-1 text-purple-700">
                      &gt; Quote
                    </code>

                    <span className="ml-2">Highlighted quote</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
              Website Content
            </p>

            <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              Blog Management
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create, edit, publish and manage website articles.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-pink-600"
          >
            <Plus size={18} />
            New Article
          </button>
        </div>

        <MessageAlert message={message} />

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xs dark:border-white/10 dark:bg-white/5">
          <Search size={19} className="text-gray-400" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search articles..."
            className="w-full bg-transparent text-sm outline-hidden"
          />
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-white/5">
            <FileText size={40} className="mx-auto text-gray-300" />

            <h2 className="mt-4 text-xl font-bold">
              {search ? 'No matching articles' : 'No articles yet'}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {search
                ? 'Try a different search.'
                : 'Create your first Tech Talk Hub article.'}
            </p>

            {!search && (
              <button
                type="button"
                onClick={startCreating}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-pink-600"
              >
                <Plus size={16} />
                Create Article
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xs dark:border-white/10 dark:bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5">
                  <tr>
                    <th className="px-6 py-4">Article</th>

                    <th className="px-6 py-4">Category</th>

                    <th className="px-6 py-4">Status</th>

                    <th className="px-6 py-4">Date</th>

                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}

                              alt={post.title}

                              className="h-14 w-20 rounded-lg bg-purple-50 object-contain"
                            />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-purple-50 text-purple-300">
                              <FileImage size={23} />
                            </div>
                          )}

                          <div>
                            <p className="max-w-sm font-bold text-gray-900 dark:text-white">
                              {post.title}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              /blog/
                              {post.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-300">
                        {post.category || 'Uncategorized'}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-500">
                        <span className="flex items-center gap-2">
                          <Calendar size={14} />

                          {formatDate(post.published_at || post.created_at)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {post.status === 'published' && (
                            <a
                              href={`/blog/${post.slug}`}

                              target="_blank"

                              rel="noreferrer"

                              title="View article"

                              className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye size={17} />
                            </a>
                          )}

                          <button
                            type="button"

                            onClick={() => startEditing(post)}

                            title="Edit article"

                            className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                          >
                            <Edit3 size={17} />
                          </button>

                          <button
                            type="button"

                            disabled={deletingId === post.id}

                            onClick={() => deletePost(post)}

                            title="Delete article"

                            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === post.id ? (
                              <Loader2
                                size={17}

                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
