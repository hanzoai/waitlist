# Widget

`@hanzo/waitlist`. React component + framework-free client + drop-in custom
element. One bundle, three entry points.

## Install

```bash
pnpm add @hanzo/waitlist
```

## React

```tsx
import { Waitlist } from '@hanzo/waitlist'
import '@hanzo/waitlist/styles.css'

<Waitlist waitlist="my-product" baseUrl="https://api.example.com" />
```

Props:

| Prop               | Type                              | Default      | Notes |
|--------------------|-----------------------------------|--------------|-------|
| `waitlist`         | `string`                          | (required)   | slug or record id |
| `baseUrl`          | `string`                          | current origin | Hanzo Base URL |
| `mode`             | `"inline" \| "modal"`             | `"inline"`   | |
| `theme`            | `"auto" \| "light" \| "dark"`     | `"auto"`     | overrides `prefers-color-scheme` |
| `turnstileToken`   | `string`                          | —            | host renders Turnstile; passes the token in |
| `hideShare`        | `boolean`                         | `false`      | |
| `onSuccess`        | `(entry) => void`                 | —            | |
| `onError`          | `({ message, status }) => void`   | —            | |

Plus copy overrides (`title`, `subtitle`, `submitLabel`, `successTitle`,
`successSubtitle`, `triggerLabel`).

## Framework-free client

```ts
import { WaitlistClient } from '@hanzo/waitlist/client'

const c = new WaitlistClient({ baseUrl: 'https://api.example.com' })
const result = await c.join({ waitlist: 'my-product', email: 'a@b.co' })
if (result.ok) console.log(result.rank)
```

Same module, no React, no DOM.

## Drop-in custom element

```html
<link rel="stylesheet" href="https://cdn.example.com/@hanzo/waitlist/style.css">
<script src="https://cdn.example.com/@hanzo/waitlist/waitlist.iife.js"></script>

<hanzo-waitlist
  waitlist="my-product"
  base-url="https://api.example.com"
  mode="modal"
  theme="dark">
</hanzo-waitlist>
```

The custom element does NOT use Shadow DOM. The widget's monochrome
design *wants* to inherit the host's font and color tokens — isolating
it would defeat the point.

## Theming

Override CSS variables on `.hanzo-waitlist` (or any ancestor):

| Variable          | Default                       | Purpose |
|-------------------|-------------------------------|---------|
| `--hw-bg`         | `#ffffff` / `#0a0a0a`         | surface |
| `--hw-fg`         | `#0a0a0a` / `#fafafa`         | text |
| `--hw-muted`      | derived from `--hw-fg`        | secondary text |
| `--hw-border`     | derived from `--hw-fg`        | border / outlines |
| `--hw-accent`     | `var(--hw-fg)`                | button + rank-number |
| `--hw-accent-fg`  | `var(--hw-bg)`                | text on accent |
| `--hw-radius`     | `12px`                        | global radius |
| `--hw-input-radius` | `8px`                       | input/button radius |
| `--hw-font`       | system stack                  | font family |
| `--hw-shadow`     | subtle drop                   | card shadow |

Example override (illustrative — your selector, your values):

```css
.your-brand {
  --hw-accent: <accent>;
  --hw-accent-fg: <text on accent>;
  --hw-radius: <corner radius>;
}
```

Wrap the widget in `<div class="your-brand">` and it's done.

## Cloudflare Turnstile

The widget does not render the Turnstile challenge itself — brand-bound
sitekey policies make that unwise. The host page mounts Turnstile,
captures the token, passes it via the `turnstileToken` prop (or via
`turnstile-token` attribute on the custom element).
