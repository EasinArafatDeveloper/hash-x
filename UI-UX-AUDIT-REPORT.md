# Morpheus — UI/UX Audit Report

**Project:** D:\office project (Next.js — "Morpheus: Enterprise Data Management & Intelligence OS")
**Audit করা হয়েছে:** globals.css, tailwind config, layout/shell/header/sidebar, dashboard + metric cards + charts, data explorer (table/card view, filters, pagination), upload flow, login + brand components, settings (partial), theme system — মোট ৩৭টি ফাইল সরাসরি code পড়ে + codebase-wide pattern grep।
**Framework:** UI/UX Pro Max priority checklist (Accessibility → Touch/Interaction → Performance → Style → Layout → Typography/Color → Animation → Forms/Feedback → Navigation → Charts)

---

## Overall impression

আপনার প্রজেক্টটা visually অনেক polished — 6-color theme system (CSS variables দিয়ে সুন্দরভাবে করা), dark/light mode, glassmorphism, framer-motion animation, upload flow-এর live telemetry terminal (এইটা genuinely impressive এবং প্রায় প্রোডাক্ট-গ্রেড)। ডিজাইন intent ভালো, কিন্তু কিছু **systemic (পুরো codebase জুড়ে repeat হওয়া)** সমস্যা আছে যেগুলো accessibility, readability আর কিছু জায়গায় reliability-কে সরাসরি আঘাত করছে। নিচে সবচেয়ে critical থেকে least-critical অনুযায়ী সাজানো হলো।

---

## 🔴 Priority 1 — Accessibility (CRITICAL)

### 1.1 Icon-only বাটনে aria-label প্রায় নেই
পুরো `src/` জুড়ে grep করে পাওয়া গেছে — মাত্র **2টা** `aria-label` আছে সারা codebase-এ (দুটোই Header.tsx-এ), অথচ icon-only button আছে অসংখ্য জায়গায়: Sidebar collapse toggle, Table/Card view-এর Edit/Delete icon বাটন, modal-এর X close বাটন, ThemeSelector, notification bell-এর ভেতরের বাটনগুলো, ইত্যাদি। এগুলোর বেশিরভাগে শুধু `title` attribute আছে, যেটা screen reader-এ reliably announce হয় না।
**Fix:** প্রতিটা icon-only বাটনে `aria-label` যোগ করুন (যেমন `aria-label="Edit record"`, `aria-label="Delete record"`, `aria-label="Close"`)। `title` রাখতে পারেন hover tooltip হিসেবে, কিন্তু `aria-label` আলাদাভাবে লাগবে।

### 1.2 Collapsed Sidebar-এ keyboard/screen-reader user label হারায়
`Sidebar.tsx`-এ sidebar collapse করলে label hide হয়ে যায়, আর replacement হিসেবে যে tooltip আছে সেটা শুধু `group-hover:opacity-100` — অর্থাৎ শুধু mouse hover-এ দেখা যায়। Keyboard দিয়ে Tab করে navigate করলে বা screen reader ব্যবহার করলে কোনো label পাওয়া যায় না।
**Fix:** collapsed অবস্থায় প্রতিটা nav link-এ `aria-label={item.label}` যোগ করুন, আর tooltip-টা `focus-visible` state-এও দেখান (শুধু hover না)।

### 1.3 Sortable table column header keyboard দিয়ে operate করা যায় না
`TableView.tsx`-এ sort করার জন্য `<th onClick={...}>` ব্যবহার করা হয়েছে — এটা `<th>`, কোনো button/role না, তাই Tab দিয়ে focus করা বা Enter দিয়ে activate করা সম্ভব না। সাথে `aria-sort` attribute-ও নেই যেটা screen reader-কে বর্তমান sort direction জানাবে।
**Fix:** header-এর ভেতর একটা আসল `<button>` রাখুন sort trigger হিসেবে, আর `<th aria-sort="ascending|descending|none">` যোগ করুন।

### 1.4 কোথাও `prefers-reduced-motion` respect করা হয়নি
পুরো codebase grep করে একটাও `prefers-reduced-motion` মেলেনি। অথচ পুরো app-এ framer-motion animation ভর্তি (sidebar slide, card entrance, modal transition), আর Login page-এ একটা full-screen canvas "Matrix rain" animation অনবরত চলতে থাকে। যাদের motion sensitivity আছে (vestibular disorder ইত্যাদি), তাদের জন্য এটা genuinely সমস্যাজনক, এবং এটা WCAG-এর একটা known requirement।
**Fix:** একটা shared hook বানান (`usePrefersReducedMotion`) আর সেটা দিয়ে MatrixRain বন্ধ/static করে দিন এবং framer-motion transition-গুলো reduce করুন যখন OS-level reduced-motion on থাকে।

