import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import TaskList from './features/tasks/components/TaskList'
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

export default function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route path="/mini" element={<PomodoroMini />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<TaskList title="收件箱" subtitle="所有未分类的任务" listFilter="inbox" />} />
            <Route path="today" element={<TaskList title="今天" subtitle="今天的任务" listFilter="today" />} />
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
