# 📊 Morpheus — Enterprise Data Management & Intelligence OS

A high-performance, full-stack **Data Management, Intelligent Search & Analytics Dashboard** built with **Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB (Mongoose), and Framer Motion**.

---

## 🌟 Key Features

- ⚡ **Full CSV/Excel Processing**: Upload large business datasets with multi-stage client and server-side validation and column normalization.
- 🧠 **Smart Upsert & Incremental Field Merging**: Deduplicates existing users by phone number / email and fills in missing fields (e.g. email, avatar, nickname, location) without deleting or duplicating existing records.
- 🔍 **Universal Smart Omnisearch**: Instant real-time search across names, nicknames, phone numbers (with or without `88` country prefix), emails, and locations.
- 🎛️ **Advanced Multi-Criteria Filtering Studio**:
  - Operator prefix targeting (`88017 GP`, `88018 Robi`, `88019 BL`, `88015 Teletalk`, etc. + custom prefix)
  - Gender & Avatar photo filters (`With Photo` / `No Photo`)
  - Age range selectors (`Min – Max`)
  - Active days filter (`≤ 3d`, `≤ 7d`, `≤ 30d`, `≤ 60d`, + custom days input)
  - Last online date range picker
  - Individual search target toggles (`Name`, `Number`, `Gender`, `Age`, `Last Online`, `Avatar`)
- 🖼️ **Real Profile Image Rendering**: High-performance photo loader with initial avatars fallback and safe referrer policy.
- 👁️ **Card View & Table View**: Switch between interactive visual cards and high-density data tables.
- 📑 **Slide-Over Detail Drawer**: Root portaled slide-over profile drawer with high-resolution photo viewer and 1-click phone copying.
- 📥 **Filtered CSV Exporting**: Export filtered datasets with live record counters and download audit history.
- 📱 **100% Responsive Architecture**: Optimized for Mobile, Tablet, Laptop, and 4K Desktop screens with collapsible icon-only sidebar.
- 🌓 **Dark & Light Mode**: Seamless theme switching with dark mode glassmorphism.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Data Parsing**: [PapaParse](https://www.papaparse.com/) & [SheetJS (xlsx)](https://sheetjs.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EasinArafatDeveloper/next-leaders-data-filtering.git
   cd next-leaders-data-filtering
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── public/                 # Static assets (Logo, icons)
├── src/
│   ├── app/                # Next.js 14 App Router routes & API endpoints
│   │   ├── api/            # Backend REST endpoints (/data, /export, /upload, etc.)
│   │   ├── dashboard/      # Overview & analytics page
│   │   ├── data/           # Explorer & file upload pages
│   │   ├── saved-filters/  # Filter presets page
│   │   ├── downloads/      # Export history page
│   │   ├── activity/       # Audit log page
│   │   └── settings/       # System preferences page
│   ├── components/         # Reusable React components
│   │   ├── layout/         # Header, Sidebar, AppShell, UserProfile
│   │   ├── explorer/       # FilterToolbar, CardView, TableView, DetailDrawer
│   │   ├── upload/         # DropZone, UploadProgress, SummaryModal
│   │   └── dashboard/      # MetricCards, DemographicsCharts
│   ├── lib/                # MongoDB connection & Mongoose models
│   └── types/              # TypeScript interface declarations
└── package.json
```

---

## 📄 License
MIT &copy; 2026 Easin Arafat.