---

## 🟠 Priority 2 — Touch, Interaction ও Consistency-critical bugs

### 2.1 সবচেয়ে ভয়ংকর action-টার জন্য plain browser `confirm()` ব্যবহার হয়েছে
`settings/page.tsx` line 475: **"delete all records"** (পুরো ডাটাবেজ মুছে ফেলা, সম্ভবত সবচেয়ে destructive action পুরো app-এ) করার আগে শুধু browser-এর native `confirm("This will permanently delete all records. Are you sure?")` ব্যবহার করা হয়েছে। অথচ Data Explorer-এ single record delete করার জন্য আপনারা নিজেরাই একটা সুন্দর custom modal বানিয়েছেন (AlertTriangle icon, red styling, Bengali confirmation text, loading state সহ)। সবচেয়ে বড় ক্ষতির action-টাই সবচেয়ে কম-safe confirmation পাচ্ছে — এটা একটা বড় inconsistency এবং risk।
একইভাবে line 331-এ 2FA device remove করার জন্যও plain `confirm()` ব্যবহার হয়েছে।
**Fix:** "Delete all records"-এর জন্য অন্তত existing delete-confirmation modal-টাই reuse করুন, আর এত বড় destructive action হলে "type DELETE to confirm" ধরনের extra safeguard বিবেচনা করুন।

### 2.2 "Replace Dataset" বাটনে কোনো confirmation নেই
`DatasetSummaryCard.tsx`-এ "Replace Dataset" বাটন — যেটা সম্ভবত active dataset প্রতিস্থাপন করে দেয় — এর কোনো confirmation dialog নেই, অথচ এটাও একটা potentially destructive/irreversible action।
**Fix:** একটা lightweight confirm modal যোগ করুন (একই design language যেটা delete modal-এ ব্যবহৃত হয়েছে)।

### 2.3 Table-এ bulk selection আছে কিন্তু কোনো bulk action নেই
`TableView.tsx`-এ "select all" checkbox আর প্রতি row checkbox কাজ করে (state track হয়), কিন্তু কোনো bulk action bar (bulk delete/export/tag) কোথাও দেখা যায়নি — checkbox select করলে ব্যবহারকারী কিছু ঘটবে বলে আশা করবে, কিন্তু কিছুই হয় না। এটা একটা অসম্পূর্ণ/বিভ্রান্তিকর feature।
**Fix:** হয় bulk action bar implement করুন, অথবা আপাতত checkbox column সরিয়ে ফেলুন যতক্ষণ না feature সম্পূর্ণ হয়।

### 2.4 Mobile-এর জন্য বানানো filter drawer আসলে ব্যবহারই হচ্ছে না
`components/explorer/FilterDrawerMobile.tsx` — touch-friendly bottom-sheet filter panel হিসেবে বানানো (LOCATIONS, STATUSES presets সহ) — কিন্তু `app/data/explorer/page.tsx` কোথাও এটা import/render করে না। এর বদলে mobile-এও desktop-oriented `FilterToolbar`-এর grid-layout advanced panel দেখানো হচ্ছে, যেটা ছোট screen-এ ঘন এবং কম touch-friendly।
**Fix:** হয় `FilterDrawerMobile` কে actual mobile breakpoint-এ wire করুন, অথবা যদি আর দরকার না হয় dead code হিসেবে সরিয়ে ফেলুন — দুটো parallel filter UI maintain করা bug-prone।

### 2.5 Ctrl+J shortcut browser-এর নিজস্ব shortcut-এর সাথে conflict করে
`AppShell.tsx`-এ AI Copilot খোলার জন্য global `Ctrl+J` / `Cmd+J` bind করা হয়েছে — কিন্তু Chrome-এ Ctrl+J হলো Downloads panel খোলার default shortcut। এই override ব্যবহারকারীর browser-এর normal behavior ভেঙে দেয়।
**Fix:** অন্য কোনো কম-common combination ব্যবহার করুন (যেমন `Ctrl+K` কমান্ড-প্যালেট প্যাটার্নের মতো, অথবা `Alt+/`), অথবা অন্তত settings-এ customizable রাখুন।

---

## 🟡 Priority 3 — Performance

