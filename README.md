# UNFOLD

A comprehensive time management system for organizing programs, projects, tasks, and subtasks with visual timetable views.

## Features

- **Hierarchical Organization**: Manage programs, projects, tasks, and subtasks in a structured hierarchy
- **Visual Timetables**: Multiple view modes including:
  - **Day View**: Circular timetable for daily scheduling
  - **Week View**: Weekly calendar layout
  - **Month View**: Monthly calendar overview
  - **Year View**: Coming soon
- **Database Panel**: Visual interface for managing items with drag-and-drop column reordering
- **CLI Interface**: Command-line interface for power users
- **Real-time Updates**: Firebase Firestore integration for real-time data synchronization
- **User Authentication**: Secure authentication with Firebase Auth (Email/Password and Google Sign-In)
- **Theme Support**: Dark and light themes with system preference detection
- **Responsive Design**: Mobile-first design that works across all devices
- **SEO Optimized**: Comprehensive meta tags, Open Graph, and structured data

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: 
  - Styled Components
  - Tailwind CSS v4
  - CSS Variables for theming
- **Backend**: 
  - Firebase Authentication
  - Cloud Firestore
- **UI Components**: 
  - Lucide React (icons)
  - xterm.js (terminal)
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd unfold_demo
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
unfold_demo/
├── app/                   # Next.js app directory
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main application page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── globals.css        # Global styles and CSS variables
│   └── registry.tsx       # Styled Components registry
├── components/            # React components
│   ├── drawers/           # Drawer components (Drawer, AccountDrawer)
│   ├── dialogs/           # Dialog components (Modal, Alert, Confirm)
│   ├── pickers/           # Date/Time picker components
│   ├── timetables/        # Timetable view components
│   ├── terminal/          # Terminal/CLI components
│   └── ui/                # UI components (Clock, etc.)
├── lib/                   # Library code
│   ├── firebase/          # Firebase configuration
│   ├── firestore/         # Firestore operations
│   ├── auth/              # Authentication utilities
│   ├── cli/               # CLI command handlers
│   ├── theme/             # Theme context
│   └── utils/             # Utility functions
└── public/                # Static assets
```

## Key Features Explained

### Hierarchical Data Model

- **Programs**: Top-level containers for organizing related projects
- **Projects**: Collections of tasks within a program
- **Tasks**: Individual work items with timeframes and priorities
- **Subtasks**: Granular breakdown of tasks

### Timetable Views

- **Day View**: Circular 24-hour timetable showing items scheduled throughout the day
- **Week View**: Weekly grid layout with time slots
- **Month View**: Calendar view showing items across the month

### Database Panel

- Visual list interface for managing items
- Drag-and-drop column reordering
- Multi-select for bulk operations
- Hierarchical expansion/collapse
- Real-time search and filtering

### CLI Interface

- Command-line interface for advanced users
- Supports all CRUD operations
- Fuzzy matching for commands
- Command shortcuts and aliases

## Development Notes

- The project uses CSS variables defined in `app/globals.css` for consistent theming
- Styled Components are used for component-level styling
- Tailwind CSS v4 is configured via PostCSS
- Firebase emulators can be used for local development
- The app is optimized for SEO with comprehensive metadata

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design works on all screen sizes

## License

Private project - All rights reserved
