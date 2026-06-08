import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Users,
  CheckSquare,
  Award,
  BookOpen,
  DollarSign,
  FileText,
  GraduationCap,
  Menu,
  LogOut,
  X,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { getCurrentUser, logout } from "@/lib/auth";
import { useDB, actions } from "@/lib/store";

export function AppShell({
  title,
  children,
  back,
  action,
  leftAction,
  hideNav,
  showSignOut,
}: {
  title: string;
  children: ReactNode;
  back?: string;
  action?: ReactNode;
  leftAction?: ReactNode;
  hideNav?: boolean;
  showSignOut?: boolean;
}) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const user = getCurrentUser();
  const db = useDB();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Filter notifications for the current user
  const userNotifications = db.notifications
    .filter((n) => n.recipientId === user?.id || n.recipientId === "all" || (user?.role === "super_admin" && n.recipientId === "super_admin"))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  function onSignOut() {
    logout();
    nav({ to: "/auth", replace: true }).then(() => {
      window.location.reload(); // Hard reload to clear Router cache and route context
    });
  }

  // Define tab navigation based on roles
  const superAdminTabs = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/students", label: "Students", icon: Users },
    { to: "/classes", label: "Classes", icon: BookOpen },
    { to: "/lecturers", label: "Teachers", icon: Users },
    { to: "/fees", label: "Fees", icon: DollarSign },
  ];

  const teacherTabs = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/attendance", label: "Attendance", icon: CheckSquare },
    { to: "/marks", label: "Marks", icon: Award },
    { to: "/documents", label: "Docs", icon: BookOpen },
  ];

  const studentTabs = [
    { to: "/", label: "Home", icon: Home },
    { to: "/attendance", label: "Attendance", icon: CheckSquare },
    { to: "/marks", label: "Marks", icon: Award },
    { to: "/documents", label: "Docs", icon: BookOpen },
    { to: "/fees", label: "Fees", icon: DollarSign },
  ];

  const tabs =
    user?.role === "super_admin"
      ? superAdminTabs
      : user?.role === "teacher"
      ? teacherTabs
      : studentTabs;

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col mx-auto w-full relative">
      {/* App Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#e5e7eb] px-4 py-3 flex items-center gap-3">
        {leftAction}
        {back ? (
          <Link to={back} className="-ml-1 p-1 rounded-md hover:bg-gray-50 text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
        ) : null}
        <h1 className="text-base font-bold tracking-tight flex-1 md:flex-none md:w-64 truncate text-[#111827]">
          {title}
        </h1>

        {/* Desktop Navigation */}
        {!hideNav && (
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                    active ? "text-[#2563eb]" : "text-gray-500 hover:text-[#111827]"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center justify-end gap-3 md:w-64">
          {action}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-gray-50 text-gray-700 transition"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}
          {(showSignOut || user) && (
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-red-50 text-red-500 transition ml-1"
              title="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* Notifications Slide-over Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end">
          <div className="absolute inset-0" onClick={() => setShowNotifications(false)} />
          <div className="bg-white w-full max-w-sm h-full flex flex-col relative z-50 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
              <h3 className="font-bold text-base text-[#111827] flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-[#2563eb]" />
                Notifications
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f9fafb]">
              {userNotifications.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  You have no notifications yet.
                </div>
              ) : (
                userNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read) actions.markNotificationRead(notif.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      notif.read ? "bg-white border-[#e5e7eb] opacity-75" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-xs font-bold ${notif.read ? "text-gray-700" : "text-[#2563eb]"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            {unreadCount > 0 && (
              <div className="p-4 bg-white border-t border-[#e5e7eb]">
                <button
                  onClick={() => user && actions.markAllNotificationsRead(user)}
                  className="w-full py-2.5 text-sm font-bold text-[#2563eb] bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 ${hideNav ? "pb-6" : "pb-24 md:pb-8"}`}>
        {children}
      </main>

      {/* More Menu sliding bottom drawer for Teacher */}
      {user?.role === "teacher" && showMoreMenu && (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs flex items-end justify-center px-4 pb-4">
          {/* Transparent click area to close */}
          <div className="absolute inset-0" onClick={() => setShowMoreMenu(false)} />

          <div className="bg-white w-full max-w-[440px] rounded-xl p-5 border border-[#e5e7eb] relative z-50 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h4 className="font-bold text-sm text-[#111827]">More Options</h4>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                to="/documents"
                onClick={() => setShowMoreMenu(false)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-100 hover:border-blue-200 rounded-xl font-bold transition text-center"
              >
                <BookOpen className="h-5 w-5 text-[#2563eb]" />
                <span>Study Materials</span>
              </Link>
              <Link
                to="/fees"
                onClick={() => setShowMoreMenu(false)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-100 hover:border-blue-200 rounded-xl font-bold transition text-center"
              >
                <DollarSign className="h-5 w-5 text-[#2563eb]" />
                <span>Fees Ledger</span>
              </Link>
              <Link
                to="/reports"
                onClick={() => setShowMoreMenu(false)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-100 hover:border-blue-200 rounded-xl font-bold transition text-center"
              >
                <FileText className="h-5 w-5 text-[#2563eb]" />
                <span>Reports & Excel</span>
              </Link>
              <Link
                to="/classes"
                onClick={() => setShowMoreMenu(false)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-100 hover:border-blue-200 rounded-xl font-bold transition text-center"
              >
                <GraduationCap className="h-5 w-5 text-[#2563eb]" />
                <span>Classes & Subjects</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation Bar (Mobile Only) */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#e5e7eb] px-4 py-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <ul className={`grid ${user?.role === "teacher" ? "grid-cols-5" : "grid-cols-5"}`}>
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className={`flex flex-col items-center gap-1.5 py-1.5 text-[10px] font-bold transition-colors ${
                      active ? "text-[#2563eb]" : "text-gray-500 hover:text-[#111827]"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                    {t.label}
                  </Link>
                </li>
              );
            })}

            {/* If Teacher, render the "More" tab to open the slide drawer */}
            {user?.role === "teacher" && (
              <li>
                <button
                  onClick={() => setShowMoreMenu(true)}
                  className={`w-full flex flex-col items-center gap-1.5 py-1.5 text-[10px] font-bold transition-colors ${
                    showMoreMenu ? "text-[#2563eb]" : "text-gray-500 hover:text-[#111827]"
                  }`}
                >
                  <Menu className="h-4.5 w-4.5 stroke-[1.8]" />
                  More
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
