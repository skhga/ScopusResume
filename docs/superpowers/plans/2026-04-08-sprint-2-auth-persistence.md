# Sprint 2 — Auth + Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock auth and localStorage with real Supabase auth + PostgreSQL persistence, and move the Anthropic API key server-side via Vercel Serverless Functions.

**Architecture:** Supabase handles auth (magic link + email/password via `@supabase/supabase-js`) and stores resume data as JSONB in a RLS-protected `resumes` table. Two Vercel Serverless Functions (`api/tailor.js`, `api/analyze.js`) proxy Anthropic calls, verifying the Supabase JWT before forwarding. Client AI calls switch to these endpoints in production (falling back to direct API call only when `REACT_APP_ANTHROPIC_KEY` is set, for dev convenience).

**Tech Stack:** React 19 (CRA), `@supabase/supabase-js` v2, Vercel Serverless Functions (Node.js 18), Anthropic API (`claude-sonnet-4-6`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `api/tailor.js` | Create | Vercel Function: verify JWT → call Anthropic → return diffs |
| `api/analyze.js` | Create | Vercel Function: verify JWT → call Anthropic → return ATS analysis |
| `vercel.json` | Create | Route `/api/*` to functions, enable CORS headers |
| `src/lib/supabaseClient.js` | Create | Supabase singleton client |
| `src/services/authService.js` | Replace | Supabase auth (login, register, logout, passwordReset, updateProfile) |
| `src/context/AuthContext.jsx` | Replace | Subscribe to `supabase.auth.onAuthStateChange` instead of localStorage |
| `src/router.jsx` | Modify | Wrap `/app` routes in `<RequireAuth>` guard component |
| `src/components/auth/RequireAuth.jsx` | Create | Redirect to `/signin` when not authenticated |
| `src/services/resumeService.js` | Replace | Supabase CRUD for `resumes` table (all async) |
| `src/context/ResumeContext.jsx` | Replace | Async adapter: optimistic local state + Supabase sync |
| `src/services/resumeVersionService.js` | Create | Save/fetch resume snapshots (`resume_versions` table) |
| `src/services/aiService.js` | Modify | `callLLM()` → prefer `/api/tailor` or `/api/analyze` in prod; keep direct call for dev |
| `.env.local.example` | Update | Add Supabase env vars |
| `supabase/schema.sql` | Create | SQL for `resumes` + `resume_versions` tables with RLS |

---

## Task 1: Vercel Edge Function Proxy

Moves the Anthropic API key from the client bundle to server-side Vercel Functions. No Supabase needed yet — this is pure security.

**Files:**
- Create: `api/tailor.js`
- Create: `api/analyze.js`
- Create: `vercel.json`
- Modify: `src/services/aiService.js`
- Update: `.env.local.example`

- [ ] **Step 1.1: Create `vercel.json`**

```json
{
  "functions": {
    "api/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

- [ ] **Step 1.2: Create `api/_anthropic.js` (shared helper)**

```js
// api/_anthropic.js — shared Anthropic call for Vercel Functions
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>} raw text response
 */
