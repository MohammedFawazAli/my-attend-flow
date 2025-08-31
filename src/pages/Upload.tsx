import { useState, useRef } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, AlertTriangle, Check, X, Edit3, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { saveTimetable, saveSubjects, clearAllData, getTimetable } from '@/lib/storage';
import { TimetableEntry, Subject } from '@/types/attendance';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<TimetableEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      // Parse CSV data
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log('Parsed headers:', headers);
      console.log('First header:', `"${headers[0]}"`);
      const timeColumn = headers.findIndex(h => h.toLowerCase().includes('time'));
      console.log('Time column index:', timeColumn);
      
      if (timeColumn === -1) {
        throw new Error(`Time column not found. Headers found: ${headers.join(', ')}. First column should contain 'time'.`);
      }

      const dayColumns = headers.slice(1).map((header, index) => ({
        name: header,
        index: index + 1
      })).filter(col => 
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          .some(day => col.name.toLowerCase().includes(day))
      );

      const timetableData: TimetableEntry[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const time = row[timeColumn];
        
        if (!time) continue;

        dayColumns.forEach(dayCol => {
          const subject = row[dayCol.index];
          if (subject && subject.trim() && !subject.toLowerCase().includes('free')) {
            // Extract room info if present (format: "Subject (Room)")
            const roomMatch = subject.match(/\(([^)]+)\)$/);
            const subjectName = subject.replace(/\([^)]+\)$/, '').trim();
            const room = roomMatch ? roomMatch[1] : undefined;

            timetableData.push({
              id: `${dayCol.name.toLowerCase()}-${time}-${i}`,
              day: dayCol.name,
              time: time,
              subject: subjectName,
              room: room,
            });
          }
        });
      }

      setParsedData(timetableData);
      setShowPreview(true);
      
      toast.success(`File parsed successfully! Found ${timetableData.length} timetable entries`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Please check the file format");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTimetable = () => {
    // Save timetable
    saveTimetable(parsedData);
    
    // Create and save subjects
    const uniqueSubjects = Array.from(new Set(parsedData.map(entry => entry.subject)));
    const subjects: Subject[] = uniqueSubjects.map((name, index) => ({
      id: `subject-${index}`,
      name,
      colorIndex: index,
      totalClasses: 0,
      attendedClasses: 0,
      attendancePercentage: 0,
    }));
    
    saveSubjects(subjects);
    
    toast.success(`Timetable saved successfully! Created ${subjects.length} subjects`);
    
    navigate('/');
  };

  const editEntry = (entry: TimetableEntry) => {
    setEditingEntry({ ...entry });
  };

  const saveEdit = () => {
    if (editingEntry) {
      const updatedData = parsedData.map(entry => 
        entry.id === editingEntry.id ? editingEntry : entry
      );
      setParsedData(updatedData);
      setEditingEntry(null);
    }
  };

  const removeEntry = (id: string) => {
    setParsedData(parsedData.filter(entry => entry.id !== id));
  };

  const testNotifications = () => {
    const existingTimetable = getTimetable();
    if (existingTimetable.length === 0) {
      toast.error('No timetable data found. Please upload a timetable first.');
      return;
    }

    // Group by day for better notification display
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayClasses = existingTimetable.filter(entry => 
      entry.day.toLowerCase().includes(today.slice(0, 3))
    );

    if (todayClasses.length > 0) {
      todayClasses.forEach((entry, index) => {
        setTimeout(() => {
          toast.success(`🔔 ${entry.subject}\n${entry.time} • ${entry.room || 'No room specified'}`, {
            duration: 4000,
            position: 'top-right',
          });
        }, index * 500);
      });
    } else {
      // Show all classes if today's not found
      existingTimetable.slice(0, 5).forEach((entry, index) => {
        setTimeout(() => {
          toast.success(`📚 ${entry.subject}\n${entry.day} • ${entry.time} • ${entry.room || 'No room'}`, {
            duration: 4000,
            position: 'top-right',
          });
        }, index * 500);
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Upload Timetable</h1>
          <p className="text-muted-foreground mt-1">Upload your class schedule</p>
        </div>

        {/* Format Instructions */}
        <Card className="stat-card border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-5 w-5" />
              Excel Format Expected
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>First row should contain days (Monday, Tuesday, etc.)</p>
            <p>First column should contain times (09:00, 10:00, etc.)</p>
            <p>Cells should contain "Subject Name (Room)" or just "Subject Name"</p>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card className="stat-card">
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary-light' 
                  : 'border-border hover:border-primary hover:bg-muted/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select Excel File</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your Excel file here, or click to browse
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-primary hover:bg-primary-hover"
              >
                {isProcessing ? 'Processing...' : 'Choose File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sample Format */}
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Excel Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="border-r p-2 bg-muted">Time</th>
                    <th className="border-r p-2 bg-muted">Monday</th>
                    <th className="border-r p-2 bg-muted">Tuesday</th>
                    <th className="p-2 bg-muted">Wednesday</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="border-r p-2">09:00</td>
                    <td className="border-r p-2">CS301 (Room 101)</td>
                    <td className="border-r p-2">CS302 (Lab 1)</td>
                    <td className="p-2">CS303 (Room 102)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-2">10:00</td>
                    <td className="border-r p-2">Math (Room 201)</td>
                    <td className="border-r p-2"></td>
                    <td className="p-2">Physics (Lab 2)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Test Notifications Button */}
        <Button 
          onClick={testNotifications}
          className="w-full bg-primary hover:bg-primary-hover"
        >
          <Bell className="h-4 w-4 mr-2" />
          Test Notifications
        </Button>

        {/* Clear Data Button */}
        <Button 
          variant="outline" 
          onClick={() => {
            clearAllData();
            toast.success('All data cleared successfully!');
          }}
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Clear All Data
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Timetable ({parsedData.length} entries)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {parsedData.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{entry.subject}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.day} • {entry.time}
                    {entry.room && ` • ${entry.room}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => editEntry(entry)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeEntry(entry.id)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={confirmTimetable} 
                className="flex-1 bg-success hover:bg-success/90"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm Timetable
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Timetable Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editingEntry.subject}
                  onChange={(e) => setEditingEntry({...editingEntry, subject: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="room">Room (Optional)</Label>
                <Input
                  id="room"
                  value={editingEntry.room || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, room: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}