# Authenticated User Testing - Comprehensive Test Plan

## Executive Summary

This test plan covers comprehensive end-to-end testing for the T3 Stack application with WorkOS AuthKit authentication. The application is built with Next.js 15, tRPC, Prisma, and PostgreSQL, featuring:

- **Authentication**: WorkOS AuthKit with middleware-based protection
- **Protected Routes**: `/design-strategy`, `/render-strategy` require authentication
- **Public Routes**: `/`, `/docs` are publicly accessible
- **Task Management**: Full CRUD operations with user-scoped data
- **tRPC API**: Protected procedures requiring authenticated users
- **Database**: PostgreSQL with Prisma ORM (Task and Post models)

### Application Architecture

**Authentication Flow:**

1. WorkOS middleware (`src/middleware.ts`) intercepts all routes except `/` and `/docs`
2. For tRPC routes (`/api/trpc/*`), the route handler calls `withAuth()` and passes user context
3. Protected tRPC procedures validate `ctx.user` exists and provide type-safe access
4. NavBar component displays user info and sign-out button when authenticated

**Key Features to Test:**

- Login/logout flows using WorkOS impersonation
- Access control for protected routes
- Task CRUD operations (create, read, update, delete, toggle completion)
- Task priority updates with optimistic UI
- Client-side query caching and invalidation
- User session persistence
- Edge cases and error handling

---

## Test Environment Setup

### Prerequisites

1. **Development Server**: Start the application on `http://localhost:3000`

   ```bash
   pnpm dev
   ```

2. **Test Credentials** (from .env):
   - Email: `akshat-test@test.com`
   - Password: `akshat-test`
   - These credentials exist in the WorkOS dashboard for impersonation

3. **Database**: PostgreSQL database must be accessible and migrated
   ```bash
   pnpm db:generate
   ```

### Authentication Strategy

**Option A: WorkOS UI Flow (Recommended)**

- Use the WorkOS AuthKit UI components
- Navigate to `/api/login` which redirects to WorkOS sign-in page
- Enter test credentials through the UI
- WorkOS handles the OAuth flow and redirects back to `/api/callback`

**Option B: Direct API Authentication (Advanced)**

- Use `workos.userManagement.authenticateWithPassword()` method
- Requires additional setup to handle cookie management
- More complex but allows programmatic authentication without UI interaction

**Recommendation**: Use Option A for initial test development as it closely mirrors real user behavior and doesn't require mocking or cookie manipulation.

### Test Data Management

**Approach**: Tests should create their own data and clean up after themselves

- Each test should be independent
- Use unique task titles to avoid conflicts (e.g., timestamp-based)
- Consider implementing a test-specific cleanup routine

---

## Test Scenarios

### 1. Authentication & Authorization

**Seed**: `tests/seed.spec.ts`

#### 1.1 Public Routes Access (Unauthenticated)

**Steps:**

1. Navigate to `http://localhost:3000/` (home page)
2. Verify page loads successfully
3. Check that tRPC query executes (shows "Hello from tRPC")
4. Verify "Sign in" and "Sign up" buttons are visible in NavBar
5. Navigate to `http://localhost:3000/docs`
6. Verify docs page loads successfully

**Expected Results:**

- Home page displays without authentication
- Docs page displays without authentication
- NavBar shows authentication CTAs
- No user welcome message displayed

#### 1.2 Protected Routes Access Denied (Unauthenticated)

**Steps:**

1. Clear all cookies and session data
2. Navigate to `http://localhost:3000/design-strategy`
3. Observe the redirect behavior
4. Navigate to `http://localhost:3000/render-strategy`
5. Observe the redirect behavior

**Expected Results:**

- User is redirected to WorkOS sign-in page
- URL changes to WorkOS authentication endpoint
- Original requested path is preserved for post-login redirect
- No application content is displayed before redirect

#### 1.3 Sign In with Valid Credentials

**Steps:**

1. Start from home page `http://localhost:3000/`
2. Click "Sign in" button in NavBar
3. Verify redirect to WorkOS authentication page
4. Enter email: `akshat-test@test.com`
5. Enter password: `akshat-test`
6. Click submit/sign-in button
7. Wait for redirect back to application

**Expected Results:**

