import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../supabase'
import { queryKeys } from '../lib/queryClient'
import {
  loadMyProfile,
  saveMyProfile,
  saveMyUsername,
  uploadMyAvatar,
  type SavedProfile,
} from '../lib/profile'

/**
 * The signed-in person's saved name and avatar, read fresh from the database
 * (not the copy taken at sign-in), with mutations that update every screen
 * using it once the database confirms the change.
 */
export function useMyProfile(userId: string, onSaved?: () => void) {
  const client = useQueryClient()
  const key = queryKeys.dashboard.myProfile(userId)

  const profile = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => loadMyProfile(userId, signal),
    staleTime: 0,
  })

  // Merge, so saving the name doesn't drop the username (and back).
  const remember = (saved: Partial<SavedProfile>) => {
    client.setQueryData<SavedProfile | null>(key, (current) =>
      current ? { ...current, ...saved } : null,
    )
    onSaved?.()
  }

  const saveName = useMutation({
    mutationFn: async (fullName: string) => {
      const saved = await saveMyProfile(userId, { fullName })
      // Keep the name stored with the login in step (older screens read it).
      const { error } = await supabase.auth.updateUser({
        data: { full_name: saved.full_name },
      })
      if (error) console.warn('Couldn’t update the login name:', error.message)
      return saved
    },
    onSuccess: remember,
  })

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => uploadMyAvatar(userId, file),
    onSuccess: remember,
  })

  const saveUsername = useMutation({
    mutationFn: saveMyUsername,
    onSuccess: (username) => remember({ username }),
  })

  return { profile, saveName, uploadAvatar, saveUsername }
}
