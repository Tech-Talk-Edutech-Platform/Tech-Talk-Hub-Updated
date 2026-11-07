import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { BlogCallToAction } from '../components/blog/BlogCallToAction'
import { BlogCategoryFilters } from '../components/blog/BlogCategoryFilters'
import { BlogHero } from '../components/blog/BlogHero'
import { EmptyArticles } from '../components/blog/EmptyArticles'
import { FeaturedArticle } from '../components/blog/FeaturedArticle'
import { FounderNote } from '../components/blog/FounderNote'
import { LatestArticles } from '../components/blog/LatestArticles'
import { ParentResources } from '../components/blog/ParentResources'
import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'
import { staticPageMeta } from '../data/seo'
import { useBlogPosts } from '../hooks/useBlog'
import { usePageMeta } from '../hooks/usePageMeta'
import { ALL_STORIES } from '../lib/blog'

export function BlogPage() {
  usePageMeta(staticPageMeta('/blog'))
  const [searchParams] = useSearchParams()
  const selectedCategory = searchParams.get('category') || ALL_STORIES
  const postsQuery = useBlogPosts(selectedCategory)
  const posts = postsQuery.data ?? []
  const [featuredPost, ...latestPosts] = posts

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#172554]">
      <NavBar />

      <BlogHero articleCount={posts.length} />

      <BlogCategoryFilters selectedCategory={selectedCategory} />

      {postsQuery.isPending ? (
        <section
          id="latest-stories"
          className="flex min-h-[420px] scroll-mt-32 items-center justify-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#7651EF]" />
        </section>
      ) : featuredPost ? (
        <>
          <FeaturedArticle post={featuredPost} />
          <LatestArticles
            posts={latestPosts}
            selectedCategory={selectedCategory}
          />
        </>
      ) : (
        <EmptyArticles selectedCategory={selectedCategory} />
      )}

      <ParentResources />
      <FounderNote />
      <BlogCallToAction />
      <Footer />
    </main>
  )
}
