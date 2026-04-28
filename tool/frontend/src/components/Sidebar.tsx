import { NavLink } from 'react-router-dom';
import { FileCode, Users } from 'lucide-react';

import { useAsgardeo } from "@asgardeo/react";


export function Sidebar() {
  const { signOut } = useAsgardeo();

  const navItems = [
    {
      name: 'Template Manager',
      path: '/templates',
      icon: FileCode
    },
    {
      name: 'Receivers',
      path: '/receivers',
      icon: Users
    }
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">RTI</span>
          </div>
          OpenTracker
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 text-sm font-medium rounded border
                transition-colors
                ${isActive ? 'bg-blue-50 text-blue-900 border-blue-200 border-l-4 border-l-blue-900' : 'text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'}
              `}>

              <Icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    </aside>
  );
}