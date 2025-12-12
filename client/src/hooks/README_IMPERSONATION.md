# Impersonation Hooks - Developer Guide

## Quick Start

### Check if impersonating
```typescript
import { useIsImpersonating } from "@/hooks/useImpersonation";

function MyComponent() {
  const isImpersonating = useIsImpersonating();
  
  return (
    <div>
      {isImpersonating && <p>You are viewing as another user</p>}
    </div>
  );
}
```

### Exit impersonation
```typescript
import { useExitImpersonation } from "@/hooks/useImpersonation";

function MyComponent() {
  const exitImpersonation = useExitImpersonation();
  
  return (
    <button onClick={exitImpersonation}>
      Return to Admin
    </button>
  );
}
```

### Get impersonated user info
```typescript
import { useImpersonatedUser } from "@/hooks/useImpersonation";

function MyComponent() {
  const { isImpersonating, user } = useImpersonatedUser();
  
  return (
    <div>
      {isImpersonating && <p>Viewing as: {user?.email}</p>}
    </div>
  );
}
```

## Available Hooks

### `useIsImpersonating()`
Returns a reactive boolean indicating if the current session is in impersonation mode.

**Returns**: `boolean`

**Updates when**:
- Impersonation starts
- Impersonation ends
- Storage changes (cross-tab)
- Custom `impersonationChanged` event fires

**Example**:
```typescript
const isImpersonating = useIsImpersonating();
if (isImpersonating) {
  // Show impersonation-specific UI
}
```

---

### `useExitImpersonation()`
Returns a function to exit impersonation mode and restore admin session.

**Returns**: `() => void`

**What it does**:
1. Restores admin tokens from localStorage
2. Removes impersonation data
3. Clears React Query cache
4. Dispatches `impersonationChanged` event
5. Navigates to `/admin/users`

**Example**:
```typescript
const exitImpersonation = useExitImpersonation();

<button onClick={exitImpersonation}>
  Exit Impersonation
</button>
```

---

### `useImpersonatedUser()`
Returns impersonation status and user information.

**Returns**: 
```typescript
{
  isImpersonating: boolean;
  user: User | null;
}
```

**Example**:
```typescript
const { isImpersonating, user } = useImpersonatedUser();

if (isImpersonating) {
  console.log(`Viewing as: ${user?.email}`);
}
```

## LocalStorage Keys

These keys are managed automatically by the hooks:

| Key | Type | Description |
|-----|------|-------------|
| `is_impersonating` | `"true" \| null` | Flag indicating impersonation mode |
| `admin_access_token` | `string \| null` | Saved admin access token |
| `admin_refresh_token` | `string \| null` | Saved admin refresh token |

**⚠️ Warning**: Do not manually modify these keys. Use the provided hooks instead.

## Events

### `impersonationChanged`
Custom event dispatched when impersonation state changes.

**When fired**:
- Impersonation starts
- Impersonation ends

**How to listen**:
```typescript
useEffect(() => {
  const handler = () => {
    console.log('Impersonation state changed');
  };
  
  window.addEventListener('impersonationChanged', handler);
  return () => window.removeEventListener('impersonationChanged', handler);
}, []);
```

## Best Practices

### ✅ Do
- Use `useIsImpersonating()` for conditional rendering
- Use `useExitImpersonation()` for exit buttons
- Let hooks manage localStorage automatically
- Check impersonation status in route guards

### ❌ Don't
- Don't manually set `is_impersonating` in localStorage
- Don't access admin tokens directly
- Don't assume impersonation state is static
- Don't forget to handle impersonation in protected routes

## Common Patterns

### Conditional Admin Features
```typescript
function AdminPanel() {
  const isImpersonating = useIsImpersonating();
  const isAdmin = useIsAdmin();
  
  if (isImpersonating) {
    return <UserView />;
  }
  
  if (isAdmin) {
    return <AdminView />;
  }
  
  return <AccessDenied />;
}
```

### Route Protection
```typescript
function ProtectedRoute() {
  const isImpersonating = useIsImpersonating();
  const isAdmin = useIsAdmin();
  
  // Allow admins to see user routes when impersonating
  if (isImpersonating) {
    return <Outlet />;
  }
  
  // Normal route protection
  if (!isAdmin) {
    return <Navigate to="/login" />;
  }
  
  return <Outlet />;
}
```

### Impersonation Banner
```typescript
function Layout() {
  const isImpersonating = useIsImpersonating();
  
  return (
    <div className={isImpersonating ? "pt-12" : ""}>
      {isImpersonating && <ImpersonationBanner />}
      <MainContent />
    </div>
  );
}
```

## Troubleshooting

### Impersonation not working?
1. Check if backend returns correct tokens
2. Verify URL params are being passed
3. Check browser console for errors
4. Ensure `ImpersonationManager` is mounted

### Can't exit impersonation?
1. Check if admin tokens exist in localStorage
2. Verify `useExitImpersonation` is called correctly
3. Check React Query cache is being cleared
4. Ensure navigation is not blocked

### State not updating?
1. Verify `impersonationChanged` event is firing
2. Check if hooks are properly subscribed
3. Ensure localStorage is accessible
4. Try refreshing the page

## Migration Guide

### From old implementation
If you were using the old impersonation hooks from `useAuth.ts`:

**Before**:
```typescript
import { useIsImpersonating, useExitImpersonation } from "@/hooks/useAuth";
```

**After**:
```typescript
import { useIsImpersonating, useExitImpersonation } from "@/hooks/useImpersonation";
```

The API is identical, just the import path changed.




