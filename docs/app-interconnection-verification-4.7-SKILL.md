---
name: interconnect-verify
description: >
  Verify code interconnections between files by reading both sides of every connection.
  Trigger on: "verify connections", "check wiring", "test interconnections", "does this
  actually work together", "check imports", "verify integration", "cross-file check",
  "do the files match", "will this break", "check the contracts", "verify the interface",
  "trace the data flow", "check props", "verify API calls", "check what gets passed",
  "validate signatures", "are these compatible", "connection audit", "wiring check",
  "integration verify", "impact analysis", "what did I break", "downstream check",
  "upstream check", "trace this value", "where does this come from", "where is this used",
  "check the chain", "verify the pipeline", "self-check", "self-audit", "audit your changes",
  or any request to confirm that code in file A correctly connects to code in file B.
  Also triggers when Claude has just made changes across multiple files and the user asks
  "does it work", "is it correct", "did you break anything", "check your work", "verify that",
  "are you sure", "test it", "prove it works", "I don't trust that", "double check".
  Also triggers as a SELF-AUDIT when Claude completes multi-file changes — run §17 automatically
  before claiming work is done. Use alongside scope-context for large-scope verification
  and app-audit for full audits.
---

# INTERCONNECT VERIFICATION PROTOCOL v2.0

## Purpose

Solve one critical failure: **Claude claims code works together without verifying both sides of every connection.**

This happens because Claude:
- Reads File A, then later checks File B from memory of File A (stale/incomplete)
- Confirms "the import matches the export" without re-reading the export
- Reports "props look correct" without comparing caller and receiver simultaneously
- Says "the API call matches the handler" without reading the handler's actual shape
- Treats reading a file once as permanent knowledge (context degrades over long sessions)
- Hallucinates function signatures it wrote 20 messages ago
- Checks the "happy path" but ignores error, loading, empty, and edge-case paths
- Verifies names match but ignores argument order, count, and types
- Claims "should work" without running a single grep or file read

This skill forces Claude to **read both endpoints of every connection at verification time** — every single time, with zero exceptions.

---

## TABLE OF CONTENTS

| Code | Section | Purpose |
|------|---------|---------|
| | **CORE PROTOCOL** | |
| §0 | Core Rules | 8 governing rules — read first, always |
| §1 | Scope Selection | Define what to verify |
| §2 | Connection Inventory | List every connection to check |
| §3 | Dual-Read Verification | Read both sides, compare |
| §4 | Contract Checks | Type-level and shape-level matching |
| §5 | Data Flow Tracing | Follow data through multi-file chains |
| §6 | Findings Report | Structured output format |
| §7 | Quick Verify | Abbreviated protocol for small scope |
| | **EXTENDED PROTOCOL** | |
| §8 | Failure Pattern Library | 40 cataloged failure modes with code examples |
| §9 | Execution Commands | Bash commands for every verification step |
| §10 | Anti-Pattern Catalog | How Claude fails at verification + corrections |
| §11 | Impact Analysis | Find all downstream effects of a change |
| §12 | Session Degradation | Handle long sessions where context decays |
| §13 | Multi-File Chains | Verify connections spanning 4+ files |
| §14 | Conditional Connections | Connections that exist only under certain conditions |
| §15 | Next.js Contracts | App Router, Pages Router, server/client, middleware |
| §16 | Server/API Contracts | Express, middleware chains, database, WebSocket |
| §17 | Self-Audit Protocol | Claude verifying its own changes before claiming done |
| | **APPENDICES** | |
| §A | Kotlin/XML Contracts | Android-specific interconnection types (expanded) |
| §B | Edge Cases Catalog | Barrel exports, dynamic imports, computed keys |
| §C | Verification Tiers | Quick / Standard / Deep / Full modes |
| §D | 4.7 Compatibility | Prompt engineering for literal model behavior |
| §E | Companion Skill Integration | How to combine with scope-context, app-audit |
| §QR | Quick Reference | Checklists, grep commands, templates |

---

# §0 — CORE RULES

These rules govern every action in this skill. They are unconditional. They apply to every section.

### RULE 1: ALWAYS READ BOTH FILES AT VERIFICATION TIME

When verifying that File A connects correctly to File B:
1. Read the relevant section of File A using the file-reading tool. Right now. Not from memory.
2. Read the relevant section of File B using the file-reading tool. Right now. Not from memory.
3. Compare the two readings side-by-side in the same response.

"I already read that file earlier" is not acceptable. Read it again.
"The file hasn't changed" is not acceptable. Read it again.
"I just wrote that code so I know what's in it" is not acceptable. Read it again.

The only exception: If the file was read within the last 2 tool calls (literally the previous or second-previous tool result in this response), it is fresh enough. Anything older is stale.

### RULE 2: ALWAYS QUOTE THE EXACT CODE

Every verification claim includes the exact lines from both files.
Format: show the export/definition from the source file AND the import/usage from the consuming file.
Include line numbers. Do not paraphrase code. Do not summarize signatures. Copy the exact lines.

Example of CORRECT evidence:
```
SOURCE: hooks/useTeamData.js (line 42)
  return { data, loading, error, refetch };

CONSUMER: components/TeamCard.jsx (line 8)
  const { data, loading } = useTeamData(teamId);
```

Example of INCORRECT evidence:
```
The hook returns an object with data and loading, which the component destructures correctly.
```
The second example has zero evidence. It is a claim without proof. It is not acceptable.

### RULE 3: EVERY CONNECTION HAS A VERDICT

Each connection gets exactly one verdict:
- **✅ VERIFIED** — Both sides read, exact match confirmed, evidence quoted
- **⚠️ MISMATCH** — Both sides read, discrepancy found, both versions quoted
- **❌ BROKEN** — One side references something that does not exist in the other
- **🔍 UNVERIFIABLE** — Cannot read one or both files (state why)

"Looks good" is not a verdict. "Should work" is not a verdict. "Seems correct" is not a verdict.
"I believe this is correct" is not a verdict. "This appears to match" is not a verdict.
Only the four verdicts above are valid. Every verdict requires the quoted evidence from Rule 2.

### RULE 4: ALWAYS STATE WHAT WAS NOT CHECKED

After completing verification, list every connection type and aspect that was NOT covered.
Be specific. Examples:

Good: "Runtime behavior was not checked — only static wiring was verified. The useEffect dependency array in TeamCard.jsx was not analyzed for correctness. CSS specificity conflicts were not tested."

Bad: "Some things were not checked."

### RULE 5: POSITIVE COMPLETION GATE

Verification is complete only when every connection in the inventory (§2) has a verdict (Rule 3).
If any connection lacks a verdict, verification is incomplete. State which ones remain.
Present the completion ratio: "12/15 connections verified. Remaining: C08, C11, C15."

### RULE 6: GREP BEFORE CLAIMING COMPLETENESS

Before stating that all consumers of an export have been found, run grep/find commands to discover consumers.
Do not rely on memory of which files import from a given module.
The grep command is the ground truth. Context memory is unreliable for completeness claims.

### RULE 7: ONE CLAIM PER EVIDENCE BLOCK

Each verification block proves exactly one connection. Do not bundle multiple claims into one evidence block.

Wrong: "The import, props, and callback all match correctly ✅"
Right: Three separate evidence blocks — one for import, one for props, one for callback.

### RULE 8: SEVERITY CLASSIFICATION

Every ⚠️ MISMATCH and ❌ BROKEN finding includes a severity:

| Severity | Meaning | Impact |
|----------|---------|--------|
| **critical** | App will crash or produce corrupt data | Fix before any other work |
| **high** | Feature will malfunction for some users or some paths | Fix before deployment |
| **medium** | Silent failure — no crash but wrong behavior or missing feedback | Fix in current session |
| **low** | Cosmetic or defensive — works now but fragile under change | Fix when convenient |
| **info** | Not broken but worth noting (unused exports, redundant checks, etc.) | Optional cleanup |


---

# §1 — SCOPE SELECTION

## Step 1.1: Identify the verification target

Ask or determine: What is being verified?

| Scope Type | Description | Example | Typical Connections | Use Tier (§C) |
|------------|-------------|---------|-------------------|---------------|
| **File pair** | Two specific files | "Check that utils.js exports match page.jsx imports" | 1-5 | Quick |
| **Change set** | Files modified in recent work | "Verify the changes I just made work together" | 3-20 | Standard |
| **Feature** | All files involved in one feature | "Verify the auth flow end-to-end" | 10-40 | Standard/Deep |
| **Module boundary** | All connections crossing a directory boundary | "Verify components/ connects correctly to hooks/" | 10-50 | Deep |
| **Full app** | Every cross-file connection | "Full wiring check" (use with scope-context skill) | 50-500+ | Full |

For **Change set** scope: Read the git diff or the list of recently modified files. Run:
```bash
git diff --name-only HEAD~1    # last commit
git diff --name-only           # unstaged changes
git diff --staged --name-only  # staged changes
```

For **Self-audit** scope (§17): Use change set of everything Claude modified in the current session.

## Step 1.2: Enumerate files in scope

List every file that participates in the verification scope. Read the directory structure to discover files — do not rely on memory of what files exist.

```
SCOPE MANIFEST
══════════════════════════════════════════════════════════
Target: [description]
Root: [project root path]
Files in scope:
  1. src/components/TeamCard.jsx        (modified)
  2. src/components/TeamCard.module.css  (modified)
  3. src/hooks/useTeamData.js           (modified)
  4. src/utils/formatStats.js           (unchanged — consumer)
  5. src/pages/teams.jsx                (unchanged — parent)
  6. src/pages/api/teams.js             (unchanged — API)
Total: 6 files (3 modified, 3 dependents)
══════════════════════════════════════════════════════════
```

For change set scopes, always include BOTH the modified files AND their dependents.
Dependents are found via grep commands in §9.1.

## Step 1.3: Identify the connection types present

Read each file's import section (first 50 lines) AND export section (last 30 lines or explicit exports).

| Connection Type | Code | What to Look For |
|-----------------|------|-----------------|
| **Import/Export** | CT-IE | `import { X } from`, `export function X`, `export default`, `module.exports` |
| **React Props** | CT-RP | `<Component propA={value} />` in parent, `function Component({ propA })` in child |
| **Hook Returns** | CT-HR | `const { data } = useHook()` in consumer, `return { data }` in hook |
| **Hook Arguments** | CT-HA | `useHook(arg1, arg2)` in consumer, `function useHook(p1, p2)` in hook |
| **Context Provider/Consumer** | CT-CX | `useContext(Ctx)` in consumer, `<Ctx.Provider value={}>` in provider |
| **API Calls** | CT-AC | `fetch('/api/X')` in client, handler in `pages/api/X.js` or `app/api/X/route.js` |
| **Callback Props** | CT-CB | `onEvent={handler}` in parent, `props.onEvent(args)` in child |
| **Render Props** | CT-RN | `render={data => <X />}` in parent, `props.render(data)` in child |
| **ForwardRef** | CT-FR | `ref={myRef}` in parent, `forwardRef((props, ref) => ...)` in child |
| **Store/State** | CT-SS | `useSelector(state => state.X)`, `dispatch(action(payload))` |
| **CSS/Class** | CT-CS | `className="x"` or `styles.x` in JSX, `.x { }` in CSS |
| **CSS Variables** | CT-CV | `var(--color-primary)` in CSS, `--color-primary:` in root/theme |
| **Env/Config** | CT-EC | `process.env.NEXT_PUBLIC_X` in code, `NEXT_PUBLIC_X=` in `.env` |
| **Type/Interface** | CT-TI | `import type { X }` in consumer, `export type X` in source |
| **Event Emitter** | CT-EE | `emit('event', data)` in source, `on('event', handler)` in listener |
| **Route Params** | CT-RT | `router.push('/team/[id]')`, `const { id } = router.query` |
| **Dynamic Import** | CT-DI | `dynamic(() => import('./X'))`, `React.lazy(() => import('./X'))` |
| **Barrel Re-export** | CT-BR | `export { X } from './X'` in index.js |
| **Server/Client Boundary** | CT-SC | `'use client'` / `'use server'` directives |
| **Middleware** | CT-MW | `middleware.ts` pattern matching, headers/cookies set/read |
| **Layout/Page** | CT-LP | `layout.tsx` wrapping `page.tsx`, shared context |
| **Loading/Error** | CT-LE | `loading.tsx` / `error.tsx` expectations matching page |
| **Config File** | CT-CF | `next.config.js`, `tailwind.config.js`, `tsconfig.json` |
| **Package Scripts** | CT-PJ | Script commands referencing files that must exist |
| **Image/Asset** | CT-IA | `import img from './x.png'` or `<img src="/x.png">` — file must exist |
| **JSON/Data** | CT-JD | `import data from './data.json'`, shape must match usage |

---

# §2 — CONNECTION INVENTORY

## Step 2.1: Build the connection list

For each file in scope, read the file and extract every outgoing connection.
Use grep commands from §9 to ensure completeness. Do not rely on a single read-through.

```
CONNECTION INVENTORY
══════════════════════════════════════════════════════════════════════════
ID  │ Type  │ Source File:Line        │ Target File              │ What
────┼───────┼────────────────────────┼──────────────────────────┼───────
C01 │ CT-IE │ TeamCard.jsx:3         │ useTeamData.js           │ { useTeamData }
C02 │ CT-IE │ TeamCard.jsx:4         │ formatStats.js           │ { formatDPS, formatStat }
C03 │ CT-RP │ TeamsPage.jsx:22       │ TeamCard.jsx             │ team, onSelect, isActive
C04 │ CT-HR │ TeamCard.jsx:8         │ useTeamData.js           │ { data, loading }
C05 │ CT-HA │ TeamCard.jsx:8         │ useTeamData.js           │ (teamId) → (teamId)
C06 │ CT-AC │ useTeamData.js:15      │ pages/api/teams.js       │ GET /api/teams?id=
C07 │ CT-CB │ TeamCard.jsx:31        │ TeamsPage.jsx            │ onSelect(team.id)
C08 │ CT-CS │ TeamCard.jsx:12        │ TeamCard.module.css      │ styles.card, styles.active
C09 │ CT-EC │ useTeamData.js:2       │ .env.local               │ NEXT_PUBLIC_API_BASE
C10 │ CT-IA │ TeamCard.jsx:15        │ public/icons/team.svg    │ /icons/team.svg
══════════════════════════════════════════════════════════════════════════
Total connections to verify: 10
```

