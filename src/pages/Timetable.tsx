import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Edit3, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getTimetable, saveTimetable } from '@/lib/storage';
import { TimetableEntry } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function Timetable() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const data = getTimetable();
    setTimetable(data);
    
    // Set current day as default
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    setSelectedDay(today);
  }, []);

  const loadTimetable = () => {
    const data = getTimetable();
    setTimetable(data);
  };

  const getSubjectColor = (subject: string) => {
    const hash = subject.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = [
      'bg-blue-100 border border-blue-200',
      'bg-green-100 border border-green-200',
      'bg-yellow-100 border border-yellow-200',
      'bg-purple-100 border border-purple-200',
      'bg-pink-100 border border-pink-200',
      'bg-indigo-100 border border-indigo-200',
      'bg-orange-100 border border-orange-200',
      'bg-teal-100 border border-teal-200'
    ];
    return colors[Math.abs(hash) % colors.length];
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

  const editEntry = (entry: TimetableEntry) => {
    setEditingEntry({ ...entry });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (editingEntry) {
      const updatedTimetable = timetable.map(entry => 
        entry.id === editingEntry.id ? editingEntry : entry
      );
      
      setTimetable(updatedTimetable);
      saveTimetable(updatedTimetable);
      setEditingEntry(null);
      setIsEditing(false);
      
      toast({
        title: "Entry updated successfully!",
        description: `${editingEntry.subject} has been updated.`,
      });
    }
  };

  const deleteEntry = (entryId: string) => {
    const updatedTimetable = timetable.filter(entry => entry.id !== entryId);
    setTimetable(updatedTimetable);
    saveTimetable(updatedTimetable);
    
    toast({
      title: "Entry deleted",
      description: "Timetable entry has been removed.",
    });
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
                <Badge variant="outline" className="ml-auto">
                  {getDayClasses(selectedDay).length} classes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getDayClasses(selectedDay).map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg ${getSubjectColor(entry.subject)} relative overflow-hidden group`}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{entry.subject}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-background/80 text-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {entry.time}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editEntry(entry)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {entry.room && (
                      <div className="flex items-center text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {entry.room}
                      </div>
                    )}
                    {entry.instructor && (
                      <div className="text-muted-foreground text-sm mt-1">
                        Instructor: {entry.instructor}
                      </div>
                    )}
                  </div>
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
            <CardTitle className="flex items-center justify-between text-base">
              Weekly Overview
              <Badge variant="outline">{timetable.length} total classes</Badge>
            </CardTitle>
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
                    <div className="p-2 text-xs text-center text-muted-foreground bg-muted/50 rounded" >
                      {time}
                    </div>
                    {DAYS.slice(0, 5).map(day => {
                      const entry = getEntryForDayTime(day, time);
                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`timetable-cell text-xs group relative p-1 rounded ${
                            entry 
                              ? `${getSubjectColor(entry.subject)}` 
                              : 'bg-muted/30'
                          }`}
                          onClick={() => entry && editEntry(entry)}
                        >
                          {entry ? (
                            <>
                              <div className="text-center">
                                <div className="font-medium text-foreground">{entry.subject}</div>
                                {entry.room && (
                                  <div className="text-xs text-muted-foreground">{entry.room}</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editEntry(entry);
                                }}
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 p-0"
                              >
                                <Edit3 className="h-2 w-2" />
                              </Button>
                            </>
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

        {/* Statistics Card */}
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timetable Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-primary">{new Set(timetable.map(e => e.subject)).size}</div>
                <div className="text-muted-foreground">Unique Subjects</div>
              </div>
              <div>
                <div className="text-lg font-bold text-primary">{timetable.length}</div>
                <div className="text-muted-foreground">Total Classes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Timetable Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editSubject">Subject Name</Label>
                <Input
                  id="editSubject"
                  value={editingEntry.subject}
                  onChange={(e) => setEditingEntry({...editingEntry, subject: e.target.value})}
                  placeholder="Enter subject name"
                />
              </div>
              <div>
                <Label htmlFor="editRoom">Room (Optional)</Label>
                <Input
                  id="editRoom"
                  value={editingEntry.room || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, room: e.target.value})}
                  placeholder="Enter room number"
                />
              </div>
              <div>
                <Label htmlFor="editTime">Time</Label>
                <Input
                  id="editTime"
                  value={editingEntry.time}
                  onChange={(e) => setEditingEntry({...editingEntry, time: e.target.value})}
                  placeholder="Enter time (e.g., 09:00)"
                />
              </div>
              <div>
                <Label htmlFor="editDay">Day</Label>
                <Input
                  id="editDay"
                  value={editingEntry.day}
                  onChange={(e) => setEditingEntry({...editingEntry, day: e.target.value})}
                  placeholder="Enter day"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveEdit} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingEntry(null);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (editingEntry) {
                      deleteEntry(editingEntry.id);
                      setEditingEntry(null);
                      setIsEditing(false);
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}