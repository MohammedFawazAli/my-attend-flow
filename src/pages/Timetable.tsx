import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTimetable } from '@/lib/storage';
import { TimetableEntry } from '@/types/attendance';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function Timetable() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');

  useEffect(() => {
    const data = getTimetable();
    setTimetable(data);
    
    // Set current day as default
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    setSelectedDay(today);
  }, []);

  const getSubjectColor = (subject: string) => {
    const hash = subject.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `subject-color-${(Math.abs(hash) % 8) + 1}`;
  };

  const getEntryForDayTime = (day: string, time: string) => {
    return timetable.find(entry => 
      entry.day.toLowerCase() === day.toLowerCase() && 
      entry.time === time
    );
  };

  const getDayClasses = (day: string) => {
    return timetable
      .filter(entry => entry.day.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  if (timetable.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-md mx-auto text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Timetable Found</h2>
          <p className="text-muted-foreground mb-6">
            Upload your timetable to view your weekly schedule
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
          <p className="text-muted-foreground">Your weekly class schedule</p>
        </div>

        {/* Day Selection */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {DAYS.map(day => {
            const dayClasses = getDayClasses(day);
            const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
            const isSelected = selectedDay === day;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <div>{day.slice(0, 3)}</div>
                {isToday && <div className="w-2 h-2 bg-primary rounded-full mx-auto mt-1" />}
                <div className="text-xs">{dayClasses.length} classes</div>
              </button>
            );
          })}
        </div>

        {/* Selected Day View */}
        {selectedDay && (
          <Card className="stat-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                {selectedDay}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getDayClasses(selectedDay).map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg ${getSubjectColor(entry.subject)} relative overflow-hidden`}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{entry.subject}</h3>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        <Clock className="h-3 w-3 mr-1" />
                        {entry.time}
                      </Badge>
                    </div>
                    {entry.room && (
                      <div className="flex items-center text-white/90 text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {entry.room}
                      </div>
                    )}
                    {entry.instructor && (
                      <div className="text-white/80 text-sm mt-1">
                        Instructor: {entry.instructor}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                </div>
              ))}
              
              {getDayClasses(selectedDay).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No classes scheduled for {selectedDay}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Grid View */}
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 gap-1 min-w-[500px]">
                {/* Header */}
                <div className="p-2 text-xs font-medium text-center bg-muted rounded">Time</div>
                {DAYS.slice(0, 5).map(day => (
                  <div key={day} className="p-2 text-xs font-medium text-center bg-muted rounded">
                    {day.slice(0, 3)}
                  </div>
                ))}
                
                {/* Time slots */}
                {TIME_SLOTS.map(time => (
                  <div key={time} className="contents">
                    <div className="p-2 text-xs text-center text-muted-foreground bg-muted/50 rounded">
                      {time}
                    </div>
                    {DAYS.slice(0, 5).map(day => {
                      const entry = getEntryForDayTime(day, time);
                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`timetable-cell text-xs ${
                            entry 
                              ? `${getSubjectColor(entry.subject)} text-white` 
                              : 'bg-muted/30'
                          }`}
                        >
                          {entry ? (
                            <div className="text-center">
                              <div className="font-medium">{entry.subject}</div>
                              {entry.room && (
                                <div className="text-xs opacity-80">{entry.room}</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}