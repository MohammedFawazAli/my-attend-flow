import { Link, useLocation } from 'react-router-dom';
import { Home, Upload, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/upload', icon: Upload, label: 'Upload' },
  { path: '/timetable', icon: Calendar, label: 'Timetable' },
  { path: '/subjects', icon: BookOpen, label: 'Subjects' },
  { path: '/attendance', icon: CheckCircle, label: 'Attendance' },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary-light"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}