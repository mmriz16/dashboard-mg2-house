# MG2 House — Design System

Dokumentasi design system untuk **MG2 House Dashboard**. Semua komponen menggunakan **Tailwind CSS v4** dengan dark theme.

---

## 🎨 Design Tokens

### Colors

All colors are registered as Tailwind theme tokens in `globals.css` — use them as regular Tailwind classes.

#### Surfaces

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| Surface | `#111214` | `bg-surface` | Page background, input background |
| Surface Card | `#151618` | `bg-surface-card` | Card, panel, sidebar |
| Surface Hover | `#1a1b1e` | `bg-surface-hover` | Button hover state |

#### Brand Colors

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| Purple | `#B558FF` | `text-purple`, `bg-purple` | Default badge, accent |
| Green | `#00C950` | `text-green`, `bg-green` | Success badge |
| Yellow | `#F0B100` | `text-yellow`, `bg-yellow` | Warning badge |
| Red | `#FB2C36` | `text-red`, `bg-red` | Danger badge, error text |
| Blue | `#00A6F4` | `text-blue`, `bg-blue` | Info badge |

#### Semantic Colors

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| Border | `white/10` | `border-border` | Borders, dividers |
| Border Hover | `white/20` | `border-border-hover` | Focus borders |
| Muted | `white/50` | `text-muted` | Placeholder, icon text |
| Subtle | `white/70` | `text-subtle` | Secondary text, descriptions |

### Typography

| Font | Variable | Usage |
|------|----------|-------|
| **Manrope** | `--font-manrope` | Primary — headings, body text, labels, buttons |
| **IBM Plex Mono** | `--font-ibm-plex-mono` | Secondary — descriptions, badges, status text |

### Text Sizes

| Size | Usage |
|------|-------|
| `text-2xl` (24px) | Page headings (`h1`) |
| `text-sm` (14px) | Body text, button text, input text, labels |
| `text-xs` (12px) | Descriptions (uppercase), badge text |
| `text-[10px]` | Badge text (pill) |

---

## 🧩 Components

### Button

📁 `components/ui/Button.tsx`

```tsx
import { Button } from "@/components/ui/Button"

// Variants
<Button variant="primary">Primary</Button>    // Dark bg, white text, border
<Button variant="white">White</Button>        // White bg, black text
<Button variant="secondary">Secondary</Button> // Transparent, hover dark bg
<Button variant="disabled">Disabled</Button>   // Faded text, no interaction

// With icons
<Button variant="primary" leftIcon={<Icon />}>With Left Icon</Button>
<Button variant="white" rightIcon={<Icon />}>With Right Icon</Button>

// Disabled state (works on any variant)
<Button variant="white" disabled>Disabled</Button>

// With onClick
<Button variant="white" onClick={() => {}}>Click Me</Button>
```

**Props** — extends `React.ButtonHTMLAttributes<HTMLButtonElement>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'white' \| 'disabled'` | `'primary'` | Visual style |
| `leftIcon` | `ReactNode` | — | Icon sebelum text |
| `rightIcon` | `ReactNode` | — | Icon sesudah text |
| `disabled` | `boolean` | `false` | Disable button (opacity 20%) |

---

### Input

📁 `components/ui/Input.tsx`

```tsx
import { Input } from "@/components/ui/Input"

<Input placeholder="Enter text" />
<Input label="Email" placeholder="you@email.com" />
<Input label="Password" type="password" />
<Input leftIcon={<ProfileIcon />} placeholder="With icon" />
<Input rightIcon={<EyeIcon />} placeholder="With right icon" />
<Input error="This field is required" />
```

