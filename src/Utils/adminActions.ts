import { supabase } from "../supabase";
import type { AppRole } from "../types/roles";

/**
 * Triggers a push notification to a specific tutor
 * @param {string} tutorId - The UUID of the tutor (e.g., Nancy)
 * @param {string} message - The alert text
 */
/**
 * ACTIONS: Change things in the DB
 */
export const updateUserRole = async (userId: string, newRole: AppRole) => {
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);
  if (error) throw error;
  return data;
};

export const notifyTutor = async (tutorId: string, message: string) => {
  // Always log for dev debugging
  console.log(`[Admin Action] Notifying ${tutorId}: ${message}`);
  
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { tutor_id: tutorId, title: "Class Update", body: message },
  });

  if (error) console.error("Push failed:", error);
  return data;
};

/**
 * MONITORING: Watch things in the DB
 */
export const subscribeToClasses = (onUpdate: (payload: unknown) => void) => {
  return supabase
    .channel("live_classes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calendar_events" },
      (payload) => onUpdate(payload)
    )
    .subscribe();
};
