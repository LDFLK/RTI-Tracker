# Vite Environment Variables on WSO2 Developer Platform
### Understanding the Build-Time Gap and the Runtime Config Fix

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Why Vite's `import.meta.env` Breaks on WSO2](#2-why-vites-importmetaenv-breaks-on-wso2)
3. [How to Spot the Gap](#3-how-to-spot-the-gap)
4. [The Fix: Runtime Configuration Pattern](#4-the-fix-runtime-configuration-pattern)
5. [Step-by-Step Implementation](#5-step-by-step-implementation)
6. [WSO2 Deployment Configuration](#6-wso2-deployment-configuration)

---

## 1. The Problem

When you deploy a Vite-based React application to the WSO2 Developer Platform, you may notice that environment variables mounted at runtime (via a `.env` file or volume mount) are completely ignored by the application, even though the same setup works perfectly on your local machine.

**Symptom:**

```
Missing Asgardeo configuration. Please check your .env file.
```

**Cause:** Vite bakes all `import.meta.env.VITE_*` variables into the JavaScript bundle **at build time**. By the time your `.env` file is mounted on the containers, the build is already done and shipped. There is nothing left to read.

---

## 2. Why Vite's `import.meta.env` Breaks on react buildpack in WSO2 Developer Platform

### How Vite Handles Environment Variables

Vite replaces every `import.meta.env.VITE_*` reference with the **literal value** from your `.env` file during the build step. This is a compile-time substitution, not a runtime lookup.

**Your source code:**
```ts
const CLIENT_ID = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
```

**What the built bundle actually contains:**
```js
// If the variable was available during build:
const CLIENT_ID = "my-actual-client-id";

// If the variable was NOT available during build:
const CLIENT_ID = void 0; // i.e., undefined
```

Once the `dist/` folder is produced, those values are frozen. No file mount, environment injection, or server restart will change what is already compiled into the JavaScript.

### Why WSO2's react buildpack Makes This Worse

It follows this sequence:

```
1. Clone / receive source code
2. Run: npm install && npm run build   ← Vite compiles here, env vars needed NOW
3. Serve the dist/ folder
4. Mount .env file                     ← Too late. Build is done.
```

Your `.env` file arrives at step 4. Vite needed it at step 2. The gap is structural, not a misconfiguration on your part.

---

## 3. How to Spot the Gap

Open your browser's DevTools, go to **Sources**, find the main JS bundle, and search for your expected variable value (e.g., your client ID string).

If you see something like this in the minified output:

```js
const D7 = void 0
const S7 = void 0;
console.error("Missing Asgardeo configuration. Please check your .env file.");
```

...then your variables were `undefined` at build time. The bundle proves it. The mounted `.env` file had no effect.

---

## 4. The Fix: Runtime Configuration Pattern

The solution is to stop relying on Vite's build-time substitution for values that change per environment, and instead load configuration from a plain JavaScript file that the browser fetches at **runtime** before your app starts.

### How It Works

```
Browser requests your app
  → index.html loads
    → <script src="/config.js"> runs first     ← sets window.__ENV__
    → your Vite bundle loads second            ← reads from window.__ENV__
```

The `config.js` file lives in the `dist/` folder and is served as a static file. On the container, you mount the **real** `config.js` (with actual values) in place of the placeholder one. Since the browser fetches it fresh on every page load, it always gets the current values. No rebuild needed.

---

## 5. Step-by-Step Implementation

### Step 1 — Load `config.js` in `index.html` before anything else

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your App</title>

    <!-- MUST be before the Vite bundle script -->
    <script src="/config.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Step 2 — Create a central config module (`src/config.ts`)

This module reads from `window.__ENV__` first (for deployed environments), and falls back to `import.meta.env` (for local development, where `.env` still works normally).

```ts
// src/config.ts

// window.__ENV__ is set by /config.js at runtime on deployed environments.
// import.meta.env is set by Vite at build time for local development.

const runtimeEnv = (window as any).__ENV__ ?? {};

export const config = {
  ASGARDEO_CLIENT_ID:
    runtimeEnv.VITE_ASGARDEO_CLIENT_ID ||
    import.meta.env.VITE_ASGARDEO_CLIENT_ID,

  ASGARDEO_BASE_URL:
    runtimeEnv.VITE_ASGARDEO_BASE_URL ||
    import.meta.env.VITE_ASGARDEO_BASE_URL,

  RTI_TRACKER_SERVER_URL:
    runtimeEnv.VITE_RTI_TRACKER_SERVER_URL ||
    import.meta.env.VITE_RTI_TRACKER_SERVER_URL,

  FILE_STORAGE_BASE_URL:
    runtimeEnv.VITE_FILE_STORAGE_BASE_URL ||
    import.meta.env.VITE_FILE_STORAGE_BASE_URL,
};

// Validation
if (!config.ASGARDEO_CLIENT_ID || !config.ASGARDEO_BASE_URL) {
  console.error(
    "Missing Asgardeo configuration. " +
    "Ensure config.js is mounted correctly on this environment."
  );
}
```

---

### Step 4 — Replace all `import.meta.env` usages in your app

Search your entire codebase for `import.meta.env.VITE_` and replace them:

```ts
// Before
const clientId = import.meta.env.VITE_ASGARDEO_CLIENT_ID;

// After
import { config } from '@/config';
const clientId = config.ASGARDEO_CLIENT_ID;
```

---

### Step 5 — Your local `.env` still works as-is

For local development, nothing changes. Your `.env` file is still read by Vite at build time when you run `vite dev`. The `|| import.meta.env.*` fallback in `config.ts` handles this automatically.

```
Local dev  → Vite reads .env → import.meta.env.* has values → config.ts fallback works ✅
WSO2 prod  → config.js mounted → window.__ENV__ has values → config.ts primary path works ✅
```

---

## 6. WSO2 Deployment Configuration

### Build settings (unchanged)

```
Build Context Path   : /tool/frontend
Build Command        : npm install && npm run build
Node Version         : 20
Build Output Dir     : dist
```

### What to mount on WSO2

Instead of mounting a `.env` file, mount a `config.js` file at the path:

```
dist/config.js
```

or equivalently, wherever your static files are served from, at the path `/config.js`.

**The mounted `config.js` content:**

```js
window.__ENV__ = {
  VITE_ASGARDEO_CLIENT_ID: "your-real-asgardeo-client-id",
  VITE_ASGARDEO_BASE_URL: "https://api.asgardeo.io/t/your-org",
  VITE_RTI_TRACKER_SERVER_URL: "http://your-backend-service:8080",
  VITE_FILE_STORAGE_BASE_URL: "https://your-storage-endpoint",
};
```

This file is fetched by the browser on every page load, so value changes take effect on the next load without any rebuild.

---

*This document covers Vite-based React applications deployed on WSO2 Developer Platform using the React.js buildpack. The runtime config pattern applies equally to any static hosting platform where environment variables cannot be injected at build time.*