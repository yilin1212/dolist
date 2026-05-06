import { Outlet } from 'react-router-dom'
import Sidebar from '../features/navigation/Sidebar'
import WindowControls from './WindowControls'

export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 font-sans text-neutral-900">
      {/* Custom title bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-8 items-center justify-between bg-neutral-50 pl-48" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-xs text-neutral-500">DoList</span>
        <WindowControls />
      </div>

      {/* Sidebar */}
      <aside className="mt-8 w-56 flex-shrink-0 border-r border-neutral-200 bg-neutral-50">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="mt-8 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