## Step 2.2: Completeness check via grep

Run discovery commands BEFORE presenting the inventory:

```bash
# For each modified file, find all its consumers
for f in $(git diff --name-only); do
  echo "=== Consumers of $(basename $f) ==="
  basename_no_ext=$(basename "$f" | sed 's/\.[^.]*$//')
  grep -rln "$basename_no_ext" src/ --include="*.js" --include="*.jsx" \
    --include="*.ts" --include="*.tsx" --include="*.css" | grep -v "$f"
done
```

If grep finds consumers not in the inventory, add them.
If grep finds files that import from a modified file, those files MUST be in scope even if unchanged.

## Step 2.3: Categorize by risk

Before presenting, sort by estimated risk:

| Risk Level | Why | Verify First |
|------------|-----|-------------|
| **High** | Modified file + modified consumer = both sides changed | Yes |
| **Medium** | Modified file + unchanged consumer = one side changed | Second |
| **Low** | Unchanged file + unchanged consumer = no changes but user asked | Last |
| **Critical** | Any connection involving API calls, auth, payments, or data writes | Always first |

## Step 2.4: User confirmation gate

Present the connection inventory to the user. Ask:
"I found [N] connections to verify across [M] files. [H] are high-risk. Proceed with all, or select specific ones?"

This gate is mandatory. Do not skip it. The user may know about connections this scan missed.
If the user says "all" or "go ahead", proceed with every connection.
If the user selects specific ones, verify only those but still report what was skipped.

---

# §3 — DUAL-READ VERIFICATION

This is the core protocol. Execute it for every connection in the inventory.

## For each connection:

### Step 3.1: Read the SOURCE side

Read the file that defines/exports/provides the thing.
Quote the exact lines with line numbers.

```
SOURCE: hooks/useTeamData.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Line 5:  export function useTeamData(teamId) {
Line 6:    const [data, setData] = useState(null);
Line 7:    const [loading, setLoading] = useState(true);
Line 8:    const [error, setError] = useState(null);
...
Line 38:   return { data, loading, error, refetch };
Line 39: }
```

### Step 3.2: Read the CONSUMER side

Read the file that imports/uses/calls the thing.
Quote the exact lines with line numbers.

```
CONSUMER: components/TeamCard.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Line 3:  import { useTeamData } from '../hooks/useTeamData';
...
Line 8:  const { data, loading } = useTeamData(props.teamId);
```

### Step 3.3: Run the comparison checklist

For EVERY connection, check ALL of the following that apply:

| # | Check | Question | How to Verify |
|---|-------|----------|---------------|
| 1 | **Name exists** | Does the imported name exist as an export in the source? | Find the exact `export` statement |
| 2 | **Export type** | Named vs default — does the import syntax match? | `import X` (default) vs `import { X }` (named) |
| 3 | **Path resolves** | Does the relative path from consumer resolve to source? | Trace the path from consumer's directory |
| 4 | **File extension** | Does the path need/omit extension correctly? | Check if bundler resolves `.js`/`.jsx`/`.ts`/`.tsx` |
| 5 | **Argument count** | Does the call pass the same number of args as params? | Count params in definition, count args at call site |
| 6 | **Argument order** | Are args in the correct positional order? | Compare param names to the expressions passed |
| 7 | **Argument types** | Are the types compatible? | Check what consumer passes vs what source expects |
| 8 | **Return shape** | Does destructuring match the actual return object? | Compare `return { }` to `const { } =` |
| 9 | **Unused returns** | Does consumer ignore return values that matter? | Is `error` returned but not consumed? |
| 10 | **Default values** | Are missing optional params handled with defaults? | Check for `= defaultValue` in param list |
| 11 | **Null safety** | Does consumer handle null/undefined from source? | Check for `?.`, `??`, `if (x)` guards |
| 12 | **Async match** | If source is async, does consumer await it? | `async` in source, `await` at call site |
| 13 | **Conditional existence** | Is export behind a conditional or platform check? | Check if export is always available |
| 14 | **Circular reference** | Does A import B which imports A? | Check both files' imports |

### Step 3.4: Record the verdict

Use this exact template for every connection:

```
CONNECTION C04: CT-HR — useTeamData.js → TeamCard.jsx (Hook Return Shape)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SOURCE (useTeamData.js:38):
  return { data, loading, error, refetch };

CONSUMER (TeamCard.jsx:8):
  const { data, loading } = useTeamData(props.teamId);

CHECK RESULTS:
  #1  Name exists:     ✅ useTeamData exported at line 5
  #2  Export type:     ✅ Named export, named import — match
  #3  Path resolves:   ✅ ../hooks/useTeamData → hooks/useTeamData.js exists
  #8  Return shape:    ✅ data — exists in return object
                       ✅ loading — exists in return object
                       ⚠️ error — returned but not destructured
                       ⚠️ refetch — returned but not destructured
  #9  Unused returns:  ⚠️ error is available but not consumed
  #11 Null safety:     🔍 data initialized as null (line 6), consumer does not null-check

VERDICT: ⚠️ MISMATCH
  SEVERITY: medium
  ISSUE 1: error state returned by hook is silently dropped.
    TeamCard will show stale/null data on fetch failure with no user feedback.
  ISSUE 2: data is null on first render — consumer should guard against null.
  FIX: Destructure error. Add error UI. Add null guard: `if (!data) return <Loading />`.
```

### Step 3.5: Advance to next connection

After recording the verdict, move to the next connection in the inventory.
Do not batch connections. Verify one at a time.
After every 5 connections, state progress: "5/10 connections verified."

### Step 3.6: Handle discovery of NEW connections during verification

While reading files for verification, new connections may be discovered that were not in the original inventory.
When this happens:
1. Note the new connection: "DISCOVERED: C11 — TeamCard.jsx also imports { cn } from utils/cn.js"
2. Add it to the inventory.
3. Verify it after completing the current connection.
4. Update the total count.

---

# §4 — CONTRACT CHECKS

Deeper sub-protocols for specific connection types. Use the appropriate sub-protocol inside §3 when the connection type matches.

## §4.1: React Prop Contracts (CT-RP)

For every `<Component prop={value} />` usage:

### Step 4.1.1: Read the parent file
Find every prop passed to the component. List each prop name and its value expression.

### Step 4.1.2: Read the child file
Find the component's parameter destructuring OR propTypes/TypeScript interface. List each expected prop.

### Step 4.1.3: Cross-reference

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | **Missing required props** | Props in child's interface with no default value that parent does not pass |
| 2 | **Extra props** | Props parent passes that child never reads (silently ignored) |
| 3 | **Type mismatch** | Parent passes `string` where child expects `number` (check usage, not just names) |
| 4 | **Rename drift** | Similar but different names: `onPress` vs `onClick`, `isActive` vs `active` |
| 5 | **Stale props** | Props that existed in a previous version of the child but were removed |
| 6 | **Spread props** | Parent uses `{...obj}` — what keys does obj have? Do they match child expectations? |
| 7 | **Children prop** | Child uses `props.children` — does parent actually pass children? |
| 8 | **Conditional props** | Parent passes prop only in some branches — child always expects it |
| 9 | **Default value mismatch** | Child defaults to `[]` but parent sometimes passes `null` |
| 10 | **Ref forwarding** | Parent passes `ref` — does child use `forwardRef`? |
| 11 | **Key prop** | In a list render, is `key` provided and stable? |
| 12 | **Event handler signature** | `onClick` passes `(e)` but parent handler expects `(id, e)` |

### Step 4.1.4: Detect prop drilling gaps

When a prop flows through intermediate components:
```
GrandParent → Parent → Child
             (must forward the prop)
```

Read all three files. Verify:
- GrandParent passes prop to Parent
- Parent's parameter list includes that prop
- Parent passes it to Child
- Child's parameter list includes it

A common failure: Parent is refactored and the drilled prop is dropped from its parameter list.

### Step 4.1.5: Example verdict

```
CONNECTION C03: CT-RP — TeamsPage.jsx → TeamCard.jsx (Props)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARENT (TeamsPage.jsx:22-24):
  <TeamCard
    team={team}
    onSelect={handleTeamSelect}
    isActive={selectedId === team.id}
  />

CHILD (TeamCard.jsx:5):
  export default function TeamCard({ team, onSelect, className }) {

CROSS-REFERENCE:
  ✅ team — passed by parent, received by child
  ✅ onSelect — passed by parent, received by child
  ❌ isActive — passed by parent, NOT in child's destructuring
  ❌ className — in child's destructuring, NOT passed by parent

VERDICT: ❌ BROKEN
  SEVERITY: high
  ISSUE 1: isActive is passed but never received — the active state visual will never appear.
  ISSUE 2: className is expected but never provided — child may have visual issues
    if it uses className for conditional styling.
  FIX: Add isActive to child destructuring. Either pass className from parent
    or give it a default value in child.
```

## §4.2: Hook Return/Argument Contracts (CT-HR, CT-HA)

For every custom hook usage:

### Step 4.2.1: Read the hook definition
Extract: parameter list (with defaults), return statement, any thrown errors, any conditional returns.

### Step 4.2.2: Read the consumer
Extract: arguments passed, destructured return values, error handling.

### Step 4.2.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Param count** | Hook expects 2 params, consumer passes 1 or 3 |
| 2 | **Param types** | Hook expects `string` ID, consumer passes `number` |
| 3 | **Optional params** | Hook has default for param 2 — consumer relies on that default |
| 4 | **Return keys** | Consumer destructures keys that don't exist in return |
| 5 | **Return type changes** | Hook conditionally returns different shapes (early return `null` vs object) |
| 6 | **Dependency array** | Hook internally uses useEffect with deps — are they consistent? |
| 7 | **Re-render triggers** | Hook creates new objects/arrays on every call — consumer will re-render |
| 8 | **Cleanup** | Hook sets up subscription/timer — does it clean up? Consumer won't know |
| 9 | **Stale closure** | Hook captures props/state in callbacks — are they current? |
| 10 | **Multiple consumers** | Two components use the same hook — do they expect the same shape? |

### Step 4.2.4: Verify all consumers agree

When multiple components use the same hook, verify ALL of them expect the same return shape:
```bash
grep -rn "useTeamData" src/ --include="*.jsx" --include="*.tsx"
```

List every consumer's destructuring pattern. They must all be compatible with the hook's return.

## §4.3: API Route Contracts (CT-AC)

For every `fetch()` / `axios` / API call:

### Step 4.3.1: Read the calling file
Extract: HTTP method, URL path, query parameters, request body shape, expected response shape, error handling.

### Step 4.3.2: Read the API handler file
Extract: handled HTTP methods, request body parsing, query parameter usage, response body shape, error responses, status codes.

### Step 4.3.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Method match** | Client sends GET, handler checks `req.method === 'GET'` |
| 2 | **Path match** | Client URL resolves to the correct handler file |
| 3 | **Query params** | Client sends `?id=123`, handler reads `req.query.id` |
| 4 | **Request body** | POST body fields match handler's `req.body.X` reads |
| 5 | **Response shape** | Fields client destructures exist in handler's `res.json()` call |
| 6 | **Status codes** | Client handles the error codes handler can return (400, 401, 404, 500) |
| 7 | **Auth** | Client sends auth headers/cookies, handler validates them |
| 8 | **Content-Type** | Client sends JSON, handler parses JSON (not form data) |
| 9 | **CORS** | If cross-origin, handler allows the client's origin |
| 10 | **Rate limiting** | Handler rate-limits, client handles 429 responses |
| 11 | **Pagination** | Client expects `{ items, nextCursor }`, handler returns that shape |
| 12 | **Error body** | Client reads `error.message` from error responses — handler sends it |

### Step 4.3.4: Verify the response transformation chain

Often the data passes through multiple transformations:
```
API handler res.json({ teams: [...] })
  → fetch response.json()
    → hook setState(data.teams)
      → component reads state.map(team => ...)
```

Trace the field name at each step. A common bug: handler returns `{ teams }`, client reads `data.teams` correctly, but hook stores it as `data` (losing the `teams` wrapper), so component receives `[{...}]` but reads `.teams` on it.

## §4.4: Context Provider/Consumer Contracts (CT-CX)

### Step 4.4.1: Read the context definition
Extract: `createContext(defaultValue)`, the type of value.

### Step 4.4.2: Read the provider
Extract: What is passed as `value` prop. What state/computed values make up the context value.

### Step 4.4.3: Read every consumer
Extract: What each `useContext()` call destructures from the context.

### Step 4.4.4: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Provider exists in tree** | Consumer's component is inside the Provider's render tree |
| 2 | **Value shape** | Consumer destructures fields that exist in provider's `value` |
| 3 | **Default value** | If no provider in tree, does `createContext(default)` prevent crash? |
| 4 | **Stale value** | Provider re-renders — does value change reference? (object literal = new ref every render) |
| 5 | **Multiple providers** | Nested providers — consumer gets nearest one, is that intended? |
| 6 | **Missing provider** | Consumer is rendered outside the provider tree entirely |

### Step 4.4.5: Verify provider placement

This requires reading the component tree. In Next.js:
- Check if provider is in `_app.tsx` / `layout.tsx` (wraps all pages)
- Or if it's in a specific page (only wraps that page's children)

A consumer in Page B will crash if the provider is only in Page A's tree.