- WorkOS authentication page loads successfully
- Email and password fields are present and functional
- After submission, user is redirected to home page (`/`)
- NavBar displays welcome message with user's first name
- "Sign out" button replaces "Sign in" and "Sign up" buttons
- User session is established (cookies set)

#### 1.4 Session Persistence

**Steps:**

1. Sign in as per scenario 1.3
2. Navigate to `/design-strategy` (protected route)
3. Verify page loads successfully
4. Refresh the browser (F5)
5. Verify user remains authenticated
6. Navigate to `/render-strategy`
7. Verify page loads successfully
8. Open browser DevTools and check cookies
9. Navigate back to home page
10. Verify user info still displays in NavBar

**Expected Results:**

- User remains authenticated after page refresh
- All protected routes remain accessible
- Session cookies persist (check `workos-session` or similar)
- No re-authentication required
- User info consistently displayed across navigation

#### 1.5 Sign Out

**Steps:**

1. Ensure user is signed in (from scenario 1.3)
2. Verify "Sign out" button is visible in NavBar
3. Click "Sign out" button
4. Wait for page response
5. Verify NavBar state changes
6. Attempt to navigate to `/design-strategy`

**Expected Results:**

- User is signed out successfully
- NavBar displays "Sign in" and "Sign up" buttons
- Welcome message disappears from NavBar
- Session cookies are cleared
- Attempting to access `/design-strategy` redirects to sign-in page
- User is no longer authenticated

#### 1.6 Sign In with Direct Navigation to Protected Route

**Steps:**

1. Clear all cookies (start unauthenticated)
2. Navigate directly to `http://localhost:3000/render-strategy`
3. Verify redirect to WorkOS sign-in page
4. Enter valid credentials (akshat-test@test.com / akshat-test)
5. Complete sign-in

**Expected Results:**

- User is redirected to WorkOS authentication
- After successful sign-in, user is redirected to `/render-strategy` (original destination)
- Page loads successfully with authenticated content
- User session is established

---

### 2. Protected Routes Functionality

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated (run sign-in flow first)

#### 2.1 Design Strategy Page Access

**Steps:**

1. Ensure user is signed in
2. Navigate to `http://localhost:3000/design-strategy`
3. Wait for page to fully load
4. Verify page title is "Shadcn Component Showcase"
5. Scroll through the page
6. Verify interactive components are present

**Expected Results:**

- Page loads successfully without redirect
- Header displays "Shadcn Component Showcase"
- Breadcrumb navigation is visible
- All component sections render (Color Palette, Navigation, Forms, etc.)
- Interactive components are functional (dropdowns, dialogs, etc.)
- No authentication errors in console

#### 2.2 Render Strategy Page Access and Data Loading

**Steps:**

1. Ensure user is signed in
2. Navigate to `http://localhost:3000/render-strategy`
3. Wait for page to fully load
4. Verify page displays two main sections:
   - "Server-Side Data Prefetching"
   - "Mutation Strategies Comparison"
5. Check that three strategy cards are visible:
   - Query Invalidation (blue border)
   - Direct Cache Update
   - Optimistic Update
6. Verify each card displays task list

**Expected Results:**

- Page loads successfully without redirect
- Server-side section displays prefetched tasks
- Three mutation strategy cards are visible
- Task lists display user's tasks (or empty state)
- No loading errors or authentication failures
- Performance metrics may be visible if mutations have been executed

---

### 3. Task Management - Create Operations

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated and on `/render-strategy` page

#### 3.1 Create Task via Query Invalidation Strategy

**Steps:**

1. Navigate to `/render-strategy`
2. Locate the "Query Invalidation" card (blue border, "Recommended" badge)
3. Find the task creation form input field
4. Type a unique task title (e.g., "Test Task QI - [timestamp]")
5. Click "Create Task" button
6. Wait for mutation to complete
7. Observe the task list updates
8. Check for performance metrics display

**Expected Results:**

- Input field accepts text
- "Create Task" button is enabled when text is present
- Button shows loading state: "Creating & Refetching..."
- After completion, new task appears in the task list
- Task title matches the entered text
- Task is shown as incomplete (no checkmark)
- Performance metrics display:
  - Mutation duration
  - Refetch duration
  - Total duration
- Input field is cleared after successful creation
- Success badge or indicator may appear