### 3.1 MatrixRain অনবরত full-screen canvas animation চালায়
Login page-এর background-এ MatrixRain একটা কখনো না-থামা `requestAnimationFrame` loop চালায় (visibility/tab-focus check ছাড়া)। Login page-এ এটা acceptable, কিন্তু reduced-motion respect (উপরে ১.৪ দেখুন) এবং tab hidden হলে pause করার logic (`document.visibilityState`) থাকা উচিত যাতে ব্যাটারি/CPU অহেতুক না খরচ হয়।

### 3.2 CSV Export-এ optimistic fake feedback
`data/explorer/page.tsx`-এর `handleExportCSV` hidden-form POST দিয়ে export করে, কিন্তু success/failure যাচাই না করেই একটা fixed **1.5 সেকেন্ড timeout**-এর পর "Download initiated!" toast দেখায়। বড় dataset বা ধীর network-এ actual export fail হলেও ব্যবহারকারী মিথ্যা success message পাবেন।
**Fix:** সম্ভব হলে export-কে fetch+blob দিয়ে করুন যাতে real success/failure track করা যায়, অথবা অন্তত server থেকে একটা confirmation signal (polling/websocket) নিন।

---

## 🟣 Priority 4 — Style Consistency (Icons & Emoji)

### 4.1 Emoji আর Lucide icon মিশিয়ে ব্যবহার হচ্ছে — ১০০+ জায়গায়
Codebase grep অনুযায়ী **১০২টা emoji occurrence, ১৪টা ফাইলে** (FilterToolbar, ActiveFilterChips, AnalyticsCharts tab labels, DropZone/UploadHistory labels, DatasetSummaryCard-এর "⚡ Seed Demo" বাটন, upload page format-tips ইত্যাদি)। অথচ পুরো app-এ lucide-react icon library আছে এবং বেশিরভাগ জায়গায় সেটাই ব্যবহৃত হচ্ছে। ফলাফল: একই semantic category-এর জন্য কোথাও SVG icon, কোথাও emoji — একটা inconsistent visual language তৈরি হয়েছে, এবং "Enterprise" পজিশনিং-এর সাথে emoji-heavy UI কিছুটা খাপ খায় না। Emoji rendering platform/OS ভেদে আলাদা দেখায়, আর screen reader emoji-কে জোরে verbal announce করে (যেমন "rocket emoji", "party popper emoji") — যেটা log/terminal-এর মতো জায়গায় বিরক্তিকর হতে পারে।
**Fix:** demographics/locations/telecom/merchants/spenders tab-এর মতো functional UI থেকে emoji সরিয়ে matching lucide icon বসান (Users, MapPin, Smartphone, Store, Crown ইত্যাদি — যেগুলো আসলে already import করা আছে অন্য জায়গায়)। Upload log terminal বা login screen-এর মতো "flavor"/branding জায়গায় emoji রাখা যেতে পারে ইচ্ছাকৃত হলে, কিন্তু filter/dropdown/button-এর মতো functional UI থেকে অবশ্যই সরানো উচিত।

---

## 🔵 Priority 5-6 — Typography & Readability

### 5.1 অতিরিক্ত ছোট ফন্ট সাইজ — ৮০+ জায়গায়, ১৭টা ফাইলে
`text-[8px]`, `text-[9px]`, `text-[10px]` class ৮০ বারেরও বেশি ব্যবহার হয়েছে (MetricCards badge/label, Header notification, Sidebar tooltip, TableView badge, CardView tags, AnalyticsCharts count badge, upload log timestamp ইত্যাদি)। ১১px পর্যন্তও অনেক জায়গায় আছে। এগুলো design-এ "dense enterprise" লুক দেয় ঠিকই, কিন্তু ৯-১০px টেক্সট প্রায় সবার জন্যই কষ্টকর পড়া, বিশেষত badge/label-এর মতো জায়গায় যেখানে actual information (VIP status, tag name, count) থাকে — শুধু decorative হলে সমস্যা কম হতো।
**Fix:** একটা minimum floor ঠিক করুন — কোনো readable/informational text (badge label, count, subtext) `text-[11px]` এর নিচে না নামানো ভালো, একান্তই ছোট দরকার হলে `text-xs` (12px)-কেই default ধরুন।

