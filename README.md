# CalMaker

CalMaker is a modern, responsive web application built with Vue 3 and TypeScript that allows you to manage personal events and export them as standard iCalendar (.ics) files. It features a clean Material Design interface and works seamlessly across desktop and mobile devices.

## Features

- **Interactive Calendar Views**: Switch between Month, Week, and Day views to visualize your schedule.
- **Event Management**: Easily add, edit, and delete events.
- **Recurring Events**: Create events that repeat daily, weekly, monthly, or yearly with custom settings (e.g., specific days of the week).
- **ICS Export**:
  - **Export All**: Download your entire schedule as a single `.ics` file.
  - **Export Selected**: Select specific days or events to export.
  - **Batch Export (ZIP)**: Download individual `.ics` files for selected events bundled in a ZIP archive.
- **Responsive Design**: Mobile-friendly interface with touch support (swipe to navigate between dates).
- **Persistent Storage**: Your events are saved locally in your browser.

## Tech Stack

- **Framework**: [Vue.js 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Components**: [Material Web](https://github.com/material-components/material-web)
- **Utilities**: `jszip` for client-side ZIP generation.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MacroXie04/calmaker.git
   cd calmaker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or similar).

### Production Build

To build the application for production:

```bash
npm run build
```

This will generate the compiled assets in the `dist/` directory. You can preview the build locally using:

```bash
npm run preview
```

## Usage

1. **Adding Events**: Click on a date in the calendar or the "Add" button to create a new event.
2. **Recurring Events**: In the event form, select a recurrence frequency (Daily, Weekly, etc.) to repeat the event.
3. **Exporting**:
   - Select events by clicking on dates or using the selection checkboxes in the list view.
   - Click the "Export" button to choose your export format (Single ICS or ZIP).
4. **Navigation**: Use the arrow buttons or swipe left/right on touch devices to change the date range.