## §4.5: CSS/Styling Contracts (CT-CS, CT-CV)

### Step 4.5.1: Read the component
Extract every `className` value — both static and dynamic. Include conditional classes.

### Step 4.5.2: Read the CSS file
Extract every selector.

### Step 4.5.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Class exists** | Every className in JSX has a matching CSS rule |
| 2 | **Module export** | CSS Modules: every `styles.X` has a matching `.X` in the module |
| 3 | **Dynamic classes** | `className={active ? 'x-active' : 'x-idle'}` — both classes exist |
| 4 | **CSS variable defined** | `var(--color-primary)` — is `--color-primary` defined somewhere? |
| 5 | **CSS variable scope** | Variable defined in `:root` vs `.theme-dark` — is it in scope? |
| 6 | **Tailwind classes** | If using Tailwind, are custom classes in `tailwind.config.js`? |
| 7 | **Specificity conflicts** | Two rules target same element with conflicting styles |
| 8 | **Media queries** | Responsive classes exist but media query breakpoints don't match |
| 9 | **Unused CSS** | CSS rules that no component references (dead CSS) |
| 10 | **Import path** | `import styles from './X.module.css'` — file exists at that path |

## §4.6: Store/State Management Contracts (CT-SS)

### Step 4.6.1: Read the store definition
Extract: state shape (initial state), action names, action payload shapes, reducer logic.

### Step 4.6.2: Read every consumer
Extract: selector paths, dispatched actions, dispatch payloads.

### Step 4.6.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Selector path** | `state.teams.list` — does `teams` slice exist? Does it have `list`? |
| 2 | **Action name** | `dispatch(setTeam(data))` — does `setTeam` action exist in the slice? |
| 3 | **Payload shape** | Action expects `{ id, name }`, caller passes `{ teamId, teamName }` |
| 4 | **Initial state** | Component assumes `state.teams.list` is array — is initial state `[]`? |
| 5 | **Selector return type** | Selector returns full state when component expects one field |
| 6 | **Action side effects** | Thunk/saga triggered — does the consumer handle loading/error states? |
| 7 | **Store registration** | Slice is defined but is it registered in the store's `combineReducers`? |

## §4.7: Environment Variable Contracts (CT-EC)

### Step 4.7.1: Discover all env var usage
```bash
grep -rn "process\.env\.\|import\.meta\.env\." src/ --include="*.{js,jsx,ts,tsx}"
```

### Step 4.7.2: Read all .env files
```bash
cat .env .env.local .env.development .env.production 2>/dev/null
```

### Step 4.7.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Defined** | Every env var used in code exists in at least one .env file |
| 2 | **Prefix** | Client-side code only uses `NEXT_PUBLIC_` prefixed vars (Next.js) |
| 3 | **Type coercion** | Code does `parseInt(process.env.PORT)` — env is always string, is it handled? |
| 4 | **Fallback** | `process.env.X || 'default'` — is the default sensible? |
| 5 | **Secret exposure** | Server-only env var accidentally used in client code |
| 6 | **Prod vs dev** | Var defined in `.env.local` but missing from `.env.production` |
| 7 | **Empty string** | Env var is defined but set to `""` — does code handle empty string? |

## §4.8: Type/Interface Contracts (CT-TI) — TypeScript

### Step 4.8.1: Read the type definition file
Extract: exported types, interfaces, enums, type aliases.

### Step 4.8.2: Read every consumer
Extract: imported types, how they're used (parameter types, return types, variable annotations).

### Step 4.8.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Type exists** | Imported type is actually exported from source |
| 2 | **Shape match** | Code creates objects matching the type — all required fields present? |
| 3 | **Enum values** | Code uses enum member that exists in the enum definition |
| 4 | **Generic params** | `MyType<string>` — does the type accept a generic parameter? |
| 5 | **Union handling** | Type is `A | B` — does consumer handle both variants? |
| 6 | **Optional fields** | Consumer accesses `obj.field` but field is optional — null check? |
| 7 | **Readonly** | Consumer tries to mutate a `readonly` field |
| 8 | **Index signatures** | Code accesses `obj[key]` — does the type have an index signature? |

## §4.9: Event Emitter Contracts (CT-EE)

### Step 4.9.1: Find the emitter
```bash
grep -rn "\.emit\(.*['\"]" src/ --include="*.{js,jsx,ts,tsx}"
```

### Step 4.9.2: Find all listeners
```bash
grep -rn "\.on\(.*['\"].*\|\.addEventListener\(" src/ --include="*.{js,jsx,ts,tsx}"
```

### Step 4.9.3: Cross-reference

| # | Check | Detail |
|---|-------|--------|
| 1 | **Event name** | Emitter fires `'teamUpdate'`, listener subscribes to `'teamUpdate'` (exact string match) |
| 2 | **Payload shape** | Emitter sends `{ id, name }`, listener handler expects `{ id, name }` |
| 3 | **Listener cleanup** | Listener is added in mount — is it removed in unmount/cleanup? |
| 4 | **Multiple listeners** | Multiple files listen to same event — all handle the same payload shape? |
| 5 | **Order dependency** | Listener expects to run after another listener — no ordering guarantees |

## §4.10: Image/Asset Contracts (CT-IA)

### Step 4.10.1: Find all asset references
```bash
grep -rn "src=['\"]/" src/ --include="*.{jsx,tsx}"
grep -rn "import.*from.*\.\(png\|jpg\|svg\|webp\|gif\|ico\)" src/ --include="*.{js,jsx,ts,tsx}"
```

### Step 4.10.2: Verify files exist
```bash
# For public/ references
for f in $(grep -roh "src=\"/[^\"]*\"" src/ --include="*.jsx" | sed 's/src="//;s/"//'); do
  [ -f "public$f" ] && echo "✅ $f" || echo "❌ MISSING: public$f"
done
```

---

# §5 — DATA FLOW TRACING

For complex features that span 3+ files, trace the full path of data through the system.

## Step 5.1: Identify the data flow

Map the flow from trigger to final effect:

```
DATA FLOW: Team Selection
━━━━━━━━━━━━━━━━━━━━━━━━━
User clicks team card
  → TeamCard calls onSelect(team.id)           [TeamCard.jsx:31]
    → TeamsPage.handleSelect receives (id)      [TeamsPage.jsx:15]
      → router.push(`/team/${id}`)              [TeamsPage.jsx:17]
        → TeamDetail page mounts                [pages/team/[id].jsx]
          → reads router.query.id               [pages/team/[id].jsx:8]
            → useTeamDetail(id) called          [hooks/useTeamDetail.js:5]
              → fetch(`/api/teams/${id}`)        [hooks/useTeamDetail.js:12]
                → API handler processes request [pages/api/teams/[id].js]
                  → database query              [pages/api/teams/[id].js:15]
                    → response flows back       [...all the way to UI]
```

## Step 5.2: Trace each handoff

For each arrow (→) in the flow, this is a connection. Read both sides.

Pay special attention to these handoff bugs:

### 5.2.1: Type coercion at boundaries
```
COMMON BUG: router.query.id is always a string.
  If database expects number: parseInt is needed.
  If parseInt receives undefined: returns NaN.
  If NaN reaches SQL query: silent wrong results or crash.

VERIFY: Read the code at each boundary where the value crosses a type domain:
  URL string → router.query (string) → hook param (should validate) → fetch URL (string)
    → API handler query parse (should parse) → database query (depends on DB types)
```

### 5.2.2: Null/undefined propagation
```
COMMON BUG: Middle layer receives null but forwards without checking.
  Hook returns { data: null } during loading.
  Component reads data.teams — TypeError: Cannot read property 'teams' of null.

VERIFY: At every handoff, check: Can the value be null/undefined at this point?
  If yes: Does the receiving code guard against it?
```

### 5.2.3: Array vs single item confusion
```
COMMON BUG: API returns [team] (array with one item).
  Component treats response as team (single object).
  Component reads team.name — gets undefined (arrays don't have .name).

VERIFY: At every handoff, confirm: Is this value an array or a single item?
  Check both the sender's output type and the receiver's access pattern.
```

### 5.2.4: Key renaming across boundaries
```
COMMON BUG: API returns { team_id, team_name } (snake_case).
  Frontend expects { teamId, teamName } (camelCase).
  No transformation layer between them.

VERIFY: Compare the exact field names at each boundary.
  If a transformation function exists, verify it covers all fields.
```

### 5.2.5: Missing await in async chains
```
COMMON BUG: Function A is async. Function B calls A() without await.
  B receives a Promise object, not the resolved value.
  B passes Promise to C — C crashes or shows "[object Promise]".

VERIFY: For every async function call in the chain:
  Is the call site using await? Or .then()? Or is it fire-and-forget (intentional)?
```

## Step 5.3: Record the chain verdict

```
DATA FLOW: Team Selection (8 handoffs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
H1 TeamCard.onSelect → TeamsPage.handleSelect:     ✅ id passed as number (team.id)
H2 TeamsPage → router.push:                         ✅ id interpolated into URL template
H3 URL → TeamDetail page mount:                     ✅ [id].jsx matches URL pattern
H4 router.query.id → useTeamDetail param:            ⚠️ string from query, no parseInt
H5 useTeamDetail → fetch URL:                        ✅ id embedded in URL string
H6 fetch response → hook state:                      ✅ response.json() parsed correctly
H7 API handler → database query:                     ❌ parseInt(id) with no NaN guard
H8 database result → API response → hook → component: ✅ shape matches at each step

FLOW VERDICT: ❌ BROKEN at H7
  SEVERITY: high
  If router.query.id is undefined (direct URL access without id parameter),
  parseInt(undefined) returns NaN. SQL query with NaN: unpredictable results.
  FIX: Add validation in API handler: if (isNaN(id)) return res.status(400).json({...})
  ALSO: H4 is a ⚠️ — useTeamDetail should parseInt + validate its input too.
```

## Step 5.4: Verify the return path

Data flows in BOTH directions. After tracing the forward path (user action → database), trace the return path (database → UI):

```
RETURN PATH:
  DB result → API handler formats response → res.json({ team: {...} })
    → fetch .json() → { team: {...} }
      → hook setState(result.team) → stores the team object
        → component reads data.name, data.stats, etc.

VERIFY at each return step:
  - API handler: Does res.json() include all fields the component needs?
  - Hook: Does it store the right portion of the response?
  - Component: Does it access fields that actually exist in the stored data?
```

---

# §6 — FINDINGS REPORT

## Template

After all connections are verified, produce this report:

```
╔══════════════════════════════════════════════════════════╗
║         INTERCONNECTION VERIFICATION REPORT             ║
║         [Project Name] — [Date] — [Scope Description]   ║
╠══════════════════════════════════════════════════════════╣

SCOPE: [what was verified — e.g., "Change set from branch feature/team-card"]
FILES: [N] files examined
CONNECTIONS: [N] total, [N] verified

SUMMARY:
  ✅ Verified:      [N]  ([%])
  ⚠️ Mismatches:    [N]  ([%])
  ❌ Broken:        [N]  ([%])
  🔍 Unverifiable:  [N]  ([%])

SEVERITY BREAKDOWN:
  Critical: [N]   High: [N]   Medium: [N]   Low: [N]   Info: [N]

════════════════════════════════════════════════════════════
CRITICAL & HIGH — Fix before deployment
════════════════════════════════════════════════════════════

[C##] [Type Code] — [Source File:Line] → [Target File:Line]
  VERDICT: [❌/⚠️]  SEVERITY: [critical/high]
  PROBLEM: [exact description of the mismatch/break]
  SOURCE CODE:
    [exact lines from source file]
  CONSUMER CODE:
    [exact lines from consumer file]
  IMPACT: [what happens at runtime if not fixed]
  FIX: [specific code change needed]

════════════════════════════════════════════════════════════
MEDIUM & LOW — Fix in current session / when convenient
════════════════════════════════════════════════════════════

[same format as above, grouped by severity]

════════════════════════════════════════════════════════════
INFO — Optional cleanup
════════════════════════════════════════════════════════════

[same format, brief]

════════════════════════════════════════════════════════════
NOT VERIFIED — Out of scope or unreadable
════════════════════════════════════════════════════════════

  1. [what was not checked and why]
  2. [what was not checked and why]

════════════════════════════════════════════════════════════
DISCOVERED DURING VERIFICATION — New connections found
════════════════════════════════════════════════════════════

  [connections found during verification that weren't in original inventory]

╚══════════════════════════════════════════════════════════╝
```

---

# §7 — QUICK VERIFY

Abbreviated protocol for small scope (1-3 connections). Use when:
- User says "quick check"
- Verifying a single recent change
- Checking one specific file pair

## Steps:

1. **Identify the connection.** What changed? What depends on it?
2. **Read the changed file.** Quote the relevant export/function/component signature.
3. **Grep for all consumers.**
   ```bash
   grep -rn "importedName\|<ComponentName" src/ --include="*.{js,jsx,ts,tsx}"
   ```
4. **Read every consumer file.** Quote each usage site.
5. **Compare.** Issue verdicts using §3.4 template.
6. **State what was not checked.** Always include this — even in quick verify.

## Example:

```
QUICK VERIFY: Renamed formatDPS → formatDamagePerSecond in utils.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Read utils.js
  Line 15: export function formatDamagePerSecond(value, precision = 2) { ... }
  (Confirmed: old name formatDPS no longer exists as an export)

Step 2: Grep for consumers of old name
  $ grep -rn "formatDPS" src/ --include="*.jsx" --include="*.js" --include="*.ts" --include="*.tsx"
  src/components/TeamCard.jsx:4:import { formatDPS } from '../utils';
  src/components/DPSChart.jsx:2:import { formatDPS } from '../../utils';
  src/views/CompareView.jsx:7:import { formatDPS } from '../../../utils';

Step 3: Verdicts
  C1: TeamCard.jsx:4    → ❌ BROKEN — imports formatDPS, export is now formatDamagePerSecond
  C2: DPSChart.jsx:2    → ❌ BROKEN — same
  C3: CompareView.jsx:7 → ❌ BROKEN — same

Step 4: Also grep for new name to confirm it's not already updated somewhere
  $ grep -rn "formatDamagePerSecond" src/ --include="*.jsx" --include="*.js"
  src/utils.js:15:export function formatDamagePerSecond(...)
  (No consumers — only the definition)

VERDICT: ❌ 3 BROKEN — rename applied to definition only, all 3 consumers still use old name.
NOT CHECKED: The function's signature (params, return type) was not verified — only the name.
```

