import React, { useEffect, useState } from "react";
import { Users2, Plus, Search, Shield, Filter, Trash2, Mail, LayoutGrid, Table as TableIcon, Edit3, UserCheck, BookOpen, X, Check } from "lucide-react";
import { supabase } from "../../../supabase";
import AddUserModal from "../../../features/accounts/AddUserModal";
import toast from "react-hot-toast";

export default function AdminUsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Default filter is student as requested
  const [roleFilter, setRoleFilter] = useState("student");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Edit & Relations Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [tutorsList, setTutorsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load users");
    else setUsers(data || []);
    setLoading(false);
  };

  const fetchTutorsAndCourses = async () => {
    const { data: tutors } = await supabase.from("users").select("id, full_name").eq("role", "tutor");
    setTutorsList(tutors || []);

    const { data: courses } = await supabase.from("courses").select("id, title");
    setCoursesList(courses || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchTutorsAndCourses();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) toast.error("Failed to delete user");
    else {
      toast.success("User deleted");
      fetchUsers();
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: editingUser.full_name,
        role: editingUser.role,
        is_active: editingUser.is_active,
        assigned_tutor_id: editingUser.assigned_tutor_id || null,
        assigned_course_id: editingUser.assigned_course_id || null,
        subscription_tier: editingUser.subscription_tier || null,
        classes_per_week: editingUser.classes_per_week !== "" ? parseInt(editingUser.classes_per_week) || 0 : null,
        classes_remaining: editingUser.classes_remaining !== "" ? parseInt(editingUser.classes_remaining) || 0 : null,
      })
      .eq("id", editingUser.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update user details");
    } else {
      toast.success("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Helper to get name of assigned tutor or course
  const getTutorName = (tutorId) => {
    const t = tutorsList.find(item => item.id === tutorId);
    return t ? t.full_name : "None assigned";
  };

  const getCourseName = (courseId) => {
    const c = coursesList.find(item => item.id === courseId);
    return c ? c.title : "None assigned";
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 md:p-8 border border-slate-100 dark:border-white/10 shadow-xs space-y-6">
      
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Users2 className="text-purple-600" /> Users & Staff Management
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">Manage platform accounts, roles, and permissions.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all">
          <Plus size={16} /> Add New User
        </button>
      </div>

      {/* Search, Filter & View Toggle Bar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 rounded-2xl border border-slate-200/60 dark:border-white/10 focus:border-purple-500 outline-none font-bold text-sm transition-all text-slate-900 dark:text-white"
            placeholder="Search by name or email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 rounded-2xl border border-slate-200/60 dark:border-white/10">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select 
              value={roleFilter} 
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-transparent py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-900">All Roles</option>
              <option value="student" className="dark:bg-slate-900">Students</option>
              <option value="tutor" className="dark:bg-slate-900">Tutors</option>
              <option value="tech_admin" className="dark:bg-slate-900">Admins</option>
              <option value="owner" className="dark:bg-slate-900">Owners</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-50 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/60 dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2.5 rounded-xl transition-all ${viewMode === "table" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* User Database Display */}
      {loading ? (
        <div className="p-12 text-center font-bold text-slate-400">Loading user database...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center font-bold text-slate-400 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          No users found matching your criteria.
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="p-5 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all flex flex-col justify-between gap-4">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{user.full_name || "Unnamed"}</h4>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-500/20 shrink-0">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">{user.email}</p>
                
                {/* Additional relations metadata snippet */}
                {user.role === 'student' && (
                  <div className="mt-3 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-white/5 p-2 rounded-xl">
                    <p className="truncate"><strong className="text-slate-700 dark:text-slate-300">Tutor:</strong> {getTutorName(user.assigned_tutor_id)}</p>
                    <p className="truncate"><strong className="text-slate-700 dark:text-slate-300">Course:</strong> {getCourseName(user.assigned_course_id)}</p>
                    {user.classes_remaining !== null && (
                      <p><strong className="text-slate-700 dark:text-slate-300">Classes Left:</strong> {user.classes_remaining}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10 text-[10px] font-bold text-slate-400">
                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingUser(user)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 text-purple-600 rounded-lg" title="Edit User & Relations">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => window.location.href = `mailto:${user.email}`} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 rounded-lg" title="Send Email">
                    <Mail size={14} />
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 rounded-lg" title="Delete User">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/10">
                <th className="p-4">Name & Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Tutor / Course</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="font-black text-slate-900 dark:text-white">{user.full_name || "Unnamed"}</p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-500/20">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.role === 'student' ? (
                      <div className="space-y-0.5 text-[11px]">
                        <p><span className="font-bold text-slate-400">Tutor:</span> {getTutorName(user.assigned_tutor_id)}</p>
                        <p><span className="font-bold text-slate-400">Course:</span> {getCourseName(user.assigned_course_id)}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-slate-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-purple-600 rounded-xl" title="Edit User & Relations">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => window.location.href = `mailto:${user.email}`} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 rounded-xl" title="Send Email">
                        <Mail size={14} />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 rounded-xl" title="Delete User">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT USER & RELATIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-white/10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit User Details</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Modify role, details, and tutor/course assignments.</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.full_name || ""}
                  onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Email (Read Only)</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email || ""}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 opacity-60 rounded-2xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Role</label>
                  <select
                    value={editingUser.role || "student"}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="student" className="dark:bg-slate-900">Student</option>
                    <option value="tutor" className="dark:bg-slate-900">Tutor</option>
                    <option value="tech_admin" className="dark:bg-slate-900">Admin</option>
                    <option value="owner" className="dark:bg-slate-900">Owner</option>
                    <option value="operations_admin" className="dark:bg-slate-900">Operations Admin</option>
                    <option value="non_user" className="dark:bg-slate-900">Non User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Account Status</label>
                  <select
                    value={editingUser.is_active ? "true" : "false"}
                    onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="true" className="dark:bg-slate-900">Active</option>
                    <option value="false" className="dark:bg-slate-900">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Relations Fields (Primarily for Students) */}
              {editingUser.role === 'student' && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wider text-purple-600">Student Relations & Plan</p>
                  
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Assigned Tutor</label>
                    <select
                      value={editingUser.assigned_tutor_id || ""}
                      onChange={e => setEditingUser({...editingUser, assigned_tutor_id: e.target.value || null})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="">-- No Tutor Assigned --</option>
                      {tutorsList.map(t => (
                        <option key={t.id} value={t.id} className="dark:bg-slate-900">{t.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Assigned Course</label>
                    <select
                      value={editingUser.assigned_course_id || ""}
                      onChange={e => setEditingUser({...editingUser, assigned_course_id: e.target.value || null})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="">-- No Course Assigned --</option>
                      {coursesList.map(c => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Classes / Week</label>
                      <input
                        type="number"
                        value={editingUser.classes_per_week ?? ""}
                        onChange={e => setEditingUser({...editingUser, classes_per_week: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Classes Remaining</label>
                      <input
                        type="number"
                        value={editingUser.classes_remaining ?? ""}
                        onChange={e => setEditingUser({...editingUser, classes_remaining: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  {saving ? "Saving..." : <><Check size={16} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && <AddUserModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onUserAdded={fetchUsers} />}
    </div>
  );
}