#### 3.2 Create Task via Direct Cache Update Strategy

**Steps:**

1. Stay on `/render-strategy` page
2. Locate the "Direct Cache Update" card
3. Find the task creation form input field
4. Type a unique task title (e.g., "Test Task DCU - [timestamp]")
5. Click the create button
6. Observe the task list updates
7. Compare performance metrics with Query Invalidation

**Expected Results:**

- Task creation succeeds
- New task appears in the task list immediately
- Performance metrics show faster update (no refetch)
- Cache is updated directly without server round-trip
- Task list displays the new task in correct order
- Input field is cleared

#### 3.3 Create Task via Optimistic Update Strategy

**Steps:**

1. Stay on `/render-strategy` page
2. Locate the "Optimistic Update" card
3. Find the task creation form input field
4. Type a unique task title (e.g., "Test Task OPT - [timestamp]")
5. Click the create button
6. Observe immediate UI update
7. Wait for server confirmation
8. Check performance metrics

**Expected Results:**

- Task appears in list immediately (optimistic)
- Button shows loading state briefly
- Task persists after server confirmation
- Performance metrics show instant UI update
- If server fails, optimistic update rolls back (edge case)
- No UI flickering or re-rendering issues

#### 3.4 Create Task with Empty Title (Validation)

**Steps:**

1. Stay on `/render-strategy` page
2. Locate any task creation card
3. Click in the input field but leave it empty
4. Try to click "Create Task" button
5. Enter only whitespace characters (spaces, tabs)
6. Try to submit

**Expected Results:**

- "Create Task" button is disabled when input is empty
- Button remains disabled with only whitespace
- No network request is made
- No error messages displayed (button is simply disabled)
- Input placeholder is visible: "New task title..."

#### 3.5 Create Multiple Tasks Sequentially

**Steps:**

1. Stay on `/render-strategy` page
2. Create first task: "Sequential Task 1"
3. Wait for completion
4. Create second task: "Sequential Task 2"
5. Wait for completion
6. Create third task: "Sequential Task 3"
7. Verify all tasks appear in the list
8. Check task order (newest first)

**Expected Results:**

- All three tasks are created successfully
- Tasks appear in descending order (newest first)
- Task list shows at least 3 tasks (may show only most recent 3)
- No duplicate tasks appear
- Each creation completes before next begins
- Performance metrics update for each creation

---

### 4. Task Management - Read Operations

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated and have created at least 3 tasks

#### 4.1 View Task List on Page Load

**Steps:**

1. Ensure user has created 3+ tasks
2. Sign out of the application
3. Sign back in
4. Navigate to `/render-strategy`
5. Wait for page to load
6. Observe the task lists in all three strategy cards

**Expected Results:**

- Tasks are loaded from database
- Server-side section displays tasks immediately (prefetched)
- Client-side cards display tasks after hydration
- Task lists show most recent 3 tasks
- Task data is accurate (titles, completion status)
- No "Loading..." state for server-prefetched data

#### 4.2 Task List Displays User-Scoped Data Only

**Steps:**

1. Sign in as test user (akshat-test@test.com)
2. Create a task: "User 1 Task - [timestamp]"
3. Note the task appears in the list
4. Sign out
5. (If available) Sign in as a different test user
6. Navigate to `/render-strategy`
7. Verify the previous user's task is NOT visible

**Expected Results:**

- Each user sees only their own tasks
- Tasks are filtered by userId in database
- Cross-user data leakage does not occur
- Task lists are empty for new users
- Privacy and data isolation are maintained

**Note**: This test requires a second test user. If not available, verify through database inspection that tasks have correct userId.

#### 4.3 Empty State Display

**Steps:**

1. Create a new test user or use database cleanup
2. Sign in as user with no tasks
3. Navigate to `/render-strategy`
4. Observe the task list sections

**Expected Results:**

- Each strategy card displays empty state message
- Message reads: "No tasks yet. Create one above!"
- Empty state has dashed border styling
- No loading spinners (after initial load)
- Create task forms are functional
- No errors in console

---

### 5. Task Management - Update Operations

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated and have created at least 1 task

#### 5.1 Toggle Task Completion (Direct Cache Update)

**Steps:**

