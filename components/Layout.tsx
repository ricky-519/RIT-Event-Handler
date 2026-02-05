import React from 'react';
import { LayoutDashboard, QrCode, MessageSquare, LogOut, Ticket, Users, Clock } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  switchUser: () => void;
  onProfileClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, switchUser, onProfileClick }) => {
  const navItems = [
    { id: 'events', label: 'Events Feed', icon: <LayoutDashboard size={20} />, roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.CLUB_ADMIN] },
    { id: 'schedule', label: 'Schedule', icon: <Clock size={20} />, roles: [UserRole.STUDENT, UserRole.TEACHER] },
    { id: 'registrations', label: 'My Registrations', icon: <Ticket size={20} />, roles: [UserRole.STUDENT] },
    { id: 'attendance', label: 'Attendance & OD', icon: <QrCode size={20} />, roles: [UserRole.STUDENT, UserRole.TEACHER] },
    { id: 'club-dashboard', label: 'Club Dashboard', icon: <Users size={20} />, roles: [UserRole.CLUB_ADMIN] },
    { id: 'forum', label: 'Community Forum', icon: <MessageSquare size={20} />, roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.CLUB_ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <span className="text-xl font-bold text-gray-800">RIT Event<span className="text-indigo-600">Handler</span></span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div 
            onClick={onProfileClick}
            className="flex items-center p-3 bg-gray-50 rounded-lg mb-3 cursor-pointer hover:bg-gray-100 transition-colors group"
          >
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-400 transition-all" />
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={switchUser}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            <span>Switch Role</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav (Visible only on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center space-y-1 ${
                activeTab === item.id ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
          <button 
            onClick={onProfileClick}
            className="flex flex-col items-center space-y-1 text-gray-500"
          >
             <img src={currentUser.avatar} className="w-5 h-5 rounded-full" />
             <span className="text-xs">Profile</span>
          </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-40">
           <span className="text-lg font-bold text-gray-800">RIT EventHandler</span>
           <button onClick={switchUser} className="text-sm text-indigo-600 font-medium">Switch</button>
        </header>
        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};