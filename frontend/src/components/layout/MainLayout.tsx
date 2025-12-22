import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../NewCaseModal"

export function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-muted/10 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full min-w-0 transition-all duration-300 ease-in-out relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="mx-auto max-w-[1600px] h-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
      <NewCaseModal />
    </div>
  )
}