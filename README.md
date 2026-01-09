# Testovak 🎓

> A browser extension that automates exam slot searching and registration in the Moodle system at ČZU (Czech University of Life Sciences).

## 🎯 What does the extension do?

Testovak helps students find and register for exams at a convenient time. The extension automatically:

1. **Monitors available slots** — periodically refreshes the page and checks for new time slots
2. **Filters by your criteria** — searches only within the specified date and time range
3. **Auto-registers** — as soon as it finds a suitable slot, it immediately navigates to the registration page

## 📥 Download

Install Testovak from official stores:

- **[Chrome Web Store](https://chromewebstore.google.com/detail/ppniandfcnnmcgoidjoejfhehnncgohj?utm_source=item-share-cb)** - Install for Chrome/Edge/Brave
- **[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/testovak/)** - Install for Firefox

## 🚀 Installation

### Chrome

1. Download or clone the repository
2. Build the extension:
   ```bash
   pnpm install
   pnpm build:chrome
   ```
3. Open `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the `dist-chrome` folder

### Firefox

1. Download or clone the repository
2. Build the extension:
   ```bash
   pnpm install
   pnpm build:firefox
   ```
3. Open `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the `dist-firefox` folder

## 📖 How to use

### Step 1: Open the tests page

Navigate to the Moodle ČZU page where available tests/exams are displayed.

### Step 2: Click "Хочу найти термин!" button

A bright gradient button will appear next to each available test. Click on it.

### Step 3: Configure search parameters

In the modal window, specify:

- **Test** — select an exam from the list
- **Date range** — the range of days when you want to take the exam
- **Time range** — the hours that work for you (e.g., 09:00 - 17:00)

### Step 4: Start the search

Click "Начать!" and the extension will start working:

- The page will automatically refresh every 10 seconds
- You'll see a progress bar and search duration
- As soon as a suitable slot appears — the extension will automatically navigate to registration

### Step 5: Complete registration

When the extension finds a slot, you'll be on the confirmation page. Just click the register button!

## 🏗️ Architecture

```
src/
├── moodle.tsx          # Entry point, injection into Moodle page
├── SetupModal.tsx      # Search configuration modal
├── ProgressModal.tsx   # Search progress modal
├── hooks/
│   └── useExamSearch.ts # React hook with search logic
├── types.ts            # TypeScript types
├── utils.ts            # Moodle page parsing utilities
└── components/ui/      # UI components (Radix UI + Tailwind)
```

### How it works internally

#### 1. Page injection (`moodle.tsx`)

When a Moodle page loads, the extension:

- Parses the DOM and finds all available tests
- Adds "Хочу найти термин!" buttons to each test
- Checks if a search is already running (via Chrome Storage)

#### 2. Search configuration (`SetupModal.tsx`)

The modal window allows you to:

- Select a test from the list of available ones
- Specify a date range via calendar
- Specify a time range via dropdowns
- See already available slots (if any)

#### 3. Search process (`useExamSearch.ts`)

The `useExamSearch` hook manages all the logic:

```typescript
const {
  status, // Current search status
  elapsedTime, // Time since search started
  availableDates, // Found dates
  parsedTimes, // Time slots by date
  actions: {
    cancelSearch, // Cancel the search
    selectTimeSlot, // Manually select a slot
  },
} = useExamSearch();
```

Search algorithm:

1. Loads configuration from Chrome Storage
2. Parses available dates from the page DOM
3. Filters dates within ±2 days of the selected range
4. Loads time slots for each date
5. Searches for an exact match with criteria
6. If found — navigates to the registration page
7. If not — refreshes the page after 10 seconds

#### 4. Page parsing (`utils.ts`)

Utilities for extracting data from Moodle DOM:

- `parseAvailableTests()` — parses the list of tests with dates and links
- `parseAvailableTimes()` — parses time slots on a day's page
- `parseTimesPage()` — fetches and parses a page with time slots

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Development mode (Chrome)
pnpm dev:chrome

# Development mode (Firefox)
pnpm dev:firefox

# Build for all browsers
pnpm build
```

## 📦 Technologies

- **React 18** — UI components
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **Radix UI** — accessible UI primitives
- **Vite** — bundling
- **Chrome Extension Manifest V3** — extension API

## ⚠️ Limitations

- Works only on `moodle.czu.cz`
- Requires Moodle authentication
- Does not guarantee registration (slot may be taken at the moment of navigation)
- The page must remain open during the search

## 📄 License

MIT