---

# §8 — FAILURE PATTERN LIBRARY

This section catalogs 40 interconnection failure patterns. Each pattern includes:
- A name and category
- The broken code (what it looks like when wrong)
- The correct code (what it should be)
- How Claude typically misses it
- The grep command to detect it

Use this library during §3 to recognize patterns. When a connection matches a known failure pattern, reference the pattern ID.

## Category A: Import/Export Failures

### FP-A01: Renamed Export, Stale Import
```
BROKEN:
  // source.js — export was renamed
  export function formatDamagePerSecond(value) { ... }

  // consumer.js — still uses old name
  import { formatDPS } from './source';

HOW CLAUDE MISSES IT: Claude remembers writing the rename but "forgets" to update all consumers.
  Claude's context holds the old name from earlier in the session.

DETECT:
  # Compare exports to imports
  grep -rn "export.*function\|export.*const\|export.*class" src/source.js
  grep -rn "from.*source" src/ --include="*.{js,jsx,ts,tsx}"
```

### FP-A02: Default vs Named Export Mismatch
```
BROKEN:
  // source.js — uses default export
  export default function TeamCard() { ... }

  // consumer.js — imports as named
  import { TeamCard } from './TeamCard';
  // This imports undefined — no named export "TeamCard" exists

CORRECT:
  import TeamCard from './TeamCard';       // default import (no braces)
  // OR source changes to: export function TeamCard() { ... }

HOW CLAUDE MISSES IT: Claude doesn't distinguish `import X` from `import { X }`.
  Both "look right" at a glance. Claude must check the actual export statement.

DETECT:
  # Find default exports
  grep -rn "export default" src/source.js
  # Find named imports from that file
  grep -rn "import {.*} from.*source" src/ --include="*.{js,jsx,ts,tsx}"
  # If both match, it's broken
```

### FP-A03: Re-export Chain Break (Barrel File)
```
BROKEN:
  // components/index.js — re-exports
  export { TeamCard } from './TeamCard';
  export { PlayerCard } from './PlayerCard';  // PlayerCard was renamed to CharacterCard

  // consumer.js — imports from barrel
  import { PlayerCard } from './components';  // fails: PlayerCard doesn't exist in barrel

HOW CLAUDE MISSES IT: Claude checks the consumer → barrel connection and sees "PlayerCard"
  in the barrel. But the barrel → actual file connection is broken because the file was renamed.

DETECT:
  # Check every re-export in barrel files resolves
  grep -n "export.*from" src/components/index.js
  # For each, verify the target file exists
```

### FP-A04: Circular Import
```
BROKEN:
  // a.js
  import { helperB } from './b';
  export function helperA() { return helperB() + 1; }

  // b.js
  import { helperA } from './a';
  export function helperB() { return helperA() + 1; }

  // Result: One of them gets undefined at import time.

HOW CLAUDE MISSES IT: Claude reads each file independently and doesn't cross-reference
  the import direction. Each file "looks correct" in isolation.

DETECT:
  # For each import in file A, check if the target imports from A
  for f in src/*.js; do
    imports=$(grep -oP "from ['\"]\.\/\K[^'\"]*" "$f")
    for imp in $imports; do
      grep -l "from.*$(basename $f .js)" "src/$imp.js" 2>/dev/null && \
        echo "CIRCULAR: $f <-> src/$imp.js"
    done
  done
```

### FP-A05: Extension Mismatch
```
BROKEN:
  // TypeScript project with .tsx files
  import { TeamCard } from './TeamCard.jsx';  // File is actually TeamCard.tsx

  // OR: Node.js ESM with explicit extensions required
  import { helper } from './utils';  // Should be './utils.js' in ESM

HOW CLAUDE MISSES IT: Claude assumes the bundler resolves extensions.
  In some configurations (ESM, certain tsconfig settings), it doesn't.

DETECT:
  grep -rn "from.*\.\(jsx\|js\|ts\|tsx\)" src/ --include="*.{js,jsx,ts,tsx}" | \
    while read line; do
      file=$(echo "$line" | grep -oP "from ['\"]\..*?['\"]" | tr -d "'\"" | sed 's/from //')
      [ ! -f "$file" ] && echo "MISSING: $line"
    done
```

### FP-A06: Dynamic Import Path Error
```
BROKEN:
  // Path computed at runtime — can't be statically verified
  const Component = dynamic(() => import(`./components/${name}`));
  // If name = "TeamCard" but file is "teamCard.js" — fails on case-sensitive filesystems

HOW CLAUDE MISSES IT: Dynamic imports are invisible to static grep-based analysis.
  Claude skips them because the path isn't a string literal.

DETECT:
  grep -rn "import(" src/ --include="*.{js,jsx,ts,tsx}" | grep -v "from"
  # Manual review required for each hit
```

## Category B: React Prop/Component Failures

### FP-B01: Prop Passed But Not Destructured
```
BROKEN:
  // Parent
  <TeamCard team={team} isActive={true} showStats={false} />

  // Child — destructures only team
  function TeamCard({ team, onSelect }) { ... }
  // isActive and showStats are silently ignored

HOW CLAUDE MISSES IT: Each file is "correct" in isolation.
  Claude needs to compare the two files side by side.
```

### FP-B02: Prop Expected But Not Passed
```
BROKEN:
  // Child expects className
  function TeamCard({ team, className }) {
    return <div className={className}>...</div>
  }

  // Parent — doesn't pass className
  <TeamCard team={team} />
  // Result: className is undefined, div has no class

HOW CLAUDE MISSES IT: Claude reads the child and sees className has no default,
  but doesn't check if every parent passes it.
```

### FP-B03: Callback Argument Count Mismatch
```
BROKEN:
  // Parent defines handler with 1 param
  const handleSelect = (id) => { setSelected(id); }
  <TeamCard onSelect={handleSelect} />

  // Child calls with 2 params
  function TeamCard({ onSelect }) {
    return <div onClick={() => onSelect(team.id, team.name)}>
    // team.name is silently dropped — handleSelect only reads first arg

HOW CLAUDE MISSES IT: The code "works" — no crash. But data is silently lost.
  Claude checks "does onSelect exist" but not "do the argument counts match."
```

### FP-B04: Spread Props Masking
```
BROKEN:
  // Parent spreads an object
  <TeamCard {...teamProps} onSelect={handleSelect} />

  // teamProps = { onSelect: oldHandler, team: teamData }
  // The explicit onSelect={handleSelect} is OVERRIDDEN if spread comes after
  // Actually in JSX, last one wins — so here handleSelect wins.
  // But if order is reversed:
  <TeamCard onSelect={handleSelect} {...teamProps} />
  // Now teamProps.onSelect OVERWRITES the explicit one!

HOW CLAUDE MISSES IT: Claude doesn't analyze spread object contents
  or prop application order.
```

### FP-B05: Children Prop Assumption
```
BROKEN:
  // Child uses children
  function Modal({ title, children }) {
    return <div><h2>{title}</h2>{children}</div>
  }

  // Parent — self-closing, no children
  <Modal title="Confirm" />
  // children is undefined — might be fine, or might break layout

HOW CLAUDE MISSES IT: Self-closing tags are easy to miss as "no children passed."
```

### FP-B06: Key Prop in List Rendering
```
BROKEN:
  {teams.map((team) => (
    <TeamCard team={team} onSelect={handleSelect} />
    // Missing key prop — React warns, potential re-render bugs
  ))}

  // OR worse:
  {teams.map((team, index) => (
    <TeamCard key={index} team={team} />
    // index as key — causes state bugs when list is reordered
  ))}

HOW CLAUDE MISSES IT: Claude focuses on the component props and ignores key.
```

### FP-B07: ForwardRef Missing
```
BROKEN:
  // Parent passes ref
  const cardRef = useRef(null);
  <TeamCard ref={cardRef} team={team} />

  // Child — regular function component, no forwardRef
  function TeamCard({ team }) { ... }
  // ref is silently dropped — cardRef.current stays null

HOW CLAUDE MISSES IT: Claude doesn't check if parent passes ref
  and child supports it.
```

### FP-B08: Conditional Rendering Breaks Hook Rules
```
BROKEN:
  // Component conditionally renders a child that uses hooks
  function TeamsPage({ showStats }) {
    if (!showStats) return <BasicView />;
    const stats = useTeamStats();  // Hook called conditionally!
    return <StatsView data={stats} />;
  }

  // This violates React's rules of hooks — hooks must be called
  // in the same order every render.

HOW CLAUDE MISSES IT: Claude verifies the hook return shape but doesn't check
  whether the hook call is inside a conditional branch.
```

## Category C: API/Data Failures

### FP-C01: Response Shape Mismatch
```
BROKEN:
  // API handler
  res.json({ teams: teamsList });

  // Consumer
  const data = await response.json();
  setTeams(data);  // data is { teams: [...] }, not [...]
  // Later: teams.map(...) fails because { teams: [...] }.map doesn't exist

CORRECT:
  setTeams(data.teams);  // unwrap the response

HOW CLAUDE MISSES IT: Claude checks that fetch() is called but doesn't trace
  the response through setState to the component's usage.
```

### FP-C02: Method Mismatch
```
BROKEN:
  // Client sends POST
  const res = await fetch('/api/teams', { method: 'POST', body: ... });

  // Handler only handles GET
  export default function handler(req, res) {
    const teams = getTeams();
    res.json({ teams });
    // No req.method check — processes GET logic for POST request
  }

HOW CLAUDE MISSES IT: Claude sees the URL matches but doesn't compare HTTP methods.
```

### FP-C03: Query vs Body Confusion
```
BROKEN:
  // Client sends query param
  fetch(`/api/teams?id=${teamId}`);

  // Handler reads body
  const { id } = req.body;  // undefined — the id is in req.query

HOW CLAUDE MISSES IT: Claude verifies the parameter name (id) matches
  but not the transport mechanism (query vs body).
```

### FP-C04: Missing Error Status Handling
```
BROKEN:
  // Handler returns 401 on auth failure
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  // Client doesn't check for errors
  const data = await response.json();
  setTeams(data.teams);  // data is { error: 'Unauthorized' } — data.teams is undefined

CORRECT:
  if (!response.ok) throw new Error(data.error || 'Request failed');

HOW CLAUDE MISSES IT: Claude verifies the "happy path" response shape
  but ignores error response shapes.
```

### FP-C05: Pagination Contract Break
```
BROKEN:
  // Handler returns paginated
  res.json({ items: teams.slice(0, 20), total: teams.length, page: 1 });

  // Client expects all results
  const { teams } = await response.json();  // wrong key: 'items' not 'teams'
  // AND doesn't handle pagination — shows only first 20, user thinks that's all

HOW CLAUDE MISSES IT: Claude matches "teams" conceptually but the actual key is "items".
```

### FP-C06: CORS/Auth Header Missing
```
BROKEN:
  // Client sends to different origin
  fetch('https://api.example.com/teams', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // But doesn't include credentials mode:
  // Missing: credentials: 'include' or mode: 'cors'

HOW CLAUDE MISSES IT: CORS is a runtime concern Claude doesn't naturally check.
```

## Category D: State Management Failures

### FP-D01: Selector Path Typo
```
BROKEN:
  // Store
  const initialState = { teamsList: [], loading: false };

  // Consumer
  const teams = useSelector(state => state.teams.teamList);
  // Typo: teamList vs teamsList — returns undefined

HOW CLAUDE MISSES IT: "teamList" and "teamsList" look similar.
  Claude's pattern matching isn't character-precise enough.
```

### FP-D02: Action Payload Shape Mismatch
```
BROKEN:
  // Slice
  setTeam: (state, action) => {
    state.currentTeam = action.payload;
    // Expects: { id: number, name: string, members: [] }
  }

  // Consumer dispatches with different shape
  dispatch(setTeam({ teamId: 123, teamName: 'Alpha' }));
  // id → teamId, name → teamName: keys don't match

HOW CLAUDE MISSES IT: Claude checks that dispatch(setTeam(...)) exists
  but doesn't compare the object shape at dispatch site to reducer usage.
```

### FP-D03: Store Not Registered
```
BROKEN:
  // teams.slice.js exists with createSlice(...)
  // BUT store.js doesn't include it:
  const store = configureStore({
    reducer: {
      users: usersReducer,
      // teams: teamsReducer  ← missing!
    }
  });

  // Consumer: useSelector(state => state.teams) → undefined

HOW CLAUDE MISSES IT: The slice file is complete and correct.
  The consumer import is correct. But the slice isn't wired into the store.
```

### FP-D04: Initial State Type Mismatch
```
BROKEN:
  // Store initial state
  const initialState = { teams: null };

  // Component
  const teams = useSelector(state => state.teams);
  return teams.map(t => <TeamCard team={t} />);
  // TypeError on first render: null.map is not a function

HOW CLAUDE MISSES IT: Claude sees `.map()` and assumes it's an array.
  But initial state is null, not [].
```

## Category E: Async/Timing Failures

### FP-E01: Missing Await
```
BROKEN:
  async function fetchTeams() {
    return await api.getTeams();
  }

  // Consumer
  const teams = fetchTeams();  // Missing await!
  console.log(teams.length);   // Promise doesn't have .length

HOW CLAUDE MISSES IT: The function call syntax looks correct.
  Claude must check if the function is async AND the call site awaits it.
```

