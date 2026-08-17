# Index Map Navigation Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the SVG click artifact and restore the faded map when index.html returns from BFCache.

**Architecture:** Keep the existing map initialization and navigation model. Add an idempotent UI-state reset around `pagehide`/persisted `pageshow`, and replace the browser-native SVG focus outline with an explicit accessible focus style.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, GSAP, Playwright/Edge regression checks.

---

### Task 1: SVG focus rendering

**Files:**
- Modify: `css/map.css:59-77`
- Test: local Edge against `http://127.0.0.1:8080/index.html`

- [ ] **Step 1: Verify the failing behavior**

Click a province in Edge and capture the frame 120 ms later. Before the fix, the active SVG path reports an `outline` containing `auto 5px`, and black/white rendering artifacts are visible.

- [ ] **Step 2: Add an explicit accessible focus style**

```css
#china-map .province:focus {
  outline: none;
}

#china-map .province:focus-visible {
  stroke: #C04851;
  stroke-width: 2.4;
  filter: drop-shadow(0 0 5px rgba(192, 72, 81, 0.42));
}
```

- [ ] **Step 3: Verify the click and keyboard states**

Confirm mouse click no longer produces a native SVG outline or visual artifact. Confirm Tab focus still produces a visible custom stroke.

### Task 2: BFCache-safe navigation state

**Files:**
- Modify: `js/map.js:20-25,182-201,311-315`
- Test: local Edge against `http://127.0.0.1:8080/index.html`

- [ ] **Step 1: Confirm the failing state transition**

Verify the click handler writes inline `opacity: 0` to `#map-container` before changing `window.location.href`, while no `pageshow` or `pagehide` listener exists.

- [ ] **Step 2: Implement idempotent state restoration**

```js
function restoreMapPageState() {
  gsap.killTweensOf(mapContainer);
  gsap.set(mapContainer, { clearProps: 'opacity' });
  mapContainer.classList.remove('is-leaving');
  navigationPending = false;
}
```

Call the helper from `pagehide` and from persisted `pageshow`. Do not call `init()` during BFCache restoration.

- [ ] **Step 3: Make click departure deterministic**

Blur the clicked path, hide the tooltip, lock repeated clicks, and mark the container as leaving before starting the existing fade and navigation.

- [ ] **Step 4: Verify back navigation**

Navigate index → province → browser Back. Confirm the map container has computed opacity `1`, contains 34 province paths, and accepts another province click.

### Task 3: Final checks

**Files:**
- Verify: `js/map.js`
- Verify: `css/map.css`

- [ ] **Step 1: Run JavaScript syntax validation**

Run `node --check js/map.js`. Expected result: exit code 0 with no output.

- [ ] **Step 2: Review the focused diff**

Run `git diff --check` and `git diff -- js/map.js css/map.css`. Expected result: no whitespace errors and only the approved lifecycle/focus changes.

- [ ] **Step 3: Commit the repair**

```text
首页地图：修复点击图样与后退后地图隐藏
```

