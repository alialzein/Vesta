---
name: frontend-defaults
description: Apply standard UI conventions when creating or editing web pages and routes — page-transition loading indicators (spinner/progress bar), dark and light mode support, back buttons on sub-pages, and standard loading/error/empty states. Use whenever building, scaffolding, or modifying any frontend page, route, view, or screen.
---

# Frontend defaults — apply to every page/route

## Page transitions

- Show a loading indicator on every navigation between pages: a top progress
  bar (e.g. nprogress-style) or a spinner. Never let a navigation happen with
  no visible feedback.
- On route change, move focus to the main heading (h1) for accessibility.

## Theming

- Every page and component must support dark and light mode.
- Read the theme from a shared provider/context. Never hardcode color literals.
- Use CSS variables or framework dark-mode utilities (e.g. Tailwind `dark:`).

## Navigation

- Add a back button on every page that is not the root/home route.
- Back button should use the router's history, falling back to the home route.

## Default states for every page

- Always implement loading, error, and empty states — never just the happy path.

## Checklist before finishing any page

1. Loading indicator on entry/navigation present
2. Dark + light mode verified
3. Back button present (if not root)
4. Loading / error / empty states handled
5. Focus moved to main heading on route change