### FP-E02: Race Condition in Sequential Fetches
```
BROKEN:
  useEffect(() => {
    fetchTeam(teamId).then(setTeam);
  }, [teamId]);
  // If teamId changes rapidly: responses arrive out of order.
  // Old teamId response overwrites newer one.

HOW CLAUDE MISSES IT: Each fetch call is "correct" individually.
  The bug is in the interaction between rapid calls.
```

### FP-E03: Cleanup Missing in useEffect
```
BROKEN:
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 5000);
    // No cleanup — interval continues after unmount
  }, []);

CORRECT:
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, []);

HOW CLAUDE MISSES IT: Claude verifies the effect logic but doesn't check
  for the cleanup return function.
```

### FP-E04: Stale Closure Over State
```
BROKEN:
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1);  // count is always 0 (stale closure)
    }, 1000);
    return () => clearInterval(timer);
  }, []);  // empty deps = count is captured once

CORRECT:
  setCount(prev => prev + 1);  // functional update avoids stale closure

HOW CLAUDE MISSES IT: The code looks syntactically correct.
  The bug is a runtime closure behavior Claude doesn't simulate.
```

## Category F: CSS/Styling Failures

### FP-F01: CSS Module Class Missing
```
BROKEN:
  // Component
  import styles from './TeamCard.module.css';
  <div className={styles.cardActive}>  // "cardActive" doesn't exist in CSS

  // CSS file only has
  .card { }
  .card-active { }  // camelCase vs kebab-case mismatch

HOW CLAUDE MISSES IT: CSS modules convert kebab-case to camelCase automatically
  in some configs but not all. Claude assumes conversion happens.
```

### FP-F02: CSS Variable Undefined
```
BROKEN:
  .team-card {
    background: var(--color-card-bg);  // --color-card-bg never defined
    // Falls back to transparent — invisible card
  }

HOW CLAUDE MISSES IT: CSS variables fail silently. No error, no crash.
  Claude must grep for the variable definition across all CSS files.
```

### FP-F03: Tailwind Class Not in Safelist
```
BROKEN:
  // Dynamic class constructed at runtime
  <div className={`bg-${team.color}-500`}>
  // Tailwind purges this — the dynamic class isn't in any static analysis

HOW CLAUDE MISSES IT: Claude sees the template literal and assumes Tailwind
  will include it. But Tailwind's JIT/purge can't detect dynamic classes.
```

## Category G: Environment/Config Failures

### FP-G01: Client-Side Env Var Without Prefix
```
BROKEN:
  // .env
  API_KEY=secret123

  // Client component
  const key = process.env.API_KEY;  // undefined in browser!
  // Next.js requires NEXT_PUBLIC_ prefix for client-side access

HOW CLAUDE MISSES IT: The env var exists in .env and the code references it.
  "Looks correct" at a glance. But the missing prefix is fatal in Next.js.
```

### FP-G02: Config File Key Mismatch
```
BROKEN:
  // next.config.js
  module.exports = { images: { domains: ['cdn.example.com'] } };

  // Component uses different domain
  <Image src="https://images.example.com/photo.jpg" />
  // Fails: images.example.com not in allowed domains

HOW CLAUDE MISSES IT: Claude doesn't cross-reference next.config.js image domains
  with actual Image src values in components.
```

### FP-G03: TypeScript Path Alias Mismatch
```
BROKEN:
  // tsconfig.json
  { "paths": { "@/components/*": ["src/components/*"] } }

  // Code
  import { TeamCard } from '@/component/TeamCard';  // "component" not "components"

HOW CLAUDE MISSES IT: Path aliases look correct at a glance.
  The singular/plural typo is easy to miss.
```

## Category H: Android/Kotlin Failures (see also §A)

### FP-H01: Layout ID Missing
```
BROKEN:
  // Kotlin
  val textView = findViewById<TextView>(R.id.teamName)
  // But layout XML has: android:id="@+id/team_name"  (underscore vs camelCase)

HOW CLAUDE MISSES IT: Android ID conventions vary. Claude must match exact string.
```

### FP-H02: Intent Extra Key Mismatch
```
BROKEN:
  // Sender
  intent.putExtra("team_id", teamId)

  // Receiver
  val id = intent.getIntExtra("teamId", -1)  // different key — gets default -1

HOW CLAUDE MISSES IT: The keys are semantically the same but syntactically different.
```

### FP-H03: Manifest Activity Missing
```
BROKEN:
  // TeamDetailActivity.kt exists in code
  // But AndroidManifest.xml doesn't declare it
  // App crashes when trying to navigate to it

HOW CLAUDE MISSES IT: Claude verifies the Activity class compiles
  but doesn't check Manifest registration.
```

### FP-H04: Permission Not Declared
```
BROKEN:
  // Code checks permission
  if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == GRANTED) { ... }

  // Manifest doesn't declare it
  // <uses-permission android:name="android.permission.RECORD_AUDIO" /> is missing

HOW CLAUDE MISSES IT: The code correctly checks for permission at runtime,
  but the permission was never declared so it can never be granted.
```


---

# §9 — EXECUTION COMMANDS

Bash commands Claude runs at each verification step. These are the actual tools — not conceptual.
Every command is copy-paste ready. Replace placeholders in CAPS.

## §9.1: Find All Consumers of a File

```bash
# Find every file that imports from TARGET_FILE
# Replace TARGET_FILE with the base name (no extension)
grep -rln "from.*['\"].*TARGET_FILE['\"]" src/ \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Example: Find all consumers of useTeamData
grep -rln "from.*['\"].*useTeamData['\"]" src/ \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

## §9.2: Find All Exports of a File

```bash
# List every export in a file
grep -n "^export \|^module\.exports" TARGET_FILE

# Include re-exports
grep -n "export.*from" TARGET_FILE
```

## §9.3: Find All Imports in a File

```bash
# List every import in a file
grep -n "^import " TARGET_FILE
grep -n "require(" TARGET_FILE
grep -n "= dynamic(" TARGET_FILE
```

## §9.4: Find All Component Usages

```bash
# Find every JSX usage of a component
grep -rn "<COMPONENT_NAME[ \n/>]" src/ \
  --include="*.jsx" --include="*.tsx"

# Find every JSX usage including self-closing
grep -rn "<COMPONENT_NAME\b" src/ --include="*.jsx" --include="*.tsx"
```

## §9.5: Find All API Route Calls

```bash
# Find all fetch/axios calls to a specific route
grep -rn "fetch.*['\"].*API_PATH\|axios.*['\"].*API_PATH" src/ \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Find ALL fetch calls (for full inventory)
grep -rn "fetch(" src/ --include="*.{js,jsx,ts,tsx}" | grep -v node_modules
```

## §9.6: Find All Env Var Usage

```bash
# Find every env var reference
grep -rn "process\.env\." src/ --include="*.{js,jsx,ts,tsx}" | \
  grep -oP "process\.env\.\K[A-Z_]+" | sort -u

# Compare with defined env vars
grep -v "^#" .env .env.local .env.production 2>/dev/null | \
  grep -oP "^[A-Z_]+(?==)" | sort -u

# Find vars used but not defined
comm -23 \
  <(grep -roh "process\.env\.[A-Z_]*" src/ --include="*.{js,jsx,ts,tsx}" | \
    sed 's/process\.env\.//' | sort -u) \
  <(grep -v "^#" .env .env.local 2>/dev/null | \
    grep -oP "^[A-Z_]+(?==)" | sort -u)
```

## §9.7: Find Circular Dependencies

```bash
# Simple circular dependency detector
# For each file, check if any of its imports also import from it
find src/ -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | while read f; do
  basename_f=$(basename "$f" | sed 's/\.[^.]*$//')
  grep -oP "from ['\"]\..*?['\"]" "$f" 2>/dev/null | while read imp; do
    target=$(echo "$imp" | grep -oP "(?<=from ['\"]).*(?=['\"])")
    # Resolve relative to file's directory
    dir=$(dirname "$f")
    resolved="$dir/$target"
    # Check if target imports from our file
    for ext in .js .jsx .ts .tsx; do
      if [ -f "${resolved}${ext}" ]; then
        if grep -q "from.*$basename_f" "${resolved}${ext}" 2>/dev/null; then
          echo "CIRCULAR: $f <-> ${resolved}${ext}"
        fi
      fi
    done
  done
