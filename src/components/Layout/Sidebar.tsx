import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Mail, 
  FileText, 
  Upload, 
  Users, 
  Shield,
  Database
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { name: 'Auto Mail Reports', href: '/auto-mail', icon: Mail, roles: ['admin', 'user'] },
    { name: 'Instant Reports', href: '/instant-reports', icon: FileText, roles: ['admin', 'user'] },
    { name: 'Master Upload', href: '/master-upload', icon: Upload, roles: ['admin', 'user'] },
    { name: 'User Management', href: '/users', icon: Users, roles: ['admin'] },
    { name: 'Access Control', href: '/access-control', icon: Shield, roles: ['admin'] },
    { name: 'Activity Log', href: '/database', icon: Database, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  return (
    <div className="bg-gray-900 text-white w-full h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-6">Navigation</h2>
        
        <nav className="space-y-2">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;