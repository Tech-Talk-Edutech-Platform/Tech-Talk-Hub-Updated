import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase' // adjust path as needed
import { LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface UserMenuProps {
  user: Pick<User, 'email'> | null
}

export default function UserMenu({ user }: UserMenuProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    void navigate('/login', { replace: true })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[100px] truncate text-xs text-gray-400">
        {user?.email || 'Account'}
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        title="Sign Out"
        className="rounded-xl bg-gray-100 p-2 text-gray-600 transition hover:bg-red-500 hover:text-white dark:bg-white/10 dark:text-gray-300"
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}
// import React from "react";
// import { supabase } from "../supabase"; // adjust path as needed
// import { LogOut } from "lucide-react";

// export default function UserMenu({ user }) {
//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     window.location.href = "/";
//   };

//   return (
//     <div className="flex items-center gap-2">
//       <span className="text-xs text-gray-400 truncate max-w-[100px]">
//         {user?.email || "Account"}
//       </span>
//       <button
//         onClick={handleSignOut}
//         title="Sign Out"
//         className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-red-500 hover:text-white transition text-gray-600 dark:text-gray-300"
//       >
//         <LogOut size={14} />
//       </button>
//     </div>
//   );
// }
