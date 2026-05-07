import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import InboxPage from './features/tasks/pages/InboxPage'
import TodayPage from './features/tasks/pages/TodayPage'
import CalendarView from './features/calendar/CalendarView'
import UpcomingView from './features/upcoming/UpcomingView'
import KanbanBoard from './features/kanban/KanbanBoard'
import TimelineView from './features/timeline/TimelineView'
import MatrixView from './features/matrix/MatrixView'
import ProjectReport from './features/project-report/ProjectReport'
import PomodoroPanel from './features/pomodoro/PomodoroPanel'
import PomodoroMini from './features/pomodoro/PomodoroMini'
import TagManager from './features/tags/TagManager'
import SettingsPage from './features/settings/SettingsPage'
import { I18nProvider } from './i18n'
// Eagerly load schedule store so its tasks:changed listener is wired before any
// mutation, even if the user never visits a schedule view.
import './features/schedule/store'

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route path="/mini" element={<PomodoroMini />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="upcoming" element={<UpcomingView />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="kanban" element={<KanbanBoard />} />
            <Route path="timeline" element={<TimelineView />} />
            <Route path="matrix" element={<MatrixView />} />
            <Route path="report" element={<ProjectReport />} />
            <Route path="pomodoro" element={<PomodoroPanel />} />
            <Route path="tags" element={<TagManager />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}