1. Navigate to `/render-strategy`
2. Ensure at least one incomplete task exists
3. Locate the "Direct Cache Update" card
4. Find a task in the list (should have no checkmark)
5. Click the toggle/checkbox to mark as complete
6. Observe the UI update
7. Click the toggle again to mark as incomplete
8. Verify the state changes

**Expected Results:**

- Task completion toggles immediately
- Checkmark icon (green) appears when complete
- Checkmark disappears when marked incomplete
- Cache updates directly without full refetch
- Performance metrics show fast update time
- Change persists after page refresh

#### 5.2 Update Task Priority (Optimistic Update)

**Steps:**

1. Stay on `/render-strategy` page
2. Locate the "Optimistic Update" card
3. Find a task with a priority control/slider
4. Note the current priority value (0-10 scale)
5. Change the priority to a different value
6. Observe the immediate UI feedback
7. Wait for server confirmation
8. Refresh the page
9. Verify priority persisted

**Expected Results:**

- Priority updates immediately in UI (optimistic)
- Slider or control responds to input
- Visual feedback shows new priority value
- Update persists after server confirmation
- After page refresh, priority value is correct
- Performance metrics show optimistic update timing

#### 5.3 Update Task with Server Error Handling

**Steps:**

1. (Requires ability to simulate server error)
2. Attempt to update a task's priority
3. If server returns error, observe rollback
4. Verify UI returns to previous state
5. Check for error notification/toast

**Expected Results:**

- If optimistic update fails, changes roll back
- UI returns to previous state
- Error message is displayed to user
- No corrupted state in cache
- User can retry the operation

**Note**: This test may require network throttling or server manipulation to simulate errors.

---

### 6. Task Management - Delete Operations

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated and have created at least 2 tasks

#### 6.1 Delete Task

**Steps:**

1. Navigate to `/render-strategy`
2. Note the current task count in any strategy card
3. Locate a delete button/icon for a specific task
4. Note the task title before deletion
5. Click delete button
6. Confirm deletion if prompted
7. Observe the task list updates
8. Refresh the page
9. Verify task remains deleted

**Expected Results:**

- Delete button/action is available for each task
- Confirmation dialog may appear (optional)
- Task is removed from the list immediately
- Task count decreases by 1
- After page refresh, task does not reappear
- Task is deleted from database
- Other tasks remain unaffected

**Note**: Examine the codebase to confirm if delete functionality exists in the UI. The tRPC router has a `delete` mutation, but UI implementation may vary.

#### 6.2 Delete Last Task

**Steps:**

1. Navigate to `/render-strategy`
2. Delete all tasks except one
3. Delete the last remaining task
4. Observe the UI state

**Expected Results:**

- Last task is deleted successfully
- Task list transitions to empty state
- Empty state message appears: "No tasks yet. Create one above!"
- No errors occur
- UI handles empty array gracefully

---

### 7. Cross-Feature Integration Tests

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated

#### 7.1 Complete User Journey

**Steps:**

1. Sign in with valid credentials
2. Navigate to home page - verify public content
3. Navigate to `/design-strategy` - verify access granted
4. Navigate to `/render-strategy` - verify page loads
5. Create 3 tasks using different strategies
6. Toggle one task as complete
7. Update another task's priority
8. Verify all changes persist
9. Navigate to home page and back to `/render-strategy`
10. Verify all changes are still present
11. Delete one task
12. Sign out
13. Verify redirect to public page

**Expected Results:**

- All steps complete without errors
- State is consistent across navigation
- Data persists across page transitions
- Sign-out clears authentication properly
- No console errors throughout journey

#### 7.2 Concurrent Task Operations

**Steps:**

1. Navigate to `/render-strategy`
2. Open browser DevTools Network tab
3. Create a task in Query Invalidation card
4. While that mutation is pending, try to create another task
5. Observe how the system handles concurrent operations
6. Verify both tasks appear in the list
7. Check for race conditions or data inconsistencies

**Expected Results:**

- System handles concurrent mutations gracefully
- Both tasks are created successfully
- No race conditions occur
- Task list updates correctly
- Cache remains consistent
- No duplicate tasks appear
- Error handling prevents corrupted state

#### 7.3 Navigation During Pending Operations

**Steps:**

