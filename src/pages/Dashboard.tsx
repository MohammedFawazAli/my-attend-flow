import { useEffect, useState } from 'react';
import { Clock, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getTimetable, getSubjects, calculateAttendanceStats, getSubjectAttendance } from '@/lib/storage';
import { Subject, DailySchedule } from '@/types/attendance';

export default function Dashboard() {
  const [todaySchedule, setTodaySchedule] = useState<DailySchedule | null>(null);
  const [nextClass, setNextClass] = useState<any>(null);
  const [overallStats, setOverallStats] = useState(calculateAttendanceStats());
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const timetable = getTimetable();
    const storedSubjects = getSubjects();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get today's classes
    const todayClasses = timetable.filter(entry => 
      entry.day.toLowerCase() === today.toLowerCase()
    );

    if (todayClasses.length > 0) {
      const schedule: DailySchedule = {
        date: new Date().toISOString().split('T')[0],
        classes: todayClasses.map(entry => ({
          id: entry.id,
          subject: entry.subject,
          time: entry.time,
          room: entry.room,
          instructor: entry.instructor,
          timetableEntryId: entry.id,
        })).sort((a, b) => a.time.localeCompare(b.time)),
      };
      setTodaySchedule(schedule);

      // Find next class
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const nextClass = schedule.classes.find(cls => cls.time > currentTime);
      setNextClass(nextClass);
    }

    // Update subjects with attendance data
    const updatedSubjects = storedSubjects.map(subject => {
      const stats = getSubjectAttendance(subject.id);
      return {
        ...subject,
        totalClasses: stats.totalClasses,
        attendedClasses: stats.attendedClasses,
        attendancePercentage: stats.attendancePercentage,
      };
    });

    setSubjects(updatedSubjects);
    setOverallStats(calculateAttendanceStats());
  };

  const getSubjectColor = (index: number) => `subject-color-${(index % 8) + 1}`;

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">AttendFlow</h1>
          <p className="text-muted-foreground">Track your attendance smartly</p>
        </div>

        {/* Overall Stats */}
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overall Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-semibold">{overallStats.attendancePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={overallStats.attendancePercentage} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-success">{overallStats.attendedClasses}</div>
                <div className="text-muted-foreground">Attended</div>
              </div>
              <div>
                <div className="text-lg font-bold text-destructive">{overallStats.missedClasses}</div>
                <div className="text-muted-foreground">Missed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{overallStats.totalClasses}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Class */}
        {nextClass && (
          <Card className="stat-card border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                Next Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{nextClass.subject}</span>
                  <Badge variant="outline" className="text-primary border-primary">
                    {nextClass.time}
                  </Badge>
                </div>
                {nextClass.room && (
                  <p className="text-sm text-muted-foreground">Room: {nextClass.room}</p>
                )}
                {nextClass.instructor && (
                  <p className="text-sm text-muted-foreground">Instructor: {nextClass.instructor}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Schedule */}
        {todaySchedule && todaySchedule.classes.length > 0 ? (
          <Card className="stat-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                Today's Classes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySchedule.classes.map((cls, index) => (
                <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getSubjectColor(index)}`} />
                    <div>
                      <div className="font-medium">{cls.subject}</div>
                      <div className="text-sm text-muted-foreground">{cls.time}</div>
                    </div>
                  </div>
                  {cls.room && (
                    <Badge variant="secondary" className="text-xs">
                      {cls.room}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="stat-card">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No classes scheduled for today</p>
            </CardContent>
          </Card>
        )}

        {/* Subject Quick View */}
        {subjects.length > 0 && (
          <Card className="stat-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subject Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjects.slice(0, 3).map((subject, index) => (
                <div key={subject.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getSubjectColor(subject.colorIndex)}`} />
                    <span className="font-medium text-sm">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${
                      subject.attendancePercentage >= 75 ? 'text-success' :
                      subject.attendancePercentage >= 60 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {subject.attendancePercentage.toFixed(0)}%
                    </span>
                    {subject.attendancePercentage < 75 && (
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}