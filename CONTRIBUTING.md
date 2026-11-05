# Contributing to Tech Talk Hub Dashboards

Guidelines for contributing to the Dashboards project. Follow these patterns to ensure consistency, performance, and security.

---

## Table of Contents

1. [Code Style](#code-style)
2. [Performance Guidelines](#performance-guidelines)
3. [State Management](#state-management)
4. [Anti-Patterns](#anti-patterns)
5. [Component Patterns](#component-patterns)
6. [RBAC Security Roadmap](#rbac-security-roadmap)
7. [Pull Request Guidelines](#pull-request-guidelines)

---

## Code Style

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard.js` |
| Hooks | camelCase with `use` prefix | `useUserData.js` |
| Utils | camelCase | `formatDate.js` |
| Views | PascalCase with suffix | `AdminHomeView.js` |

### Imports Order

```jsx
// 1. React and hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// 2. Third-party libraries
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';

// 3. Internal modules (absolute paths)
import { supabase } from '../supabase';
import { useAuthStore } from '../store/authStore';

// 4. Components
import { Button } from '../components/Button';

// 5. Utils and constants
import { formatDate } from '../Utils/formatDate';
```

### Design Tokens

Always use Tailwind tokens from `tailwind.config.js`:

```jsx
// ✅ Correct
<button className="bg-primary text-white">Submit</button>

// ❌ Wrong - hardcoded colors
<button className="bg-[#3F51B5] text-white">Submit</button>
```

---

## Performance Guidelines

> ⚠️ **Enforcement Required:** All components must follow these patterns to prevent performance degradation.

### `useEffect` — Side Effects

```jsx
// ✅ CORRECT: Include all dependencies
useEffect(() => {
  fetchUserData(userId);
}, [userId]);

// ❌ WRONG: Missing dependencies causes stale data
useEffect(() => {
  fetchUserData(userId);
}, []);

// ❌ WRONG: No dependency array = runs every render
useEffect(() => {
  fetchData();
});
```

**Rules:**
- Always include all referenced variables in dependency array
- Use empty `[]` only for mount-once effects
- Add cleanup functions for subscriptions/timers: `return () => cleanup()`
- Never omit the dependency array unless intentional

### `useCallback` — Memoize Functions

```jsx
// ✅ CORRECT: Stable reference for child props
const handleDelete = useCallback((id) => {
  setItems(prev => prev.filter(item => item.id !== id));
}, []);

// ✅ CORRECT: With dependencies
const handleSubmit = useCallback(async () => {
  await saveData(formData);
}, [formData]);

// ❌ WRONG: Inline function = new reference every render
<ChildComponent onDelete={(id) => deleteItem(id)} />

// ✅ CORRECT: Memoized callback
<ChildComponent onDelete={handleDelete} />
```

**When to use:**
- Functions passed as props to child components
- Functions in dependency arrays of other hooks
- Event handlers in mapped/list components
- Functions passed to `React.memo` components

### `useMemo` — Memoize Values

```jsx
// ✅ CORRECT: Expensive computation
const filteredUsers = useMemo(() => {
  return users
    .filter(u => u.role === roleFilter)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [users, roleFilter]);

// ✅ CORRECT: Derived state
const stats = useMemo(() => ({
  total: payments.reduce((sum, p) => sum + p.amount, 0),
  count: payments.length,
}), [payments]);

// ❌ WRONG: Recomputes every render
const expensiveResult = heavyCalculation(data);
```

**When to use:**
- Filtering/sorting large arrays
- Complex calculations
- Objects/arrays passed as props
- Derived state from props

### `React.memo` — Component Memoization

```jsx
// ✅ Wrap pure components
const StatCard = React.memo(function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
});
```

### Quick Reference

| Hook | Purpose | Use When |
|------|---------|----------|
| `useEffect` | Side effects | Data loading, subscriptions, DOM mutations |
| `useCallback` | Memoize functions | Callbacks to children, dependency arrays |
| `useMemo` | Memoize values | Expensive calculations, object props |
| `React.memo` | Memoize components | Pure components with stable props |

---

## State Management

### State Categories

| State Type | Tool | Examples |
|------------|------|----------|
| **Local** UI | `useState` | Modal open, form fields, tabs |
| **Shared** client | Zustand | Auth user, preferences, notifications |
| **Server** | TanStack Query | Users, courses, schedules |

### Rules

1. **Start local, promote when needed**
   - Use `useState` first
   - Promote to Zustand only when 2+ unrelated components need it

2. **Never duplicate server state**
   - Let TanStack Query own caching and refetching
   - Don't copy API data into Zustand

3. **One store per domain**
   - `useAuthStore` for auth
   - `useNotificationStore` for notifications
   - Don't create monolithic stores

### TanStack Query Pattern (Target)

```jsx
// hooks/useUsers.js
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.from('users').select('*'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Component
function UserList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <UserTable users={users} />;
}
```

### Zustand Store Pattern (Target)

```jsx
// store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user, role: user?.role }),
  logout: () => set({ user: null, role: null }),
}));
```

---

## Anti-Patterns

### ❌ Object in Dependency Array

```jsx
// ❌ WRONG: New object reference every render
useEffect(() => {
  fetchData(options);
}, [{ page, limit }]);  // Always triggers!

// ✅ CORRECT: Use useMemo
const options = useMemo(() => ({ page, limit }), [page, limit]);
useEffect(() => {
  fetchData(options);
}, [options]);
```

### ❌ Inline Functions in JSX

```jsx
// ❌ WRONG: New function every render
function MyComponent() {
  const handleClick = () => doSomething();
  return <Child onClick={handleClick} />;
}

// ✅ CORRECT: useCallback
function MyComponent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <Child onClick={handleClick} />;
}
```

### ❌ Over-Memoization

```jsx
// ❌ WRONG: Simple math doesn't need useMemo
const doubled = useMemo(() => count * 2, [count]);

// ✅ CORRECT: Just compute it
const doubled = count * 2;
```

### ❌ Fetching Without Cleanup

```jsx
// ❌ WRONG: Race condition if component unmounts
useEffect(() => {
  fetchData().then(setData);
}, []);

// ✅ CORRECT: AbortController pattern
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal })
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });

  return () => controller.abort();
}, []);
```

### ❌ Direct DOM Manipulation

```jsx
// ❌ WRONG
document.getElementById('myInput').value = '';