1. Navigate to `/render-strategy`
2. Start creating a task (click submit)
3. Immediately navigate to home page (before mutation completes)
4. Wait 2-3 seconds
5. Navigate back to `/render-strategy`
6. Check if the task was created

**Expected Results:**

- Navigation succeeds even with pending mutations
- Task creation completes in background (or is cancelled)
- No errors occur from abandoned mutations
- Application state remains consistent
- After returning, task may or may not appear (depends on cancellation policy)
- No memory leaks or hanging requests

---

### 8. Edge Cases & Error Handling

**Seed**: `tests/seed.spec.ts`

#### 8.1 Session Expiration

**Steps:**

1. Sign in as normal user
2. Navigate to `/render-strategy`
3. Open browser DevTools and delete session cookies manually
4. Try to create a task
5. Observe the error handling

**Expected Results:**

- tRPC mutation fails with UNAUTHORIZED error
- User is informed of authentication failure
- Redirect to sign-in page may occur
- No data corruption occurs
- Error message is user-friendly

**Note**: Session expiration timing may vary. Manual cookie deletion simulates expired session.

#### 8.2 Network Failure During Mutation

**Steps:**

1. Navigate to `/render-strategy`
2. Open browser DevTools Network tab
3. Enable "Offline" mode
4. Try to create a task
5. Observe error handling
6. Re-enable network
7. Retry the operation

**Expected Results:**

- Network error is caught and handled
- User sees error message or notification
- Optimistic updates roll back (if used)
- UI does not crash or freeze
- After network restored, user can retry successfully
- No corrupted cache state

#### 8.3 Long Task Title

**Steps:**

1. Navigate to `/render-strategy`
2. Enter a very long task title (500+ characters)
3. Try to submit
4. Observe validation or truncation

**Expected Results:**

- System handles long input gracefully
- Validation may prevent submission (min 1 char required)
- UI may truncate display if accepted
- No database errors occur
- Error message if validation fails

#### 8.4 Special Characters in Task Title

**Steps:**

1. Navigate to `/render-strategy`
2. Create task with title: `<script>alert('XSS')</script>`
3. Create task with title: `Test & "Task" with 'quotes'`
4. Create task with title: `Unicode Test: 日本語 🎉 测试`
5. Verify all tasks display correctly without XSS or encoding issues

**Expected Results:**

