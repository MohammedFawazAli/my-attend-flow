import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Calendar, Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTimetable, getAttendanceRecords, saveAttendanceRecords, getSubjects } from '@/lib/storage';
import { TimetableEntry, AttendanceRecord, Subject } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

interface ClassWithStatus extends TimetableEntry {
  status: 'present' | 'absent' | null;
  attendanceId?: string;
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayClasses, setTodayClasses] = useState<ClassWithStatus[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = () => {
    const timetable = getTimetable();
    const attendanceRecords = getAttendanceRecords();
    const storedSubjects = getSubjects();
    
    setSubjects(storedSubjects);

    // Get day name from selected date
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Get classes for the selected day
    const dayClasses = timetable.filter(entry => 
      entry.day.toLowerCase() === dayName.toLowerCase()
    );

    // Add attendance status to each class
    const classesWithStatus: ClassWithStatus[] = dayClasses.map(cls => {
      const existingRecord = attendanceRecords.find(record => 
        record.date === selectedDate && record.timetableEntryId === cls.id
      );

      return {
        ...cls,
        status: existingRecord?.status || null,
        attendanceId: existingRecord?.id,
      };
    }).sort((a, b) => a.time.localeCompare(b.time));

    setTodayClasses(classesWithStatus);
  };

  const markAttendance = (classItem: ClassWithStatus, status: 'present' | 'absent') => {
    const attendanceRecords = getAttendanceRecords();
    const subject = subjects.find(s => s.name === classItem.subject);
    
    if (!subject) {
      toast({
        title: "Error",
        description: "Subject not found",
        variant: "destructive",
      });
      return;
    }

    let updatedRecords = [...attendanceRecords];

    if (classItem.attendanceId) {
      // Update existing record
      updatedRecords = updatedRecords.map(record => 
        record.id === classItem.attendanceId 
          ? { ...record, status }
          : record
      );
    } else {
      // Create new record
      const newRecord: AttendanceRecord = {
        id: `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subjectId: subject.id,
        date: selectedDate,
        status,
        timetableEntryId: classItem.id,
      };
      updatedRecords.push(newRecord);
    }

    saveAttendanceRecords(updatedRecords);
    loadAttendanceData();

    toast({
      title: `Marked ${status}`,
      description: `${classItem.subject} - ${classItem.time}`,
    });
  };

  const getSubjectColor = (subject: string) => {
    const subjectData = subjects.find(s => s.name === subject);
    return subjectData ? `subject-color-${(subjectData.colorIndex % 8) + 1}` : 'subject-color-1';
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isPastDate = new Date(selectedDate) < new Date(new Date().toISOString().split('T')[0]);

  if (todayClasses.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
            <p className="text-muted-foreground">Track your daily attendance</p>
          </div>

          {/* Date Selector */}
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 bg-transparent border border-border rounded-md px-3 py-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="text-center py-8">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Classes Today</h2>
              <p className="text-muted-foreground">
                No classes scheduled for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
          <p className="text-muted-foreground">
            {isToday ? 'Today\'s Classes' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Date Selector */}
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border border-border rounded-md px-3 py-2"
              />
              <Badge variant={isToday ? "default" : "outline"}>
                {isToday ? 'Today' : isPastDate ? 'Past' : 'Future'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Classes List */}
        <div className="space-y-4">
          {todayClasses.map((classItem, index) => (
            <Card key={classItem.id} className="stat-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getSubjectColor(classItem.subject)}`} />
                    <div>
                      <CardTitle className="text-base">{classItem.subject}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {classItem.time}
                        </div>
                        {classItem.room && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {classItem.room}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {classItem.status && (
                    <Badge 
                      variant={classItem.status === 'present' ? 'default' : 'destructive'}
                      className={classItem.status === 'present' ? 'bg-success' : ''}
                    >
                      {classItem.status === 'present' ? 'Present' : 'Absent'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {classItem.instructor && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <User className="h-4 w-4" />
                    {classItem.instructor}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => markAttendance(classItem, 'present')}
                    className={`flex-1 ${
                      classItem.status === 'present' 
                        ? 'bg-success hover:bg-success/90' 
                        : 'bg-success/10 hover:bg-success text-success hover:text-success-foreground'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Present
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(classItem, 'absent')}
                    variant={classItem.status === 'absent' ? 'destructive' : 'outline'}
                    className={`flex-1 ${
                      classItem.status === 'absent' 
                        ? '' 
                        : 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Absent
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Day Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-success">
                  {todayClasses.filter(c => c.status === 'present').length}
                </div>
                <div className="text-muted-foreground">Present</div>
              </div>
              <div>
                <div className="text-lg font-bold text-destructive">
                  {todayClasses.filter(c => c.status === 'absent').length}
                </div>
                <div className="text-muted-foreground">Absent</div>
              </div>
              <div>
                <div className="text-lg font-bold text-muted-foreground">
                  {todayClasses.filter(c => c.status === null).length}
                </div>
                <div className="text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}