**Props** — extends `React.InputHTMLAttributes<HTMLInputElement>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Label di atas input |
| `error` | `string` | — | Error message (red text) |
| `leftIcon` | `ReactNode` | — | Icon kiri (16px) |
| `rightIcon` | `ReactNode` | — | Icon kanan (16px) |

**Style**: `bg-[#111214]`, `border-white/10`, `rounded-[8px]`, `h-[40px]`

---

### InputGroup

📁 `components/ui/InputGroup.tsx`

Wrapper di atas `Input` dengan description text dan optional link di bawah.

```tsx
import { InputGroup } from "@/components/ui/InputGroup"

<InputGroup
  title="Email"
  leftIcon={<ProfileIcon />}
  placeholder="you@email.com"
  description="We'll use this to contact you."
  descriptionClassName="uppercase text-[12px]"
/>

// Dengan link
<InputGroup
  title="Password"
  placeholder="Enter password"
  description="Must be 8 characters."
  linkText="Forgot Password?"
  linkHref="/forgot-password"
/>
```

**Props** — extends `React.InputHTMLAttributes<HTMLInputElement>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Label (diteruskan ke `Input` sebagai `label`) |
| `description` | `string` | — | Helper text di bawah input |
| `descriptionClassName` | `string` | — | Class tambahan untuk description |
| `linkText` | `string` | — | Link text di kanan description |
| `linkHref` | `string` | `'#'` | Link URL |
| `leftIcon` | `ReactNode` | — | Icon kiri |
| `rightIcon` | `ReactNode` | — | Icon kanan |

---

### Badge

📁 `components/ui/Badge.tsx`

```tsx
import { Badge } from "@/components/ui/Badge"

<Badge text="Default" />                    // Purple
<Badge text="Active" style="success" />     // Green
<Badge text="Pending" style="warning" />    // Yellow
<Badge text="Error" style="danger" />       // Red
<Badge text="Info" style="info" />          // Blue
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | **required** | Badge text (auto uppercase) |
| `style` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'` | Color variant |
| `className` | `string` | — | Class tambahan |

**Style**: pill shape (`rounded-full`), `font-ibm-plex-mono`, `text-[10px]`, uppercase

---

### StatCard

📁 `components/ui/StatCard.tsx`

Kartu statistik untuk menampilkan metric utama dengan opsional badge persentase.

```tsx
import { StatCard } from "@/components/ui/StatCard"

<StatCard title="General Revenue" value="Rp 235,6 Mil" badgeText="+2.6%" />
<StatCard title="Total Orders" value="1.280" badgeText="-1.2%" badgeStyle="danger" />
<StatCard title="Active Users" value="3.450" />
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Judul kartu |
| `value` | `string` | **required** | Nilai utama (mono font) |
| `badgeText` | `string` | — | Teks badge (misal "+2.6%") |
| `badgeStyle` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'success'` | Warna badge |
| `className` | `string` | — | Class tambahan |

**Style**: `bg-surface-card`, `outline-border`, `rounded-2xl`, value area `bg-surface` + `font-ibm-plex-mono`

---

### Checkbox

📁 `components/ui/Checkbox.tsx`

```tsx
import { Checkbox } from "@/components/ui/Checkbox"

<Checkbox label="Remember me" />
<Checkbox label="Agree to terms" checked onChange={() => {}} />
<Checkbox />  {/* No label */}
```

**Props** — extends `React.InputHTMLAttributes<HTMLInputElement>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Label di samping checkbox |

**Style**: `bg-[#151618]`, `border-white/10`, checked: `bg-purple-600`, `20x20px`

---

### MenuItem

📁 `components/MenuItem.tsx`

```tsx
import { MenuItem } from "@/components/MenuItem"

// Variants
<MenuItem label="Dashboard" icon={<DashboardIcon />} variant="primary" />   // Dark bg + outline
<MenuItem label="Settings" icon={<SettingsIcon />} variant="secondary" />   // Transparent, hover bg
<MenuItem label="Archived" variant="disabled" />                            // Opacity 20%

// With badge & icons
<MenuItem label="Notifications" icon={<BellIcon />} badgeText="3" rightIcon={<ChevronIcon />} />

// Active state (overrides variant styling)
<MenuItem label="Dashboard" icon={<DashboardIcon />} active />

// Disabled via prop (works on any variant)
<MenuItem label="Locked" disabled />
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | Menu text |
| `variant` | `'primary' \| 'secondary' \| 'disabled'` | `'primary'` | Visual style |
| `icon` | `ReactNode` | — | Icon kiri (16px) |
| `rightIcon` | `ReactNode` | — | Icon kanan (16px) |
| `badgeText` | `string` | — | Badge pill di kanan (purple) |
| `active` | `boolean` | `false` | Active state (bg + outline) |
| `disabled` | `boolean` | `false` | Disabled state (opacity 20%) |
| `onClick` | `() => void` | — | Click handler |
| `className` | `string` | — | Class tambahan |

**Style**: `w-60`, `h-10`, `rounded-lg`, primary: `bg-surface-card` + `outline-border`

---

### SubMenuItem

📁 `components/SubMenuItem.tsx`

Sama seperti `MenuItem` tapi dengan garis indentasi vertikal + konektor horizontal di kiri (child item).

```tsx
import { SubMenuItem } from "@/components/SubMenuItem"

// Variants
<SubMenuItem label="Sub Item" icon={<FileIcon />} variant="primary" />     // Dark bg + outline
<SubMenuItem label="Settings" icon={<GearIcon />} variant="secondary" />   // Transparent
<SubMenuItem label="Locked" variant="disabled" />                          // Opacity 20%

// With badge & right icon
<SubMenuItem label="Reports" icon={<ChartIcon />} badgeText="02" rightIcon={<EyeIcon />} />

// Active state
<SubMenuItem label="Active Sub" active />
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | Menu text |
| `variant` | `'primary' \| 'secondary' \| 'disabled'` | `'primary'` | Visual style |
| `icon` | `ReactNode` | — | Icon kiri (16px) |
| `rightIcon` | `ReactNode` | — | Icon kanan (16px) |
| `badgeText` | `string` | — | Badge pill di kanan (purple) |
| `active` | `boolean` | `false` | Active state |
| `disabled` | `boolean` | `false` | Disabled state (opacity 20%) |
| `onClick` | `() => void` | — | Click handler |
| `className` | `string` | — | Class tambahan |

**Style**: `w-60`, `pl-4`, `border-l border-border` (vertical line), horizontal connector `w-2`, inner item `rounded-lg`

---

### SidebarItem

📁 `components/SidebarItem.tsx`

```tsx
import { SidebarItem } from "@/components/SidebarItem"

<SidebarItem label="Home" icon={<HomeIcon />} active />
<SidebarItem label="Projects" icon={<FolderIcon />} badge="5" />
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | Item text |
| `icon` | `ReactNode` | — | Icon kiri (20px) |
| `active` | `boolean` | `false` | Active state |
| `badge` | `string` | — | Badge kanan (purple pill) |
| `onClick` | `() => void` | — | Click handler |

---

## 📐 Layout Patterns

### Auth Page (Login / Register)

```
┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│   w-1/2, bg-[#151618]   │    (sisi kanan kosong)   │
│   border-r white/10     │                          │
│                          │                          │
│   ┌─ md:w-[500px] ────┐ │                          │
│   │  Heading           │ │                          │
│   │  Description       │ │                          │
│   │  [Input Fields]    │ │                          │
│   │  [Button]          │ │                          │
│   │  ── or ──          │ │                          │
│   │  [Google Button]   │ │                          │
│   │  Link              │ │                          │
│   └────────────────────┘ │                          │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

### Divider "Or continue with"

```tsx
<div className="flex items-center gap-6">
    <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
    <p className="uppercase font-ibm-plex-mono text-xs text-white/70">Or continue with</p>
    <div className="flex-1 h-0 outline outline-1 outline-offset-[-0.50px] outline-white/10"></div>
</div>
```

---

## 🔑 Auth Utilities

📁 `lib/auth-client.ts`

```tsx
import { authClient, getCachedSession, clearCachedSession } from "@/lib/auth-client"

// Sign in
await authClient.signIn.email({ email, password, callbackURL: "/dashboard" })

// Sign up
await authClient.signUp.email({ name, email, password, callbackURL: "/dashboard" })

// Google OAuth
await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })

// Sign out
clearCachedSession()
await authClient.signOut()

// Get session (React hook)
const { data: session, isPending } = authClient.useSession()

// Get cached session (instant, from localStorage)
const cached = getCachedSession()
```