### 5.2 ভাষা-মিশ্রণ inconsistent
বেশিরভাগ UI ইংরেজিতে, কিন্তু কিছু critical confirmation/toast বাংলায় (যেমন "রেকর্ড ডিলিট করবেন?", "মুছে ফেলা হয়েছে") — কোনো নির্দিষ্ট i18n system ছাড়াই। এটা এলোমেলোভাবে ছড়িয়ে আছে (কোথাও বাংলা, কোথাও একই ধরনের action ইংরেজিতে), যেটা product feel-কে অসামঞ্জস্যপূর্ণ করে তোলে।
**Fix:** হয় পুরো app বাংলা+ইংরেজি dual-language হিসেবে ঠিক করে একটা i18n library (next-intl/next-i18next) দিয়ে ভাষা switch করার option দিন, অথবা একটা consistent single-language policy ঠিক করুন।

---

## 🟢 Priority 7 — Animation & Brand Moments (Login Page)

### 7.1 "Red Pill / Blue Pill" gimmick — মজার কিন্তু কিছু risk আছে
`MorpheusPillChoice.tsx` — প্রতিবার login করার আগে ব্যবহারকারীকে একটা pill বাছাই করতে হয়, আর "Blue Pill" চাপলে screen জুড়ে rapid সাদা/cyan/red color flash হওয়া একটা "explosion" animation চলে। এটা ব্র্যান্ডিং-এর জন্য fun, কিন্তু দুইটা concern:
- **Photosensitivity:** দ্রুত পরপর high-contrast full-screen color flash হওয়া photosensitive epilepsy trigger হতে পারার একটা known risk-ক্যাটেগরি। Duration/flash-count আরেকবার যাচাই করা ভালো (৩টার বেশি flash per second না হওয়া উচিত)।
- **Efficiency/Access:** প্রতিবার login করার আগে এই gimmick-টা mandatory — কোনো "skip" বা direct-login link নেই, তাই repeat/keyboard user-দের জন্য এটা প্রতিবার একটা বাড়তি ধাপ।
**Fix:** একটা ছোট "Skip intro" লিংক রাখুন, আর reduced-motion on থাকলে এই animation static/muted করে দিন।

---

## ✅ যা ইতিমধ্যে ভালোভাবে করা হয়েছে (রাখা উচিত)

- 6-theme + dark/light system CSS variable দিয়ে খুব পরিষ্কারভাবে গঠিত — maintain করা সহজ।
- Search input-এ debounce (350ms) সঠিকভাবে করা আছে (SearchBar ও FilterToolbar দুই জায়গাতেই)।
- Loading skeleton (MetricCards, TableView, CardView) সব জায়গায় consistent ভাবে আছে।
- একক রেকর্ড ডিলিটের confirmation modal ভালোভাবে বানানো — icon, red-accent styling, loading state, বাংলা ভাষা মেলানো।
- খালি অবস্থার (empty state) message + call-to-action সবখানে চিন্তা করে বসানো (no dataset / no matching records)।
- Upload flow-এর live progress telemetry (stage checklist, speed, ETA, terminal log) — এটা প্রায় stand-out feature, খুব ভালো feedback design।
- Sidebar collapse state persist করা হয় (localStorage), active-item indicator smooth spring animation দিয়ে করা।

---

## Suggested পরবর্তী পদক্ষেপ (যদি ধাপে ধাপে করতে চান)

1. **এখনই ঠিক করুন (high impact, low effort):** delete-all-records-এর জন্য custom modal ব্যবহার করা, icon বাটনগুলোতে aria-label যোগ করা, Ctrl+J shortcut বদলানো।
2. **পরের sprint:** sub-12px text গুলো audit করে readable floor বসানো, emoji-গুলো lucide icon দিয়ে replace করা, sortable table header keyboard-accessible করা।
3. **বড় refactor হিসেবে:** reduced-motion support যোগ করা (shared hook), FilterDrawerMobile হয় wire করা বা সরিয়ে ফেলা, bulk-select feature সম্পূর্ণ করা বা সরিয়ে ফেলা, i18n সিদ্ধান্ত নেওয়া।

---

*Audit method: sandboxed device bridge দিয়ে project file সরাসরি পড়া (স্ট্যাটিক code review) + codebase-wide pattern grep (font-size class, aria-label, emoji, window.confirm, prefers-reduced-motion)। Live browser/visual QA (running app screenshot) করা হয়নি — dev server চালু করে দেখা হয়নি, তাই runtime-only ইস্যু (যেমন actual contrast ratio measurement, real device touch-target সাইজ) এই রিপোর্টে conservative রাখা হয়েছে code থেকে যা যাচাইযোগ্য তার উপর ভিত্তি করে।*