// ✅ CORRECT: Use refs
const inputRef = useRef();
inputRef.current.value = '';
```

### ❌ Prop Drilling More Than 2 Levels

```jsx
// ❌ WRONG: Drilling through many components
<App user={user}>
  <Dashboard user={user}>
    <Sidebar user={user}>
      <UserMenu user={user} />
    </Sidebar>
  </Dashboard>
</App>

// ✅ CORRECT: Use Zustand or Context
const user = useAuthStore(state => state.user);
```

---

## Component Patterns

### Loading States

```jsx
function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error.message} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### Form Handling

```jsx
function Form() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitForm(formData);
    } finally {
      setSubmitting(false);
    }
  }, [formData]);

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Conditional Rendering

```jsx
// ✅ Early returns for clarity
function UserProfile({ user }) {
  if (!user) return null;
  if (user.banned) return <BannedMessage />;

  return <ProfileCard user={user} />;
}

// ✅ Ternary for simple conditions
<div>{isAdmin ? <AdminPanel /> : <UserPanel />}</div>

// ✅ && for presence checks
{user && <WelcomeMessage name={user.name} />}
```

---

## RBAC Security Roadmap

> ⚠️ **Current State:** RBAC is frontend-only. Backend enforcement is not implemented.

### Known Vulnerabilities

| Issue | Impact | Priority |
|-------|--------|----------|
| No Supabase RLS policies | Any user can query any table | 🔴 Critical |
| Frontend-only enforcement | Bypassable via DevTools | 🔴 Critical |
| Redundant role fetching | N+1 queries on RoleGate | 🟡 Medium |
| Hardcoded role lists | Changes needed in 10+ files | 🟡 Medium |

### Phase 1: Backend Security (Critical)

```sql
-- Example RLS policy for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view all payments"
ON payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'owner'
  )
);

CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

### Phase 2: Frontend Optimization

```jsx
// store/authStore.js - Cache role in Zustand
export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  permissions: [],

  fetchUserRole: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      set({ user, role: data?.role });
    }
  },
}));
```

### Phase 3: Permission System

```jsx
// config/permissions.js
export const ROLE_PERMISSIONS = {
  owner: ['*'],
  operations_admin: ['users:read', 'users:write', 'courses:*', 'payments:read'],
  tutor: ['students:read', 'classes:*', 'assignments:*'],
  student: ['courses:read', 'assignments:submit', 'exams:take'],
  marketer: ['referrals:*', 'commissions:read'],
};

// hooks/usePermission.js
export function usePermission(permission) {
  const role = useAuthStore(state => state.role);
  const permissions = ROLE_PERMISSIONS[role] || [];

  return permissions.includes('*') || permissions.includes(permission);
}

// Usage
function PaymentsButton() {
  const canViewPayments = usePermission('payments:read');
  if (!canViewPayments) return null;
  return <Button>View Payments</Button>;
}
```

### Phase 4: Audit Logging

```sql
-- Create audit log table
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create trigger function
CREATE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), to_jsonb(OLD), to_jsonb(NEW));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows style guide
- [ ] No hardcoded colors (use design tokens)
- [ ] Performance patterns applied (`useCallback`, `useMemo` where needed)
- [ ] No anti-patterns from this guide
- [ ] Loading/error states handled
- [ ] Accessibility: labels, aria attributes, keyboard navigation

### PR Template

```markdown
## Summary
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Changes
- List of specific changes

## Testing
- [ ] Tested locally
- [ ] Tested with different roles

## Screenshots (if UI changes)
```

### Commit Messages

```
feat(auth): add role caching to Zustand store
fix(dashboard): prevent re-render on sidebar toggle
refactor(schedule): extract calendar utils
docs: update RBAC roadmap
```

---

## Questions?

Open an issue or reach out to the team before making large architectural changes.