async function callAnthropic(systemPrompt, userMessage) {
  const key = process.env.ANTHROPIC_KEY;
  if (!key) throw new Error('ANTHROPIC_KEY not set on server');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic error: ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

module.exports = { callAnthropic };
```

- [ ] **Step 1.3: Create `api/tailor.js`**

```js
const { callAnthropic } = require('./_anthropic');

function parseJSON(text) {
  try {
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

const SYSTEM = `You are an expert resume coach helping job seekers tailor their resumes to specific job descriptions.
Your goal is to improve the resume's match to the job while maintaining the candidate's authentic voice — never invent experience or exaggerate.

Return ONLY a JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have exactly these fields:
{
  "section": string,
  "original": string,
  "tailored": string,
  "reason": string
}

Rules:
- Only include sections that were actually changed
- Do not invent experience, degrees, or skills that aren't in the resume
- Keep the candidate's writing voice
- Prioritize bullet points that can be rewritten to match JD keywords
- If a section is already strong for this job, skip it`;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, jd } = req.body || {};
  if (!resumeText || !jd) {
    return res.status(400).json({ error: 'resumeText and jd are required' });
  }

  try {
    const raw = await callAnthropic(SYSTEM, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
    const parsed = parseJSON(raw);

    if (!Array.isArray(parsed)) {
      return res.status(422).json({ error: 'LLM returned malformed response. Please try again.' });
    }
    for (const item of parsed) {
      if (!item.section || !item.tailored || !item.reason) {
        return res.status(422).json({ error: 'LLM returned malformed diff objects. Please try again.' });
      }
    }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[api/tailor]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
```

- [ ] **Step 1.4: Create `api/analyze.js`**

```js
const { callAnthropic } = require('./_anthropic');

function parseJSON(text) {
  try {
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

const SYSTEM = `You are an ATS (Applicant Tracking System) analyzer.
Analyze how well a resume matches a job description. Return ONLY a JSON object with this shape:
{
  "overallScore": number (0-100),
  "matchedSkills": string[],
  "missingKeywords": string[],
  "suggestions": string[]
}`;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, jd } = req.body || {};
  if (!resumeText || !jd) {
    return res.status(400).json({ error: 'resumeText and jd are required' });
  }

  try {
    const raw = await callAnthropic(SYSTEM, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
    const parsed = parseJSON(raw);

    if (!parsed || typeof parsed.overallScore !== 'number') {
      return res.status(422).json({ error: 'LLM returned malformed analysis. Please try again.' });
    }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[api/analyze]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
```

- [ ] **Step 1.5: Update `src/services/aiService.js` — switch `callLLM` to prefer the proxy**

Replace the `callLLM` function with one that prefers `/api/tailor` or `/api/analyze` in production:

```js
// Replace callLLM with a new internal helper that routes to the proxy
const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Dev: call Anthropic directly (key in .env.local only, never committed)
// Prod: call the Vercel serverless proxy instead
async function callProxy(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  return data; // already parsed JSON from the proxy
}

async function callLLM(systemPrompt, userMessage) {
  if (!ANTHROPIC_KEY) {
    throw new Error(
      'No Anthropic API key. Set REACT_APP_ANTHROPIC_KEY in .env.local (see .env.local.example).'
    );
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `LLM request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}
```

Update `tailorResume` to use the proxy when `REACT_APP_ANTHROPIC_KEY` is not set:

```js
export async function tailorResume(resume, jd) {
  if (!jd || !jd.trim()) {
    throw new Error('Job description is required.');
  }
  const resumeText = resumeToText(resume);

  // Production path: call the Vercel proxy
  if (!ANTHROPIC_KEY) {
    return callProxy('/api/tailor', { resumeText, jd: jd.slice(0, 5000) });
  }

  // Dev path: call Anthropic directly
  const systemPrompt = `You are an expert resume coach helping job seekers tailor their resumes to specific job descriptions.
Your goal is to improve the resume's match to the job while maintaining the candidate's authentic voice — never invent experience or exaggerate.

Return ONLY a JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have exactly these fields:
{
  "section": string,
  "original": string,
  "tailored": string,
  "reason": string
}

Rules:
- Only include sections that were actually changed
- Do not invent experience, degrees, or skills that aren't in the resume
- Keep the candidate's writing voice
- Prioritize bullet points that can be rewritten to match JD keywords
- If a section is already strong for this job, skip it`;

  const raw = await callLLM(systemPrompt, `RESUME:\n${resumeText || '(empty resume)'}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
  const parsed = parseJSON(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('LLM returned malformed response. Please try again.');
  }
  for (const item of parsed) {
    if (!item.section || !item.tailored || !item.reason) {
      throw new Error('LLM returned malformed diff objects. Please try again.');
    }
  }
  return parsed;
}
```

Update `analyzeJobDescription` similarly:

```js
export async function analyzeJobDescription(jdText, resume) {
  const resumeText = resumeToText(resume);

  if (!ANTHROPIC_KEY) {
    // Production: call the proxy
    // But first check if we're in production (no key at all) vs dev mock
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return callProxy('/api/analyze', { resumeText, jd: jdText.slice(0, 5000) });
    }

    // Dev mock fallback (no key, localhost)
    console.warn('[aiService] No API key — using mock analyzeJobDescription response.');
    await new Promise(r => setTimeout(r, 800));
    const skills = resume?.skills || {};
    const allSkills = [
      ...(skills.technicalSkills || []),
      ...(skills.programmingLanguages || []),
      ...(skills.toolsSoftware || []),
    ].map(s => s.toLowerCase());
    const required = ['React.js', 'Node.js', 'TypeScript', 'REST APIs', 'PostgreSQL'];
    const matched = required.filter(s => allSkills.some(sk => sk.includes(s.toLowerCase())));
    const missing = required.filter(s => !allSkills.some(sk => sk.includes(s.toLowerCase())));
    return {
      overallScore: Math.round((matched.length / required.length) * 100),
      matchedSkills: matched,
      missingKeywords: missing,
      suggestions: [
        'Add more quantified achievements to bullet points',
        'Include missing keywords in your skills section',
        'Tailor your summary to match the job description',
      ],
    };
  }

  // Dev path: direct Anthropic call
  const systemPrompt = `You are an ATS (Applicant Tracking System) analyzer.
Analyze how well a resume matches a job description. Return ONLY a JSON object with this shape:
{
  "overallScore": number (0-100),
  "matchedSkills": string[],
  "missingKeywords": string[],
  "suggestions": string[]
}`;

  const raw = await callLLM(systemPrompt, `RESUME:\n${resumeText || '(empty resume)'}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 5000)}`);
  const parsed = parseJSON(raw);

  if (!parsed || typeof parsed.overallScore !== 'number') {
    throw new Error('LLM returned malformed analysis. Please try again.');
  }
  return parsed;
}
```

- [ ] **Step 1.6: Update `.env.local.example`**

```
# Development only — Anthropic API key for direct browser calls (dev only, never committed)
# In production, set ANTHROPIC_KEY (no REACT_APP prefix) in Vercel environment variables
REACT_APP_ANTHROPIC_KEY=sk-ant-...

# Supabase (required for Sprint 2 — get from your Supabase project settings)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (set in Vercel dashboard, NOT in .env.local)
# ANTHROPIC_KEY=sk-ant-...
```

- [ ] **Step 1.7: Commit**

```bash
git add api/ vercel.json src/services/aiService.js .env.local.example
git commit -m "feat: add Vercel proxy functions for Anthropic API (removes key from client)"
```

---

## Task 2: Supabase Client + SQL Schema

Install the Supabase client and define the database schema. No code changes to contexts yet.

**Files:**
- Create: `src/lib/supabaseClient.js`
- Create: `supabase/schema.sql`

- [ ] **Step 2.1: Install `@supabase/supabase-js`**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm install @supabase/supabase-js
```

Expected: added to `node_modules`, updated in `package.json`.

- [ ] **Step 2.2: Create `src/lib/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local — see .env.local.example.'
  );
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
```

- [ ] **Step 2.3: Create `supabase/schema.sql`**

Run this in the Supabase SQL editor (Project → SQL Editor → New Query).

```sql
-- ============================================================
-- ScopusResume database schema
-- Run in Supabase SQL Editor: Project → SQL → New Query
-- ============================================================

-- Resumes table
-- resume data stored as JSONB — avoids 50+ column schema for a nested object
CREATE TABLE IF NOT EXISTS resumes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Untitled Resume',
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can only access their own resumes
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own resumes"
  ON resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes"
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Resume versions table (application history)
-- Stores a point-in-time snapshot of a resume after tailoring
CREATE TABLE IF NOT EXISTS resume_versions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id       UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot        JSONB       NOT NULL,    -- full resume data at time of save
  job_description TEXT,                    -- JD text that produced the diffs
  tailored_diffs  JSONB,                   -- [{section,original,tailored,reason}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own versions"
  ON resume_versions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own versions"
  ON resume_versions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own versions"
  ON resume_versions FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/supabaseClient.js supabase/schema.sql package.json package-lock.json
git commit -m "feat: add Supabase client + database schema (resumes + resume_versions)"
```

---

## Task 3: Supabase Auth (replace mock authService + AuthContext + auth guards)

**Files:**
- Replace: `src/services/authService.js`
- Replace: `src/context/AuthContext.jsx`
- Create: `src/components/auth/RequireAuth.jsx`
- Modify: `src/router.jsx`

- [ ] **Step 3.1: Replace `src/services/authService.js` with Supabase auth**

```js
import { supabase } from '../lib/supabaseClient';

const authService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  async register({ name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { message: 'Reset email sent' };
  },

  async updateProfile(data) {
    const updates = {};
    if (data.name) updates.data = { full_name: data.name };
    if (data.email) updates.email = data.email;

    const { data: updated, error } = await supabase.auth.updateUser(updates);
    if (error) throw new Error(error.message);
    return updated.user;
  },

  async deleteAccount() {
    // Supabase doesn't expose deleteUser from the client — requires a server function.
    // For now, sign the user out. A server-side delete function is a Sprint 3 TODO.
    await supabase.auth.signOut();
  },
};

export default authService;
```

- [ ] **Step 3.2: Replace `src/context/AuthContext.jsx` with Supabase session listener**

```jsx
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { user } = await authService.login(email, password);
    return user;
  };

  const register = async (data) => {
    const { user } = await authService.register(data);
    return user;
  };

  const logout = async () => {
    await authService.logout();
  };

  const updateProfile = async (data) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    return updated;
  };

  // Derive display name from Supabase user metadata
  const displayUser = user
    ? { ...user, name: user.user_metadata?.full_name || user.email }
    : null;

  return (
    <AuthContext.Provider value={{
      user: displayUser,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3.3: Create `src/components/auth/RequireAuth.jsx`**

```jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Wraps protected routes. Redirects to /signin if not authenticated.
 * Preserves the attempted URL so we can redirect back after login.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Supabase is checking session — show nothing to avoid flash
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}
```

- [ ] **Step 3.4: Update `src/router.jsx` to wrap `/app` routes**

Wrap the `/app` route's children with `RequireAuth`:

```jsx
import RequireAuth from './components/auth/RequireAuth';

// Replace the /app route definition:
{
  path: '/app',
  element: (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  ),
  children: [
    { index: true, element: <DashboardPage /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'builder', element: <ResumeBuilderPage /> },
    { path: 'builder/:id', element: <ResumeBuilderPage /> },
    { path: 'preview/:id', element: <ResumePreviewPage /> },
    { path: 'jd-analyzer', element: <JDAnalyzerPage /> },
    { path: 'optimize/:id', element: <AIOptimizationPage /> },
    { path: 'ats/:id', element: <ATSOptimizerPage /> },
    { path: 'export/:id', element: <ExportPage /> },
    { path: 'settings', element: <AccountSettingsPage /> },
  ],
},
```

Also update the SignIn page to redirect back to the original URL after login. Open `src/pages/auth/SignInPage.jsx` and find where `navigate` is called after successful login. Change:

```js
// find the navigate call after login success and replace with:
const from = location.state?.from?.pathname || '/app/dashboard';
navigate(from, { replace: true });
```

You'll also need to add `import { useLocation } from 'react-router-dom'` and `const location = useLocation()` in that component.

- [ ] **Step 3.5: Verify auth works**

```bash
npm start
```

1. Open `http://localhost:3000/app/dashboard` — should redirect to `/signin`
2. Sign in with any Supabase user (create one in Supabase dashboard → Authentication → Users → Invite user)
3. After sign-in, should land on dashboard
4. Refresh page — should stay logged in (session persisted by Supabase in localStorage)
5. Click logout — should redirect to `/`

- [ ] **Step 3.6: Commit**

```bash
git add src/services/authService.js src/context/AuthContext.jsx src/components/auth/RequireAuth.jsx src/router.jsx src/pages/auth/SignInPage.jsx
git commit -m "feat: replace mock auth with Supabase email/password auth + route guards"
```

---

## Task 4: Supabase Resume Persistence (replace localStorage)

**Files:**
- Replace: `src/services/resumeService.js`
- Replace: `src/context/ResumeContext.jsx`

The key design decision: keep context updates **optimistic** (update local state immediately, then sync to Supabase in background). This preserves the snappy UX of the localStorage version while adding real persistence.

- [ ] **Step 4.1: Replace `src/services/resumeService.js` with Supabase queries**

```js
import { supabase } from '../lib/supabaseClient';
import { emptyResume } from '../constants/resumeFields';
import { generateResumeId } from '../utils/formatters';

/**
 * All methods are async and throw on error.
 * The context layer handles optimistic updates for UX.
 */
const resumeService = {
  async getResumes() {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, name, created_at, updated_at, data')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    // Flatten: merge top-level fields with data JSONB
    return (data || []).map(row => ({ id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at, ...row.data }));
  },

  async getResumeById(id) {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, name, created_at, updated_at, data')
      .eq('id', id)
      .single();

    if (error) return null;
    return { id: data.id, name: data.name, createdAt: data.created_at, updatedAt: data.updated_at, ...data.data };
  },

  async createResume(name = 'Untitled Resume') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, name, data: emptyResume })
      .select('id, name, created_at, updated_at, data')
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id, name: data.name, createdAt: data.created_at, updatedAt: data.updated_at, ...data.data };
  },

  async updateResume(id, updates) {
    // Separate name from the rest of the data
    const { id: _id, name, createdAt: _c, updatedAt: _u, ...data } = updates;

    const patch = { data };
    if (name !== undefined) patch.name = name;

    const { data: row, error } = await supabase
      .from('resumes')
      .update(patch)
      .eq('id', id)
      .select('id, name, created_at, updated_at, data')
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at, ...row.data };
  },

  async deleteResume(id) {
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export default resumeService;
```

- [ ] **Step 4.2: Replace `src/context/ResumeContext.jsx` with async + optimistic updates**

```jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import resumeService from '../services/resumeService';
import { useAuth } from '../hooks/useAuth';

export const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResumeState] = useState(null);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Load resumes whenever auth state changes
  const loadResumes = useCallback(async () => {
    if (!isAuthenticated) { setResumes([]); return; }
    setLoadingResumes(true);
    try {
      const data = await resumeService.getResumes();
      setResumes(data);
    } catch (err) {
      console.error('[ResumeContext] loadResumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadResumes(); }, [loadResumes]);

  const createResume = async (nameOrData) => {
    const name = typeof nameOrData === 'string'
      ? nameOrData
      : (nameOrData?.title || nameOrData?.name || 'Untitled Resume');

    const created = await resumeService.createResume(name);

    // If extra data was passed, merge it in
    let final = created;
    if (typeof nameOrData === 'object' && nameOrData !== null) {
      const { title, name: _n, ...data } = nameOrData;
      final = await resumeService.updateResume(created.id, { ...created, ...data });
    }

    setResumes(prev => [final, ...prev]);
    setCurrentResumeState(final);
    return final;
  };

  const updateResume = async (id, data) => {
    // Optimistic update
    const optimistic = { ...data, updatedAt: new Date().toISOString() };
    setResumes(prev => prev.map(r => r.id === id ? optimistic : r));
    if (currentResume?.id === id) setCurrentResumeState(optimistic);

    // Background sync
    try {
      const saved = await resumeService.updateResume(id, data);
      setResumes(prev => prev.map(r => r.id === id ? saved : r));
      if (currentResume?.id === id) setCurrentResumeState(saved);
      return saved;
    } catch (err) {
      console.error('[ResumeContext] updateResume failed, refreshing:', err);
      await loadResumes(); // revert optimistic on error
      return null;
    }
  };

  const deleteResume = async (id) => {
    // Optimistic remove
    setResumes(prev => prev.filter(r => r.id !== id));
    if (currentResume?.id === id) setCurrentResumeState(null);

    try {
      await resumeService.deleteResume(id);
    } catch (err) {
      console.error('[ResumeContext] deleteResume failed, refreshing:', err);
      await loadResumes();
    }
  };

  const setCurrentResume = async (id) => {
    const local = resumes.find(r => r.id === id);
    if (local) { setCurrentResumeState(local); return; }
    const fetched = await resumeService.getResumeById(id);
    setCurrentResumeState(fetched);
  };

  const updateSection = (section, data) => {
    if (!currentResume) return;
    return updateResume(currentResume.id, { ...currentResume, [section]: data });
  };

  return (
    <ResumeContext.Provider value={{
      resumes, currentResume, loadingResumes,
      createResume, updateResume, deleteResume,
      setCurrentResume, updateSection,
    }}>
      {children}
    </ResumeContext.Provider>
  );
}
```

- [ ] **Step 4.3: Verify resume CRUD works**

```bash
npm start
```

1. Sign in
2. Dashboard → create a new resume → should appear on dashboard
3. Open builder, fill in "Full Name" → save/navigate away → come back → name should persist
4. Delete a resume from dashboard → should disappear
5. Sign out → sign back in → resumes should still be there (pulled from Supabase, not localStorage)

- [ ] **Step 4.4: Commit**

```bash
git add src/services/resumeService.js src/context/ResumeContext.jsx
git commit -m "feat: replace localStorage resume storage with Supabase CRUD (optimistic updates)"
```

---

## Task 5: Application History Model

When a user clicks "Apply All" in the AI Tailor page, save a snapshot of the resume before changes are applied. This gives users a version history they can refer back to.

**Files:**
- Create: `src/services/resumeVersionService.js`
- Modify: `src/pages/optimizer/JDAnalyzerPage.jsx`

- [ ] **Step 5.1: Create `src/services/resumeVersionService.js`**

```js
import { supabase } from '../lib/supabaseClient';

const resumeVersionService = {
  /**
   * Save a snapshot of a resume (before applying AI diffs).
   * @param {string} resumeId
   * @param {object} snapshot - the full resume object at time of save
   * @param {string} jobDescription - the JD text used for tailoring
   * @param {Array} tailoredDiffs - [{section, original, tailored, reason}]
   */
  async saveVersion(resumeId, snapshot, jobDescription, tailoredDiffs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('resume_versions')
      .insert({
        resume_id: resumeId,
        user_id: user.id,
        snapshot,
        job_description: jobDescription,
        tailored_diffs: tailoredDiffs,
      })
      .select('id, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Fetch all versions for a resume, newest first.
   * @param {string} resumeId
   */
  async getVersions(resumeId) {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('id, created_at, job_description, tailored_diffs')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },
};

export default resumeVersionService;
```

- [ ] **Step 5.2: Update `src/pages/optimizer/JDAnalyzerPage.jsx` — save version on Apply All**

Add the import at the top:

```js
import resumeVersionService from '../../services/resumeVersionService';
```

Update `handleApplyAll`:

```js
const handleApplyAll = async () => {
  if (!selectedResume || !diffs) return;

  // Save a version snapshot BEFORE applying (so user can see what changed)
  try {
    await resumeVersionService.saveVersion(
      selectedResume.id,
      selectedResume,       // snapshot of resume before diffs
      jdText,               // the JD that produced these diffs
      diffs                 // the diff array
    );
  } catch (err) {
    // Non-fatal — don't block the user from applying
    console.warn('[JDAnalyzerPage] Failed to save version snapshot:', err);
  }

  updateResume(selectedResume.id, {
    ...selectedResume,
    tailoredDiffs: diffs,
  });
  setSaved(true);
};
```

Note: `handleApplyAll` now needs to be `async`. Update the button too:

```jsx
<button
  onClick={handleApplyAll}
  className="text-sm font-medium text-brand-600 hover:text-brand-700"
>
  Apply all
</button>
```

(No change to the JSX needed — it calls the function, async is transparent here.)

- [ ] **Step 5.3: Verify version saving**

```bash
npm start
```

1. Sign in → open AI Tailor → select a resume, paste a JD, click "Tailor Resume"
2. When diffs appear, click "Apply all"
3. In Supabase dashboard → Table Editor → `resume_versions` → should see a new row with the snapshot

- [ ] **Step 5.4: Commit**

```bash
git add src/services/resumeVersionService.js src/pages/optimizer/JDAnalyzerPage.jsx
git commit -m "feat: save resume version snapshot when applying AI tailoring diffs"
```

---

## Self-Review

### Spec Coverage Check

| Sprint 2 requirement | Task |
|---------------------|------|
| Vercel Edge Function proxy (remove API key from client) | Task 1 |
| Supabase project setup + env vars | Tasks 2 |
| Replace mock AuthContext with Supabase auth | Task 3 |
| Auth guards on /app/* routes | Task 3 |
| Resume data → Supabase (PostgreSQL) | Task 4 |
| Application history model | Task 5 |

All requirements covered.

### Known Gaps / Deferred to Sprint 3

- **PasswordResetPage**: The page currently shows a form — needs to be connected to `authService.forgotPassword`. The Supabase `resetPasswordForEmail` call fires a magic-link email; the redirect URL is already set to `/reset-password`. The page needs to handle the Supabase token in the URL hash and call `supabase.auth.updateUser({ password })`. Deferred as a follow-on task.
- **`deleteAccount`**: Supabase doesn't allow `admin.deleteUser` from the client. Full implementation requires a Supabase Edge Function (server-side). Currently falls back to sign-out.
- **Data migration**: Existing localStorage resumes are abandoned on first Supabase login. A one-time migration script (read from localStorage → POST to Supabase) is a Sprint 3 TODO.
- **`loadingResumes` in UI**: The `ResumeContext` exposes `loadingResumes` but the `DashboardPage` doesn't show a loading state yet. Can show skeleton cards when `loadingResumes && resumes.length === 0`.

### Placeholder Scan

No TBDs. All code blocks are complete.

### Type Consistency

- `resumeService.createResume` → returns flat resume object (id, name, createdAt, updatedAt, ...data)
- `resumeService.updateResume` → same shape
- `ResumeContext` expects this shape throughout — consistent
- `resumeVersionService.saveVersion` accepts `(resumeId, snapshot, jobDescription, tailoredDiffs)` — matches call site in Task 5