- Special characters are escaped/sanitized
- No XSS vulnerabilities (script tags don't execute)
- Quotes are properly encoded and displayed
- Unicode characters display correctly
- Task titles render safely in HTML
- Database stores characters correctly

#### 8.5 Rapid Button Clicking (Double Submit)

**Steps:**

1. Navigate to `/render-strategy`
2. Enter a task title
3. Click "Create Task" button multiple times rapidly (3-4 clicks)
4. Observe the result

**Expected Results:**

- Only one task is created (duplicate prevention)
- Button is disabled during pending mutation
- Loading state prevents additional clicks
- No duplicate tasks in database
- System handles rapid clicks gracefully

#### 8.6 Browser Back Button Behavior

**Steps:**

1. Start on home page
2. Sign in
3. Navigate to `/render-strategy`
4. Create a task
5. Navigate to `/design-strategy`
6. Click browser back button
7. Verify `/render-strategy` state

**Expected Results:**

- Back button returns to `/render-strategy`
- Page displays with previous state
- Created task is still visible
- Authentication persists
- No re-authentication required
- Page uses cached data (fast load)

---

### 9. Performance & UX Tests

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated

#### 9.1 Server-Side Prefetch Performance

**Steps:**

1. Sign in and create 5 tasks
2. Clear browser cache
3. Navigate to `/render-strategy`
4. Measure time to first meaningful paint
5. Check Network tab for task data request timing
6. Verify server-side task list renders before client hydration

**Expected Results:**

- Page loads quickly (< 1 second)
- Server-side task list visible immediately (prefetched)
- No "Loading..." state for server component
- Client components hydrate smoothly
- Performance metrics show prefetch advantage
- No flash of empty state

#### 9.2 Mutation Strategy Performance Comparison

**Steps:**

1. Navigate to `/render-strategy`
2. Create one task in each strategy card
3. Compare the performance metrics displayed
4. Record timing for each strategy:
   - Query Invalidation: mutation + refetch
   - Direct Cache Update: mutation only
   - Optimistic Update: instant UI + background mutation

**Expected Results:**

- Query Invalidation shows higher total time (includes refetch)
- Direct Cache Update faster than invalidation
- Optimistic Update shows near-instant UI feedback
- Performance metrics accurately reflect strategy differences
- All strategies result in consistent final state

#### 9.3 Page Load with Large Task List

**Steps:**

1. Create 20+ tasks for the test user
2. Sign out and sign back in
3. Navigate to `/render-strategy`
4. Measure page load time
5. Observe rendering performance
6. Scroll through task lists

**Expected Results:**

- Page loads within acceptable time (< 3 seconds)
- Task lists display most recent 3 tasks (as per code)
- Rendering is smooth without lag
- No performance degradation with more data
- Pagination or truncation works correctly

---

### 10. Accessibility Tests

**Seed**: `tests/seed.spec.ts`
**Pre-condition**: User must be authenticated

#### 10.1 Keyboard Navigation

**Steps:**

1. Navigate to `/render-strategy`
2. Use Tab key to navigate through interactive elements
3. Try to create a task using only keyboard:
   - Tab to input field
   - Type task title
   - Tab to button
   - Press Enter
4. Verify focus indicators are visible
5. Check focus trap in modals/dialogs (if any)

**Expected Results:**

- All interactive elements are keyboard accessible
- Focus order is logical
- Focus indicators are clearly visible
- Task creation works with keyboard only
- No keyboard traps
- Enter key submits forms

#### 10.2 Screen Reader Compatibility

**Steps:**

1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to `/render-strategy`
3. Listen to page structure announcements
4. Navigate to task creation form
5. Create a task while listening to feedback
6. Verify success/error messages are announced

**Expected Results:**

- Page structure is semantic and well-announced
- Form labels are properly associated
- Button states are announced (disabled, loading)
- Success/error messages are announced
- Task list updates are announced
- ARIA labels are appropriate

**Note**: This test may require manual verification or specialized tooling.

#### 10.3 Color Contrast & Visual Indicators

**Steps:**

1. Navigate to `/render-strategy`
2. Use browser DevTools to check color contrast ratios
3. Verify task completion uses more than just color (checkmark icon)
4. Check focus indicators meet WCAG standards
5. Test in high contrast mode (if available)

**Expected Results:**

- Text meets WCAG AA contrast standards (4.5:1 minimum)
- Task completion uses icon + color
- Focus indicators are clearly visible
- UI remains usable in high contrast mode
- Color is not the only indicator of state

---

## Test Data Requirements

### User Accounts

- **Primary Test User**:
  - Email: `akshat-test@test.com`
  - Password: `akshat-test`
  - Should exist in WorkOS dashboard
  - Should have test data in database

- **Secondary Test User** (Optional, for multi-user testing):
  - Email: TBD
  - Password: TBD

### Test Data Conventions

**Task Naming**:

- Prefix test tasks with identifiable patterns
- Include timestamps to ensure uniqueness
- Examples:
  - `"Test Task QI - 1699872345"`
  - `"Sequential Task 1"`
  - `"User 1 Task - [timestamp]"`

**Data Cleanup**:

- Tests should ideally clean up their data after completion
- Consider a "cleanup" test that runs at the end
- Alternatively, use a test database that's reset between runs

---

## Expected Behaviors & Success Criteria

### Authentication

- Sign-in redirects to WorkOS, then back to app
- Protected routes redirect unauthenticated users
- Session persists across page refreshes
- Sign-out clears session and redirects appropriately

### Task Management

- All CRUD operations work correctly
- Data is user-scoped (no cross-user access)
- Optimistic updates roll back on failure
- Cache strategies perform as expected

### Error Handling

- Network errors are caught and displayed
- Authentication errors trigger appropriate redirects
- Validation prevents invalid data submission
- UI remains stable during errors

### Performance

- Server-side prefetching provides instant initial render
- Mutation strategies show measurable performance differences
- Page loads remain fast with growing data sets

### Accessibility

- All features accessible via keyboard
- Screen reader compatible
- Sufficient color contrast
- Proper ARIA labels and semantics

---

## Implementation Notes

### Authentication Setup in Tests

**Recommended Approach**:

```typescript
// In test setup or before authenticated tests
test.describe("Authenticated User Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto("http://localhost:3000/api/login");

    // Wait for WorkOS page
    await page.waitForURL(/https:\/\/auth.*workos\.com/);

    // Fill in credentials
    await page.fill('input[name="email"]', "akshat-test@test.com");
    await page.fill('input[name="password"]', "akshat-test");

    // Submit and wait for redirect
    await page.click('button[type="submit"]');
    await page.waitForURL("http://localhost:3000/");

    // Verify authentication
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  // Individual test cases follow...
});
```

**Important Considerations**:

1. WorkOS page structure may vary - inspect actual elements
2. Cookie persistence may require context storage
3. Consider shared authentication state across tests
4. Session expiration timing may affect long-running tests

### tRPC Testing

Tests interact with tRPC through the UI, but understanding the underlying procedures helps:

**Available Task Procedures** (from `src/server/api/routers/task.ts`):

- `task.getAll` - Get all tasks for authenticated user
- `task.getById` - Get single task by ID
- `task.create` - Create new task
- `task.toggleComplete` - Toggle task completion status
- `task.updatePriority` - Update task priority (0-10)
- `task.delete` - Delete task

All procedures except public ones require authentication (throw UNAUTHORIZED if not authenticated).

### Database Schema Reference

**Task Model**:

```prisma
model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  completed   Boolean  @default(false)
  priority    Int      @default(0)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### CI/CD Considerations

When running in CI:

1. Ensure database is available (may need Docker container)
2. Set `baseURL` in playwright.config.ts
3. Consider using `webServer` config to start dev server
4. Store test credentials securely (environment variables)
5. Use headed vs headless mode appropriately
6. Configure retry logic for flaky tests

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **WorkOS Impersonation**: Tests depend on external WorkOS service availability
2. **Test Data Isolation**: Tests may interfere with each other if run in parallel
3. **UI Elements**: Some UI controls (delete buttons, checkboxes) may not be exposed yet
4. **Error Simulation**: Requires additional tooling to simulate server errors

### Future Enhancements

1. **Mock Authentication**: Consider mocking WorkOS for faster, isolated tests
2. **Test Fixtures**: Create fixture data for consistent test scenarios
3. **Visual Regression**: Add screenshot comparison tests
4. **API Testing**: Direct tRPC API testing alongside E2E tests
5. **Load Testing**: Test with many concurrent users
6. **Mobile Testing**: Add mobile viewport and touch interaction tests

---

## Appendix

### Useful URLs

- Home (Public): `http://localhost:3000/`
- Docs (Public): `http://localhost:3000/docs`
- Design Strategy (Protected): `http://localhost:3000/design-strategy`
- Render Strategy (Protected): `http://localhost:3000/render-strategy`
- Login: `http://localhost:3000/api/login`
- Callback: `http://localhost:3000/api/callback`

### Key Files Reference

**Authentication**:

- `src/middleware.ts` - Route protection
- `src/app/api/login/route.ts` - Login redirect
- `src/app/api/callback/route.ts` - OAuth callback
- `src/app/api/trpc/[trpc]/route.ts` - tRPC with auth context

**Task Management**:

- `src/server/api/routers/task.ts` - Task CRUD operations
- `src/app/render-strategy/page.tsx` - Task UI page
- `src/app/render-strategy/_components/` - Strategy implementations

**Configuration**:

- `.env` - Environment variables (test credentials)
- `playwright.config.ts` - Playwright configuration
- `prisma/schema.prisma` - Database schema

### Troubleshooting

**Issue**: WorkOS authentication page structure changes
**Solution**: Use Playwright codegen to inspect current structure: `npx playwright codegen http://localhost:3000/api/login`

**Issue**: Session cookies not persisting between tests
**Solution**: Use `storageState` to save/restore authentication state

**Issue**: tRPC UNAUTHORIZED errors in authenticated tests
**Solution**: Verify cookies are present, check middleware configuration, ensure user context is passed correctly

**Issue**: Tasks from previous test runs affecting results
**Solution**: Implement data cleanup in test teardown, or use database transactions that rollback

---

## Version History

- **v1.0** - Initial comprehensive test plan
- Created: 2025-11-02
- Author: Claude Code (Assisted)
- Project: T3 Stack Application with WorkOS Auth Testing