done
```

## §9.8: Find Dead Exports

```bash
# Find exports that nothing imports
for f in $(find src/ -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx"); do
  grep -oP "export (function|const|class|type|interface|enum) \K\w+" "$f" 2>/dev/null | while read name; do
    count=$(grep -rl "$name" src/ --include="*.{js,jsx,ts,tsx}" | grep -v "$f" | wc -l)
    if [ "$count" -eq 0 ]; then
      echo "DEAD EXPORT: $name in $f (0 consumers)"
    fi
  done
done
```

## §9.9: Find Missing Assets

```bash
# Find image/asset references and verify files exist
grep -roh "src=\"/[^\"]*\"" src/ --include="*.jsx" --include="*.tsx" | \
  sed 's/src="//;s/"//' | sort -u | while read path; do
    [ -f "public$path" ] && echo "✅ $path" || echo "❌ MISSING: public$path"
  done
```

## §9.10: Find CSS Module Mismatches

```bash
# For a specific component, cross-reference JSX classes with CSS module
# COMPONENT_FILE = the .jsx/.tsx file
# CSS_FILE = the corresponding .module.css file

# Classes used in JSX
grep -oP "styles\.\K\w+" COMPONENT_FILE | sort -u > /tmp/jsx_classes.txt

# Classes defined in CSS
grep -oP "\.\K[a-zA-Z][\w-]*(?=\s*[{,])" CSS_FILE | sort -u > /tmp/css_classes.txt

# Used but not defined (BROKEN)
comm -23 /tmp/jsx_classes.txt /tmp/css_classes.txt

# Defined but not used (DEAD CSS)
comm -13 /tmp/jsx_classes.txt /tmp/css_classes.txt
```

## §9.11: Find All Hook Consumers

```bash
# Find every file that calls a custom hook
grep -rn "HOOK_NAME(" src/ --include="*.{js,jsx,ts,tsx}" | grep -v "function HOOK_NAME\|export.*HOOK_NAME"
```

## §9.12: Git Change Analysis

```bash
# What changed in the last commit (for change-set scope)
git diff --name-only HEAD~1

# What changed between branches
git diff --name-only main..HEAD

# Show the actual changes in a specific file
git diff HEAD~1 -- src/TARGET_FILE

# Find all files that changed AND their consumers
git diff --name-only HEAD~1 | while read f; do
  echo "=== CHANGED: $f ==="
  base=$(basename "$f" | sed 's/\.[^.]*$//')
  echo "  Consumers:"
  grep -rln "from.*$base\|import.*$base\|<$base" src/ \
    --include="*.{js,jsx,ts,tsx}" | grep -v "$f" | sed 's/^/    /'
done
```

## §9.13: Android/Kotlin Verification Commands

```bash
# Find all XML IDs
grep -rn "android:id=\"@+id/" app/src/main/res/layout/ | \
  grep -oP "@\+id/\K\w+" | sort -u

# Find all Kotlin ID references
grep -rn "R\.id\.\w\+" app/src/main/java/ --include="*.kt" | \
  grep -oP "R\.id\.\K\w+" | sort -u

# Find IDs used in Kotlin but not defined in XML
comm -23 \
  <(grep -roh "R\.id\.\w\+" app/src/main/java/ --include="*.kt" | \
    sed 's/R\.id\.//' | sort -u) \
  <(grep -roh "@+id/\w\+" app/src/main/res/layout/ | \
    sed 's/@+id\///' | sort -u)

# Find activities in code but not in Manifest
comm -23 \
  <(find app/src/main/java/ -name "*Activity.kt" -exec basename {} .kt \; | sort -u) \
  <(grep -oP "android:name=\".*?\K\w+Activity(?=\")" app/src/main/AndroidManifest.xml | sort -u)

# Find intent extra key mismatches
grep -rn "putExtra\|getExtra\|getStringExtra\|getIntExtra" app/src/main/java/ --include="*.kt" | \
  grep -oP "(?:put|get\w*)Extra\(\"[^\"]*\"" | \
  sed 's/.*Extra("//;s/"//' | sort | uniq -c | sort -rn
# Keys appearing only once are suspicious — should appear in both sender and receiver
```

---

# §10 — ANTI-PATTERN CATALOG

How Claude specifically fails during verification, and the corrected behavior for each failure.

## AP-01: Memory-Based Verification

```
FAILURE:
  Claude reads TeamCard.jsx at message #3.
  At message #15, user asks "verify the connections."
  Claude says: "The TeamCard component correctly destructures { team, onSelect }
  from its props, matching what TeamsPage passes."
  Claude did NOT re-read either file. This claim is from stale memory.

CORRECTION:
  Claude reads TeamCard.jsx RIGHT NOW (tool call).
  Claude reads TeamsPage.jsx RIGHT NOW (tool call).
  Claude quotes the exact lines from both files.
  Only then does Claude issue a verdict.
```

## AP-02: Single-Side Verification

```
FAILURE:
  Claude reads the hook file and says:
  "useTeamData returns { data, loading, error, refetch }. ✅"
  Claude verified what the source PROVIDES but did not check
  what the consumer EXPECTS. The consumer might destructure { result, isLoading }.

CORRECTION:
  Always read both sides. The source tells you what's available.
  The consumer tells you what's expected. Both must match.
```

## AP-03: Name-Only Verification

```
FAILURE:
  Claude checks: "Does TeamCard import useTeamData? Yes. ✅"
  But doesn't check: argument count, return shape, null handling, async behavior.

CORRECTION:
  Run the full checklist from §3.3 for every connection.
  Name match is check #1 of 14. It is not sufficient alone.
```

## AP-04: Happy Path Tunnel Vision

```
FAILURE:
  Claude verifies the success path:
  "fetch returns data, hook stores it, component renders it. ✅"
  But doesn't check error path, loading path, or empty path.

CORRECTION:
  For every connection, ask: "What happens when the source returns..."
  - null or undefined?
  - an empty array?
  - an error?
  - a loading state?
  Check each path.
```

## AP-05: Conceptual Match Instead of Literal Match

```
FAILURE:
  Claude sees API returns { teams: [...] } and component reads data.teams.
  Claude says: "The teams data flows correctly. ✅"
  But the hook does: setData(response) — NOT setData(response.teams).
  So data is { teams: [...] }, and data.teams works.
  BUT if the API changes to return { items: [...] }, data.teams breaks.
  More importantly — Claude didn't actually trace through the hook's setState.

CORRECTION:
  Trace the literal code path, not the conceptual intent.
  Read every intermediate variable assignment.
```

## AP-06: Grep Avoidance

```
FAILURE:
  Claude claims: "There are 3 components that use this hook."
  But doesn't run grep. There are actually 5.

CORRECTION:
  Run grep FIRST. Count the results. Then read each file.
  Grep is the authority on "how many consumers exist."
```

## AP-07: Verdict Without Evidence

```
FAILURE:
  Claude writes: "All connections verified. ✅"
  With no code quotes, no line numbers, no comparison.

CORRECTION:
  Every ✅ requires evidence. If you can't quote the code, you haven't verified it.
  "All connections verified" must be preceded by N individual verdict blocks.
```

## AP-08: Skipping "Boring" Connections

```
FAILURE:
  Claude thoroughly checks the complex API connection but glosses over
  CSS class references and asset paths. Those "boring" connections break too.

CORRECTION:
  Every connection in the inventory gets the same verification depth.
  CSS class typos cause invisible UI bugs. Asset path errors cause broken images.
  These are user-visible failures.
```

## AP-09: Claiming Completeness Without Inventory

```
FAILURE:
  Claude says: "I've verified all the connections between these files."
  But never built a connection inventory (§2). Never counted.
  How does Claude know it checked "all" of them?

CORRECTION:
  Always build the inventory first. Number every connection.
  Verify each one. Report the completion ratio.
  "All" means "10/10" — not "I stopped finding issues."
```

## AP-10: Confidence Without Verification

```
FAILURE:
  User: "Did my refactor break anything?"
  Claude: "No, everything looks correct. The refactored code properly..."
  Claude made this claim without reading a single file.

CORRECTION:
  Before answering the question, run the change-set scope verification:
  1. Find what changed (git diff)
  2. Find what depends on changes (grep)
  3. Read both sides of every connection
  4. THEN answer the question with evidence
```

## AP-11: Batching Verdicts

```
FAILURE:
  Claude writes one paragraph covering 5 connections:
  "The imports, props, callbacks, CSS, and API calls all check out correctly. ✅"

CORRECTION:
  One evidence block per connection. Five connections = five verdict blocks.
  Each with its own quoted code from both sides.
```

## AP-12: Trusting Self-Written Code

```
FAILURE:
  Claude just wrote the code 3 messages ago.
  When asked to verify, Claude says: "I wrote this to match the hook's return shape,
  so it should be correct."
  Claude is citing its own intent, not the actual code.

CORRECTION:
  Read the file. The file is the truth. Claude's memory of what it wrote is not.
  Code can have typos, copy-paste errors, or be modified by other tools.
```

---

# §11 — IMPACT ANALYSIS PROTOCOL

When a change is made to one file, systematically find every downstream effect.

## Step 11.1: Identify the change

Read the modified file. Identify what changed:
- Renamed export?
- Changed function signature (params added/removed/reordered)?
- Changed return shape?
- Changed prop interface?
- Changed API response format?
- Changed state shape?
- Removed an export entirely?
- Changed a type/interface?

## Step 11.2: Find all direct dependents

```bash
# Files that import from the changed file
BASE=$(basename "CHANGED_FILE" | sed 's/\.[^.]*$//')
grep -rln "from.*$BASE\|import.*$BASE\|require.*$BASE" src/ \
  --include="*.{js,jsx,ts,tsx}" | grep -v "CHANGED_FILE"
```

## Step 11.3: For each dependent, check if the change affects it

Read each dependent file. For each usage of the changed export:
- Does the usage still match the new signature/shape?
- If not: flag as ❌ BROKEN.
- If yes: flag as ✅ VERIFIED.

## Step 11.4: Find indirect dependents (second-order)

If a direct dependent RE-EXPORTS the changed entity:
```bash
# Check if any dependent re-exports it
grep -n "export.*ENTITY_NAME" DEPENDENT_FILE
```

If it does, that dependent's consumers are also affected. Repeat Step 11.2 for that file.

## Step 11.5: Check for runtime dependents

Some dependencies aren't visible through imports:
- CSS variables defined in one file, used in others
- Context values provided in one component, consumed in distant descendants
- Events emitted in one module, listened to elsewhere
- Shared localStorage/sessionStorage keys

For these: grep for the specific key/variable/event name across the entire codebase.

## Step 11.6: Impact report

```
IMPACT ANALYSIS: Changed useTeamData return shape
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHANGE: Removed 'refetch' from return object, added 'refresh' and 'lastUpdated'

DIRECT DEPENDENTS: 4 files
  1. TeamCard.jsx       — uses { data, loading } — ✅ unaffected
  2. TeamDetail.jsx     — uses { data, refetch } — ❌ BROKEN (refetch removed)
  3. TeamCompare.jsx    — uses { data }          — ✅ unaffected
  4. TeamStats.jsx      — uses { data, loading, refetch } — ❌ BROKEN (refetch removed)

INDIRECT DEPENDENTS: 0 (no re-exports found)

RUNTIME DEPENDENTS: 0 (no shared keys/events)

TOTAL IMPACT: 2 files broken, 2 files safe
ACTION: Update TeamDetail.jsx and TeamStats.jsx to use 'refresh' instead of 'refetch'
```

---

# §12 — SESSION DEGRADATION PROTOCOL

Long Claude Code sessions (50+ messages, 200+ tool calls) cause context degradation.
Earlier file reads become unreliable. This section describes how to maintain verification
accuracy despite degradation.

## §12.1: Degradation Symptoms

Recognize when context is degrading:
- Claude confidently states a function signature that is actually wrong
- Claude references a file structure that doesn't match reality
- Claude "remembers" code it wrote but the file contains something different
- Claude's grep results contradict its earlier claims
- Claude uses variable names or function names that don't exist in any file

## §12.2: Degradation Prevention

1. **Re-read before every verification claim.** This is Rule 1, but it's worth repeating:
   The longer the session, the more important fresh reads become.

2. **Use grep as ground truth.** When Claude "knows" there are 3 consumers,
   grep before stating the count. The grep result overrides Claude's count.

3. **Distrust earlier reads.** After 20+ messages, treat everything from earlier
   in the session as potentially stale. Re-verify.

4. **Use compact/checkpoint.** In Claude Code, run /compact when context is getting large.
   After compacting, re-read any files needed for the current verification.

## §12.3: Degradation Recovery

If degradation is detected:
1. State: "I may have stale context for [files]. Re-reading now."
2. Re-read every file in the current verification scope.
3. Rebuild the connection inventory from scratch using grep (§9).
4. Continue verification with fresh data.

Do not attempt to "fix" stale memory by reasoning about what "must be" in the file.
Read the file. The file is the truth.

## §12.4: Session Length Guidelines

| Session Length | Context Reliability | Action |
|---------------|-------------------|--------|
| 0-20 messages | High | Normal verification |
| 20-50 messages | Medium | Re-read all files at verification time |
| 50-100 messages | Low | Re-read + grep before every claim |
| 100+ messages | Very Low | Consider /compact before verification |

---

# §13 — MULTI-FILE CHAIN VERIFICATION

Verify connections that span 4 or more files in a chain.

## §13.1: When to Use

Use when:
- Data flows through 4+ files (e.g., UI → hook → API → DB → response → hook → UI)
- A feature involves 4+ components in a parent-child chain
- A state change triggers effects across 4+ files

## §13.2: Chain Mapping

Map the complete chain before verifying individual links:

```
CHAIN: User Authentication Flow (7 files)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step │ File                      │ Action                    │ Output
─────┼───────────────────────────┼───────────────────────────┼────────
  1  │ LoginForm.jsx             │ User submits credentials  │ { email, password }
  2  │ useAuth.js                │ Calls login API           │ fetch POST /api/auth
  3  │ pages/api/auth.js         │ Validates credentials     │ { token, user }
  4  │ lib/jwt.js                │ Signs JWT                 │ token string
  5  │ useAuth.js                │ Stores token              │ setState + cookie
  6  │ AuthContext.jsx            │ Provides auth state       │ { user, isLoggedIn }
  7  │ ProtectedRoute.jsx        │ Guards routes             │ redirect or render
```

## §13.3: Link-by-Link Verification

Verify each consecutive pair:
- Link 1-2: LoginForm → useAuth (prop/callback contract)
- Link 2-3: useAuth → API handler (API contract)
- Link 3-4: API handler → jwt library (function signature)
- Link 4-5: jwt return → useAuth state update (shape match)
- Link 5-6: useAuth → AuthContext (context value shape)
- Link 6-7: AuthContext → ProtectedRoute (consumer shape)

Read BOTH files for each link. Six links = twelve file reads.

## §13.4: Cross-Chain Type Consistency

After verifying each link, verify that the type of the key data
is consistent across the ENTIRE chain:

```
CROSS-CHAIN CHECK: "user" object
  LoginForm: sends { email: string, password: string }
  useAuth: receives same, passes to fetch body
  API handler: reads req.body.email, req.body.password — ✅ same keys
  API handler: returns { user: { id, email, name }, token }
  useAuth: reads response.user — ✅ shape { id, email, name }
  AuthContext: provides auth.user — ✅ same shape
  ProtectedRoute: reads auth.user.id — ✅ id exists in shape

  CHAIN VERDICT: ✅ Type consistent across all 7 files
```

## §13.5: Chain Failure Point Detection

When a chain has a break, identify the EXACT link where it fails:

```
CHAIN BREAK DETECTION:
  ✅ Link 1-2: LoginForm → useAuth
  ✅ Link 2-3: useAuth → API handler
  ✅ Link 3-4: API handler → jwt
  ❌ Link 4-5: jwt returns { token, expiresIn }
              useAuth reads response.token → ✅
              useAuth reads response.user → ❌ jwt doesn't return user!
              The user object comes from the API handler, not jwt.
              API handler must add user to response AFTER jwt signing.

  BREAK LOCATION: Link 4-5
  ROOT CAUSE: API handler returns jwt result directly instead of combining it with user data.
  FIX: API handler should: const token = jwt.sign(...); res.json({ token, user: dbUser });
```

---

# §14 — CONDITIONAL CONNECTION VERIFICATION

Some connections only exist under certain conditions. These are the hardest to catch because
they work in some scenarios but fail in others.

## §14.1: Types of Conditional Connections

| Type | Example | When It Fails |
|------|---------|---------------|
| **Feature flag** | `if (featureFlags.newUI) import('./NewTeamCard')` | Flag is enabled but NewTeamCard doesn't exist |
| **Environment** | `if (isDev) enableDebugger()` | Prod code references dev-only module |
| **Auth state** | `{isLoggedIn && <ProfileMenu />}` | ProfileMenu expects user prop but parent only passes it when isLoggedIn |
| **Data state** | `{data && <DataView data={data} />}` | DataView receives null when guard is wrong |
| **Platform** | `if (isMobile) <MobileNav />` | MobileNav not imported or doesn't exist |
| **Route** | `switch(route) { case '/teams': ... }` | Route handler references component not imported |
| **Error boundary** | `<ErrorBoundary fallback={<ErrorPage />}>` | ErrorPage expects error prop but isn't passed one |
| **Lazy/Suspense** | `const X = lazy(() => import('./X'))` | Import path wrong, fails only when component is first rendered |

## §14.2: Verification Protocol for Conditional Connections

For each conditional connection:

1. **Read the condition.** What determines whether this connection is active?
2. **Read both sides.** Source and consumer, regardless of condition.
3. **Verify under BOTH conditions:**
   - When the condition is TRUE: Does the connection work?
   - When the condition is FALSE: Does the fallback work? Is there a fallback?
4. **Check for prop differences between branches:**
   ```
   // BROKEN: Active branch passes different props than inactive branch
   {isActive
     ? <TeamCard team={team} stats={stats} onSelect={handleSelect} />
     : <TeamCard team={team} />  // missing stats and onSelect!
   }
   ```

## §14.3: Dynamic Import Verification

```bash
# Find all dynamic imports
grep -rn "React\.lazy\|dynamic(\|import(" src/ --include="*.{js,jsx,ts,tsx}" | \
  grep -v "from " | grep -v "node_modules"

# For each, verify the target path exists
# (Manual step — paths may include variables)
```

For dynamic imports with variable paths:
- List all possible values of the variable
- Verify a file exists for each possible value
- If impossible to enumerate (user input), flag as 🔍 UNVERIFIABLE with reason

---

# §15 — NEXT.JS SPECIFIC CONTRACTS

## §15.1: App Router vs Pages Router

Determine which router the project uses:
```bash
# App Router: has app/ directory
ls -d app/ 2>/dev/null && echo "App Router" || echo "No App Router"

# Pages Router: has pages/ directory
ls -d pages/ 2>/dev/null && echo "Pages Router" || echo "No Pages Router"

# Both can coexist
```

The connection types differ significantly between routers.

## §15.2: Server Component / Client Component Boundary (CT-SC)

### Rule: Server components CANNOT import client components directly in their render path.

```
BROKEN:
  // app/teams/page.tsx (Server Component — no 'use client' directive)
  import TeamCard from './TeamCard';  // TeamCard has 'use client'
  // This is actually FINE — server components CAN import client components.

  // The REAL problem:
  // app/teams/page.tsx (Server Component)
  import { useTeamData } from '../hooks/useTeamData';  // Hook uses useState!
  // Server components CANNOT use hooks. This crashes.
```

### Verification protocol:

1. Read the importing file. Check for `'use client'` directive at top.
2. Read the imported file. Check for `'use client'` directive.
3. Check if the imported code uses client-only APIs:
   - `useState`, `useEffect`, `useContext`, any hook
   - `onClick`, `onChange`, any event handler
   - `window`, `document`, `navigator`
   - `useRouter` from `next/navigation` (client) vs `next/router` (pages, client)

```bash
# Find all server components that import client-only code
find app/ -name "page.tsx" -o -name "page.jsx" -o -name "layout.tsx" | while read f; do
  if ! grep -q "'use client'" "$f"; then
    # Server component — check imports
    echo "=== SERVER COMPONENT: $f ==="
    grep "^import" "$f" | while read imp; do
      target=$(echo "$imp" | grep -oP "from ['\"].*?['\"]" | tr -d "'\"" | sed 's/from //')
      # Resolve and check for hooks
      resolved=$(find . -path "*${target}*" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | head -1)
      if [ -n "$resolved" ] && grep -q "useState\|useEffect\|useContext" "$resolved"; then
        if ! grep -q "'use client'" "$resolved"; then
          echo "  ⚠️ $imp → uses hooks but no 'use client'"
        fi
      fi
    done
  fi
done
```

## §15.3: Layout / Page / Loading / Error Contracts (CT-LP, CT-LE)

### Layout → Page

- `layout.tsx` wraps `page.tsx` and all child routes.
- Props passed via React children, NOT via props.
- Layout re-renders on navigation between child routes? No — layouts are persistent.

Verify:
- Does `page.tsx` expect any context/provider that `layout.tsx` provides?
- Does `layout.tsx` pass children correctly?
- Does the error boundary in `error.tsx` match the page's possible errors?

### Loading → Page

- `loading.tsx` renders while page is loading (Suspense boundary).
- It must be a valid component that renders without any data.
- Verify it doesn't import the same data the page loads.

### Error → Page

- `error.tsx` receives `{ error, reset }` props.
- Verify it uses these props correctly.
- Verify it has `'use client'` directive (required for error boundaries in App Router).

## §15.4: Middleware Contracts (CT-MW)

```
// middleware.ts
export function middleware(request) {
  // Sets a header
  request.headers.set('x-team-id', teamId);
  // OR modifies cookies
  response.cookies.set('session', token);
}

export const config = {
  matcher: '/api/teams/:path*'
};
```

Verify:
1. `matcher` pattern matches the routes that expect middleware effects
2. Headers/cookies SET in middleware are READ in the matched routes
3. Header/cookie NAMES match between middleware and route handlers

```bash
# Find headers set in middleware
grep -n "headers\.set\|cookies\.set" middleware.ts

# Find headers read in API routes
grep -rn "headers\.get\|cookies\.get\|req\.headers" app/api/ pages/api/ --include="*.{ts,tsx,js,jsx}"

# Cross-reference: do the names match?
```

## §15.5: Route Parameter Contracts (CT-RT)

### Pages Router
```
// pages/team/[id].tsx
const { id } = router.query;  // id is string | string[] | undefined
```

### App Router
```
// app/team/[id]/page.tsx
export default function TeamPage({ params }: { params: { id: string } }) {
  // params.id is always string (or the segment doesn't match)
}
```

Verify:
1. The dynamic segment name in the folder/file matches what the code reads
2. The code handles the type correctly (Pages Router: string | string[] | undefined)
3. Navigation calls use the correct path template

```bash
# Find all dynamic route segments
find app/ pages/ -name "\[*\]" -o -name "\[*\].tsx" -o -name "\[*\].jsx" 2>/dev/null

# Find all router.push / Link href references
grep -rn "router\.push\|<Link href" src/ --include="*.{jsx,tsx}"
```

## §15.6: API Route Method Handling

### Pages Router
```javascript
// pages/api/teams.js
export default function handler(req, res) {
  if (req.method === 'GET') { ... }
  else if (req.method === 'POST') { ... }
  else { res.status(405).end(); }
}
```

### App Router
```javascript
// app/api/teams/route.js
export async function GET(request) { ... }
export async function POST(request) { ... }
// Methods not exported → automatic 405
```

Verify:
- Client sends the right method
- Handler processes that method (exported function or if-branch)
- Client handles method-not-allowed (405) response

---

# §16 — SERVER/API CONTRACTS

## §16.1: Express/Fastify Middleware Chain

Middleware order matters. Verify:

```javascript
// server.js
app.use(cors());           // 1. CORS headers
app.use(express.json());   // 2. Body parsing
app.use(authMiddleware);   // 3. Auth check
app.use('/api', apiRouter); // 4. Routes
```

Contract checks:
1. Middleware that sets `req.user` runs BEFORE routes that read `req.user`
2. Body parser runs BEFORE routes that read `req.body`
3. CORS runs BEFORE any response is sent
4. Error handler is registered LAST

```bash
# Find middleware registration order
grep -n "app\.use\|router\.use" server.js app.js
```

## §16.2: Database Query Contracts

```javascript
// Verify SQL/query parameter types match what the code passes
// query.js
async function getTeam(id) {
  return db.query('SELECT * FROM teams WHERE id = $1', [id]);
  // $1 expects the type that the column `id` is — usually integer
}

// Consumer
const team = await getTeam(req.query.id);
// req.query.id is STRING — passing string where integer expected
```

Verify:
1. Parameter types in the query match what's passed
2. Query result shape matches what the consumer destructures
3. Connection/pool is initialized before queries run
4. Transactions are committed/rolled back in all paths (including error)

## §16.3: WebSocket Event Contracts

```javascript
// server.js
io.on('connection', (socket) => {
  socket.on('joinTeam', (data) => {
    // expects data = { teamId: string }
    socket.join(data.teamId);
  });
  socket.emit('teamUpdate', { team, members });
});

// client.js
socket.emit('joinTeam', { id: teamId });  // WRONG KEY: 'id' not 'teamId'
socket.on('teamUpdate', (data) => {
  setTeam(data.team);  // OK
  setMembers(data.members);  // OK
});
```

Verify:
1. Event names match between emit and on (exact string)
2. Payload shapes match between emit and handler
3. Client handles disconnect/reconnect
4. Server handles client errors/invalid payloads

---

# §17 — SELF-AUDIT PROTOCOL

This section triggers automatically when Claude completes multi-file changes.
Before claiming "done" or "changes complete", run this protocol.

## §17.1: Trigger Conditions

Run self-audit when ALL of these are true:
1. Claude modified 2 or more files in the current session
2. Claude is about to claim the work is complete
3. The user has not explicitly said "skip verification"

## §17.2: Self-Audit Steps

### Step 17.2.1: List all modified files

```bash
# If using git
git diff --name-only

# If not using git, Claude recalls which files it touched
# List them explicitly:
MODIFIED FILES:
  1. src/hooks/useTeamData.js    (lines 5-42 changed)
  2. src/components/TeamCard.jsx (lines 3, 8, 12-15 changed)
  3. src/components/TeamCard.module.css (new file)
```

### Step 17.2.2: For each modified file, find dependents

Run §9.1 grep for each file. List every dependent.

### Step 17.2.3: Quick-verify each cross-file connection

For each modified file × each dependent:
- Read the modified section of the source
- Read the usage in the dependent
- Issue a verdict (§3.4)

### Step 17.2.4: Report before claiming done

```
SELF-AUDIT REPORT
━━━━━━━━━━━━━━━━━
Files modified: 3
Connections checked: 8
  ✅ Verified: 7
  ⚠️ Mismatch: 1 (C04: unused error return — medium severity)
  ❌ Broken: 0

All cross-file connections are intact.
The ⚠️ mismatch is a pre-existing issue, not caused by this change.

Work is complete.
```

### Step 17.2.5: Do not claim done if ❌ BROKEN exists

If any connection is ❌ BROKEN:
1. Report the break with evidence
2. Ask: "I found a broken connection. Fix it now, or note it for later?"
3. Do not claim work is complete until the user decides.

## §17.3: Self-Audit Depth by Change Type

| Change Type | Audit Depth |
|------------|-------------|
| Renamed an export | Full: grep all consumers, verify each (§7 Quick Verify) |
| Changed function signature | Full: verify every call site matches new signature |
| Changed return shape | Full: verify every destructuring site matches new shape |
| Changed prop interface | Full: verify every parent passes correct props |
| Added new file | Light: verify exports exist, at least one consumer imports correctly |
| Deleted file | Full: grep for any remaining imports from deleted file |
| CSS only | Medium: verify className references still match |
| Comment/formatting only | Skip: no interconnection changes |

## §17.4: Self-Audit Shortcuts

To keep self-audit practical in time-pressured sessions:

1. **Rename changes**: Only grep + verify name match. Skip deep signature analysis.
2. **New file additions**: Verify exports exist and one consumer works. Skip exhaustive search.
3. **Bug fixes within a function**: If the function signature/return shape didn't change, skip cross-file verification. Note: "Signature unchanged — self-audit skipped for this file."


---

# §A — KOTLIN/XML INTERCONNECTION TYPES (EXPANDED)

For Android projects (Echolibrium and similar).

## §A.1: View Binding / findViewById Contracts

| Source | Consumer | What to Verify |
|--------|----------|----------------|
| `res/layout/activity_main.xml` (view IDs) | `MainActivity.kt` (ViewBinding or findViewById) | Every ID referenced in Kotlin exists in the bound layout |

### Verification:
```bash
# IDs in XML layout
grep -oP "android:id=\"@\+id/\K\w+" app/src/main/res/layout/LAYOUT_FILE.xml | sort

# IDs used in Kotlin
grep -oP "binding\.\K\w+\|R\.id\.\K\w+" app/src/main/java/KOTLIN_FILE.kt | sort

# Cross-reference
comm -23 <(grep -oP "binding\.\K\w+\|R\.id\.\K\w+" KOTLIN_FILE | sort -u) \
         <(grep -oP "android:id=\"@\+id/\K\w+" LAYOUT_FILE | sort -u)
```

Caution: ViewBinding generates camelCase from snake_case IDs. `team_name` → `teamName`.
Verify the camelCase conversion is correct.

## §A.2: Activity / Fragment Contracts

| Connection | Source | Consumer | Verify |
|------------|--------|----------|--------|
| **Activity → Fragment (args)** | Activity puts args in Bundle | Fragment reads from arguments Bundle | Key names match, value types match |
| **Fragment → Activity (callback)** | Fragment calls activity method | Activity implements interface or provides method | Method exists, params match |
| **Fragment → Fragment (shared ViewModel)** | Fragment A writes to ViewModel | Fragment B reads from ViewModel | Field names match, types compatible |

### Bundle Key Verification:
```bash
# Keys PUT into bundles
grep -rn "putExtra\|putString\|putInt\|putBoolean\|putSerializable\|putParcelable\|putBundle" \
  app/src/main/java/ --include="*.kt" | grep -oP "\"[^\"]+\"" | sort -u

# Keys GET from bundles
grep -rn "getExtra\|getString\|getInt\|getBoolean\|getSerializable\|getParcelable" \
  app/src/main/java/ --include="*.kt" | grep -oP "\"[^\"]+\"" | sort -u

# Keys that appear only in PUT or only in GET → potential mismatch
```

## §A.3: Navigation Graph Contracts

```bash
# Actions defined in nav_graph.xml
grep -oP "android:id=\"@\+id/action_\K[^\"]*" app/src/main/res/navigation/nav_graph.xml

# Actions used in Kotlin
grep -oP "R\.id\.action_\K\w+" app/src/main/java/ --include="*.kt" -r

# Destinations defined
grep -oP "android:id=\"@\+id/\K[^\"]*" app/src/main/res/navigation/nav_graph.xml | grep -v "action_"

# Destinations navigated to
grep -oP "navigate\(R\.id\.\K\w+" app/src/main/java/ --include="*.kt" -r
```

## §A.4: Manifest Contracts

```bash
# Activities declared in Manifest
grep -oP "android:name=\"\K[^\"]*Activity" app/src/main/AndroidManifest.xml

# Activity classes in code
find app/src/main/java/ -name "*Activity.kt" | sed 's/.*\///' | sed 's/\.kt//'

# Receivers declared
grep -oP "android:name=\"\K[^\"]*Receiver" app/src/main/AndroidManifest.xml

# Services declared
grep -oP "android:name=\"\K[^\"]*Service" app/src/main/AndroidManifest.xml

# Permissions declared
grep -oP "android:name=\"\K[^\"]*" app/src/main/AndroidManifest.xml | grep "permission"

# Permissions checked in code
grep -rn "checkSelfPermission\|requestPermissions\|PERMISSION" app/src/main/java/ --include="*.kt" | \
  grep -oP "Manifest\.permission\.\K\w+"
```

## §A.5: Resource Reference Contracts

```bash
# All R.* references in Kotlin
grep -roh "R\.\w\+\.\w\+" app/src/main/java/ --include="*.kt" | sort -u

# For each, verify the resource exists:
# R.string.X → check res/values/strings.xml for <string name="X">
# R.color.X → check res/values/colors.xml for <color name="X">
# R.drawable.X → check res/drawable/ for X.xml or X.png
# R.layout.X → check res/layout/ for X.xml
# R.id.X → check layout XMLs for android:id="@+id/X"
```

## §A.6: Gradle / Dependency Contracts

```bash
# Check if an API used in code requires a dependency
# Example: if code uses Coroutines
grep -rn "kotlinx\.coroutines\|launch\|async\|withContext" app/src/main/java/ --include="*.kt"
# → verify build.gradle has: implementation "org.jetbrains.kotlinx:kotlinx-coroutines-*"

# Check minSdk vs API usage
grep "minSdk" app/build.gradle
# If minSdk = 24 and code uses API level 26+ features without version check → crash
```

## §A.7: TTS Engine Contracts (Echolibrium-specific)

For Echolibrium's triple-engine TTS architecture:

| Connection | Source | Consumer | Verify |
|------------|--------|----------|--------|
| **Engine selection** | Settings/preferences | TTS manager | Engine ID string matches between selector and initializer |
| **Voice parameters** | Voice config model | Engine init params | Pitch, rate, locale fields exist and types match |
| **Notification text** | NotificationListenerService | TTS engine queue | Text extraction output matches what engine expects |
| **Waveform data** | Audio engine callback | WaveformView | Sample format, buffer size, update frequency match |
| **Engine state** | Engine lifecycle callbacks | UI state indicators | State enum values match between engine and UI |

---

# §B — EDGE CASES CATALOG

## §B.1: Barrel Export Edge Cases

```javascript
// index.js (barrel file)
export { TeamCard } from './TeamCard';
export { PlayerCard } from './PlayerCard';
export { default as StatsView } from './StatsView';  // re-exporting default as named

// Consumer
import { TeamCard, PlayerCard, StatsView } from './components';

// EDGE CASE 1: StatsView was default export, re-exported as named.
//   If StatsView changes to named export, the barrel must update too.

// EDGE CASE 2: Barrel exports a name that conflicts with a local definition
import { TeamCard } from './components';
const TeamCard = () => <div>Local</div>;  // Shadowed! Which one is used?

// EDGE CASE 3: Nested barrels
// components/index.js exports from teams/index.js which exports from TeamCard.jsx
// A break at any level cascades up.
```

Verification: Trace through EVERY barrel level. Read each index.js file.

## §B.2: Namespace Import Edge Cases

```javascript
// Namespace import
import * as utils from './utils';
utils.formatDPS(value);
utils.calculateStats(data);

// EDGE CASE: utils.js uses export default AND named exports.
//   namespace import captures named exports but default becomes utils.default.
//   If consumer calls utils.formatDPS but formatDPS is the default export:
//   utils.formatDPS is undefined. Must use utils.default.
```

## §B.3: Computed Property Access

```javascript
// Dynamic access pattern
const handlers = { create: handleCreate, update: handleUpdate, delete: handleDelete };
const action = req.query.action;  // 'create' | 'update' | 'delete'
const handler = handlers[action];
handler(req, res);

// EDGE CASE: action = 'destroy' → handler is undefined → crash
// Static analysis can't catch this — the key is runtime-determined.
// FLAG AS: 🔍 UNVERIFIABLE (runtime dynamic key)
```

## §B.4: TypeScript Type-Only Imports

```typescript
import type { TeamData } from './types';
// This import is ERASED at compile time.
// If used as a value (not just a type):
const team: TeamData = {};  // OK — type annotation
const data = new TeamData();  // ❌ BROKEN — can't instantiate a type-only import
```

## §B.5: Conditional Require (CommonJS)

```javascript
let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}
// Later:
if (sharp) {
  sharp.resize(...)  // Only runs if sharp is installed
}

