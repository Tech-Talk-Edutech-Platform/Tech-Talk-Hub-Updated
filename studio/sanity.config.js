import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'TechTalkHub',

  projectId: '6r4esya0',
  dataset: 'production',

  // The Vercel build serves the studio at /studio (see vercel.json);
  // `sanity deploy` and `sanity dev` keep serving it at the root.
  basePath: process.env.SANITY_STUDIO_BASE_PATH || '/',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
