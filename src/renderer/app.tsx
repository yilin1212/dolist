import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/error-boundary'
import MainLayout from './layouts/MainLayout'
import InboxPage from './features/tasks/pages/InboxPage'
import TodayPage from './features/tasks/pages/TodayPage'
import PomodoroMini from './features/pomodoro/PomodoroMini'
import { I18nProvider } from './i18n'
// Eagerly load schedule store so its tasks:changed listener is wired before any
// mutation, even if the user never visits a schedule view.
import './features/schedule/store'

const CalendarView = lazy(() => import('./features/calendar/CalendarView'))
const UpcomingView = lazy(() => import('./features/upcoming/UpcomingView'))
const KanbanBoard = lazy(() => import('./features/kanban/KanbanBoard'))
const TimelineView = lazy(() => import('./features/timeline/TimelineView'))
const MatrixView = lazy(() => import('./features/matrix/MatrixView'))
const ProjectReport = lazy(() => import('./features/project-report/ProjectReport'))
const PomodoroPanel = lazy(() => import('./features/pomodoro/PomodoroPanel'))
const TagManager = lazy(() => import('./features/tags/TagManager'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-neutral-500">Loading…</div>}>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route path="/mini" element={<ErrorBoundary><PomodoroMini /></ErrorBoundary>} />
          <Route path="/" element={<ErrorBoundary><MainLayout /></ErrorBoundary>}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<ErrorBoundary><InboxPage /></ErrorBoundary>} />
            <Route path="today" element={<ErrorBoundary><TodayPage /></ErrorBoundary>} />
            <Route path="upcoming" element={<ErrorBoundary><LazyPage><UpcomingView /></LazyPage></ErrorBoundary>} />
            <Route path="calendar" element={<ErrorBoundary><LazyPage><CalendarView /></LazyPage></ErrorBoundary>} />
            <Route path="kanban" element={<ErrorBoundary><LazyPage><KanbanBoard /></LazyPage></ErrorBoundary>} />
            <Route path="timeline" element={<ErrorBoundary><LazyPage><TimelineView /></LazyPage></ErrorBoundary>} />
            <Route path="matrix" element={<ErrorBoundary><LazyPage><MatrixView /></LazyPage></ErrorBoundary>} />
            <Route path="report" element={<ErrorBoundary><LazyPage><ProjectReport /></LazyPage></ErrorBoundary>} />
            <Route path="pomodoro" element={<ErrorBoundary><LazyPage><PomodoroPanel /></LazyPage></ErrorBoundary>} />
            <Route path="tags" element={<ErrorBoundary><LazyPage><TagManager /></LazyPage></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><LazyPage><SettingsPage /></LazyPage></ErrorBoundary>} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}