// EDGE CASE: Code path without the null check:
const result = sharp.resize(width);  // Crashes if sharp is null
```

## §B.6: Re-export with Rename

```javascript
// source.js
export function internalHelper() { ... }

// barrel.js
export { internalHelper as publicHelper } from './source';

// consumer.js
import { publicHelper } from './barrel';  // Works
import { internalHelper } from './barrel';  // ❌ BROKEN — not re-exported under original name
```

## §B.7: Default Export Anonymous Function

```javascript
// source.js
export default function() { return 42; }
// OR
export default () => 42;

// consumer.js
import myFunc from './source';
// myFunc is now "myFunc" in consumer scope, but the function has no name
// in stack traces — harder to debug, but functionally fine.

// EDGE CASE: Two files in same directory both use default export.
// Barrel can't re-export both without renaming:
export { default as FuncA } from './a';
export { default as FuncB } from './b';
```

## §B.8: JSON Import Shape

```javascript
import config from './config.json';
// config.json:
// { "apiUrl": "https://api.example.com", "timeout": 5000 }

// Consumer expects:
console.log(config.api_url);  // undefined! Key is apiUrl, not api_url.
```

---

# §C — VERIFICATION TIERS

| Tier | When | Scope | Depth | Time Estimate |
|------|------|-------|-------|---------------|
| **Quick** | Single change, 1-3 files | File pair | Name + signature match only | 2-5 min |
| **Standard** | Feature work, 3-10 files | Change set | Full checklist (§3.3) for each connection | 10-30 min |
| **Deep** | Module boundary, 10-30 files | Feature or module | Full checklist + data flow tracing (§5) + conditional checks (§14) | 30-60 min |
| **Full** | Pre-deployment, 30+ files | Entire app | Everything + multi-chain (§13) + self-audit (§17) | 60-180 min |

### Tier Selection Heuristic

1. User says "quick check" or "just verify" → **Quick**
2. Claude finished a task with 2-5 file changes → **Standard**
3. User says "verify the feature" or "integration check" → **Deep**
4. User says "full audit" or "pre-deployment check" → **Full**

### What Each Tier Includes

| Step | Quick | Standard | Deep | Full |
|------|-------|----------|------|------|
| §1 Scope Selection | ✅ | ✅ | ✅ | ✅ |
| §2 Connection Inventory | Skip | ✅ | ✅ | ✅ |
| §3 Dual-Read (all checks) | Name only | Full checklist | Full checklist | Full checklist |
| §4 Contract sub-protocols | Skip | Matching types | All types | All types |
| §5 Data Flow Tracing | Skip | Skip | Key flows | All flows |
| §8 Pattern Library matching | Top 5 | Top 10 | All patterns | All patterns |
| §9 Grep commands | 1-2 | Core set | Full set | Full + recursive |
| §11 Impact Analysis | Skip | Direct only | Direct + indirect | Full chain |
| §13 Multi-file chains | Skip | Skip | Key chains | All chains |
| §14 Conditional connections | Skip | Skip | ✅ | ✅ |
| §17 Self-Audit | Skip | Auto-trigger | Auto-trigger | Mandatory |

---

# §D — 4.7 COMPATIBILITY NOTES

This skill is designed for literal model interpretation. These notes explain the design choices
and provide recovery instructions when the model goes off-protocol.

## §D.1: Design Principles for Literal Models

1. **Positive framing.** "Always read the file" instead of "Don't rely on memory."
   4.7 follows positive instructions more reliably. Negative framing causes the model
   to focus on the prohibited action.

2. **Explicit evidence requirements.** Every verdict requires quoted code.
   This prevents the model from issuing verdicts without proof.

3. **No metaphors or implicit expectations.** Each step says exactly what to do.
   "Check the wiring" is ambiguous. "Read line 42 of utils.js and line 8 of TeamCard.jsx,
   compare the export name to the import name" is literal.

4. **Numbered checklists.** The model follows numbered sequences reliably.
   It is less reliable with "check all of these things" (may skip items).

5. **Structured templates.** The model fills in templates accurately.
   It is less accurate generating freeform analysis.

6. **One instruction per sentence.** Complex multi-part sentences cause the model
   to follow the first part and skip the rest.

## §D.2: Recovery Phrases

When the model goes off-protocol, use these exact phrases:

| Problem | Recovery Phrase |
|---------|----------------|
| Model skips file read | "Read the file now. Quote the exact lines." |
| Model issues verdict without evidence | "Show me the evidence. Quote both files." |
| Model batches verdicts | "One verdict per connection. Start with C01." |
| Model claims completeness without inventory | "How many connections total? List them." |
| Model uses memory instead of grep | "Run the grep command. Show me the output." |
| Model says "should work" | "That is not a valid verdict. Use ✅ ⚠️ ❌ or 🔍." |
| Model checks one side only | "You showed the source. Now show the consumer." |
| Model skips self-audit | "Run §17 before claiming done." |

## §D.3: System Prompt Integration

If using this skill in a system prompt or CLAUDE.md, add these lines:

```
When verifying code connections between files:
1. Always read both files at verification time using tool calls.
2. Always quote the exact code from both files.
3. Always issue a verdict: ✅ VERIFIED, ⚠️ MISMATCH, ❌ BROKEN, or 🔍 UNVERIFIABLE.
4. Always state what was not checked.
5. Run grep to find all consumers before claiming completeness.
```

These five lines encode the core behavior. Keep them short and literal for 4.7.

## §D.4: Contradictions to Avoid

Do NOT include these in the system prompt alongside this skill:
- "Be concise" — contradicts the requirement to quote code evidence
- "Skip obvious checks" — the model will skip too much
- "Use your judgment" — the model's judgment about what to skip is unreliable
- "You already know the codebase" — encourages memory-based verification
- "Don't overthink it" — the model will underthink

Instead use:
- "Be thorough in verification, concise in explanation"
- "Check every connection in the inventory"
- "Follow the checklist in order"
- "Read the file before making claims about it"
- "Show your evidence"

---

# §E — COMPANION SKILL INTEGRATION

## §E.1: With scope-context

When verification scope is "all connections" or "every import":
1. First run scope-context's Concept Scaffold to define what "connection" means in this codebase
2. Then run scope-context's Pattern Inventory to find all instances
3. Then run interconnect-verify's §2 to build the connection inventory from the pattern inventory
4. Then run §3 for each connection

The scope-context skill prevents missing connections. This skill verifies each one.

## §E.2: With app-audit

When running a full app audit:
1. Run app-audit §P10 (Code Quality) first — this identifies architectural issues
2. Use interconnect-verify's §11 (Impact Analysis) to check if audit findings create cascading issues
3. Run interconnect-verify's §15-§16 for framework-specific contract checks
4. Feed broken connections into app-audit's findings table

## §E.3: With design-aesthetic-audit

When CSS/styling contracts need verification:
1. Run interconnect-verify's §4.5 for CSS class and variable contracts
2. Use design-aesthetic-audit's token architecture analysis to verify design tokens are consistently defined
3. Use DeployView screenshots to visually confirm CSS connections render correctly

---

# §QR — QUICK REFERENCE

## Master Checklist (copy-paste for every session)

```
BEFORE CLAIMING CODE WORKS TOGETHER:
☐ I read the source file just now (tool call, not memory)
☐ I read the consumer file just now (tool call, not memory)
☐ I quoted the exact lines with line numbers from both files
☐ I checked: name match (export name = import name)
☐ I checked: export type match (default vs named)
☐ I checked: path resolution (relative path is correct)
☐ I checked: argument count and order
☐ I checked: return shape vs destructuring
☐ I checked: null/undefined handling at the boundary
☐ I checked: type compatibility (string vs number vs object)
☐ I checked: async/await correctness
☐ I issued a verdict with evidence (✅ ⚠️ ❌ 🔍)
☐ I assigned a severity (critical/high/medium/low/info)
☐ I stated what I did not check
☐ I ran grep to confirm I found all consumers
```

## Connection Type Quick Lookup

```
CT-IE  Import/Export           grep "export.*from\|import.*from"
CT-RP  React Props             grep "<Component\|function Component({"
CT-HR  Hook Returns            grep "return {.*}\|const {.*} = useHook"
CT-HA  Hook Arguments          grep "useHook(\|function useHook("
CT-CX  Context                 grep "useContext\|createContext\|Provider"
CT-AC  API Calls               grep "fetch(\|axios\."
CT-CB  Callback Props          grep "on[A-Z].*={\|props\.on[A-Z]"
CT-RN  Render Props            grep "render={\|props\.render("
CT-FR  ForwardRef              grep "forwardRef\|ref={"
CT-SS  Store/State             grep "useSelector\|dispatch(\|createSlice"
CT-CS  CSS/Class               grep "className=\|styles\."
CT-CV  CSS Variables            grep "var(--\|--.*:"
CT-EC  Env/Config              grep "process\.env\.\|import\.meta\.env"
CT-TI  Type/Interface          grep "import type\|export type\|export interface"
CT-EE  Event Emitter           grep "\.emit(\|\.on(\|addEventListener"
CT-RT  Route Params            grep "router\.push\|router\.query\|useParams"
CT-DI  Dynamic Import          grep "dynamic(\|React\.lazy(\|import("
CT-BR  Barrel Re-export        grep "export.*from.*index\|export {.*} from"
CT-SC  Server/Client           grep "'use client'\|'use server'"
CT-MW  Middleware               grep "middleware\.\|headers\.set\|cookies\.set"
CT-LP  Layout/Page             grep "layout\.\|page\.\|children"
CT-LE  Loading/Error           grep "loading\.\|error\.\|Suspense\|ErrorBoundary"
CT-CF  Config File             grep "next\.config\|tailwind\.config\|tsconfig"
CT-PJ  Package Scripts         cat package.json | grep "scripts"
CT-IA  Image/Asset             grep "src=\"/\|import.*\.png\|import.*\.svg"
CT-JD  JSON/Data               grep "import.*\.json\|require.*\.json"
```

## Severity Quick Guide

```
critical  App crashes, data corruption, security breach      → Fix NOW
high      Feature broken for some users or some paths        → Fix before deploy
medium    Silent failure, wrong behavior, missing feedback    → Fix this session
low       Works but fragile, cosmetic issues                 → Fix when convenient
info      Unused code, redundant checks, style issues        → Optional cleanup
```

## Verdict Quick Guide

```
✅ VERIFIED      Both files read. Exact match confirmed. Evidence quoted.
⚠️ MISMATCH     Both files read. Discrepancy found. Both versions quoted.
❌ BROKEN        One side references something that doesn't exist in the other.
🔍 UNVERIFIABLE  Cannot read one or both files. Reason stated.
```
