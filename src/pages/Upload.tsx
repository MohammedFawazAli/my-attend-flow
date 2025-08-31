import { useState, useRef } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, AlertTriangle, Check, X, Edit3, Bell, TestTube } from 'lucide-react';
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
import { parseExcelTimetable, ParsedTimetableEntry } from '@/lib/excelParser';
import NotificationService from '@/lib/notificationService';

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTimetableEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ParsedTimetableEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const notificationService = NotificationService.getInstance();

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
      handleFileProcessing(e.target.files[0]);
    }
  };

  const handleFileProcessing = async (file: File) => {
    setIsProcessing(true);
    setParseWarnings([]);
    
    try {
      let timetableData: ParsedTimetableEntry[] = [];
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Use enhanced Excel parser
        const parseResult = await parseExcelTimetable(file);
        
        if (!parseResult.success) {
          throw new Error(parseResult.errors.join('\n'));
        }
        
        timetableData = parseResult.data;
        setParseWarnings(parseResult.warnings);
        
      } else if (file.name.endsWith('.csv')) {
        throw new Error('CSV files are not supported with the new parser. Please use Excel files (.xlsx, .xls).');
      } else {
        throw new Error('Unsupported file format. Please upload Excel files (.xlsx, .xls) only.');
      }

      if (timetableData.length === 0) {
        throw new Error('No valid timetable entries found after processing');
      }

      setParsedData(timetableData);
      setShowPreview(true);
      
      toast.success(`File parsed successfully! Found ${timetableData.length} timetable entries`);
      
      if (parseWarnings.length > 0) {
        setTimeout(() => {
          parseWarnings.forEach(warning => {
            toast(warning, { duration: 4000 });
          });
        }, 1000);
      }
      
    } catch (error) {
      console.error('File processing error:', error);
      toast.error(error instanceof Error ? error.message : "Unknown error occurred while processing file");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTimetable = () => {
    // Convert ParsedTimetableEntry to TimetableEntry for storage
    const timetableEntries: TimetableEntry[] = parsedData.map(entry => ({
      id: entry.id,
      day: entry.day,
      time: entry.time,
      subject: entry.subject,
      room: entry.room,
    }));
    
    // Save timetable
    saveTimetable(timetableEntries);
    
    // Create and save subjects
    const uniqueSubjects = Array.from(new Set(timetableEntries.map(entry => entry.subject)));
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

  const editEntry = (entry: ParsedTimetableEntry) => {
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
    setIsTestingNotifications(true);
    
    notificationService.showTestNotification()
      .then(() => {
        toast.success('Test notifications sent! Check your notification panel.');
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to send test notifications');
      })
      .finally(() => {
        setIsTestingNotifications(false);
      });
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
            <p>✅ Excel files (.xlsx, .xls) and CSV files (.csv) supported</p>
            <p>✅ First row should contain days (Monday, Tuesday, etc.)</p>
            <p>✅ First column should contain times (09:00, 10:00, etc.)</p>
            <p>✅ Cells should contain "Subject Name (Room)" or just "Subject Name"</p>
            <p>❌ Empty cells and "Free" periods will be ignored</p>
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
            <CardTitle className="text-base">Expected Excel Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-3">
              <p>✅ Row 1: Batch numbers (will be ignored)</p>
              <p>✅ Row 2: Time and day headers</p>
              <p>✅ Row 3+: Time slots with subject data</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="border-r p-2 text-muted-foreground">Batch Info</th>
                    <th className="border-r p-2 text-muted-foreground">23CSE1A1</th>
                    <th className="border-r p-2 text-muted-foreground">23CSE1B1</th>
                    <th className="p-2 text-muted-foreground">23CSE1C1</th>
                  </tr>
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
                    <td className="border-r p-2 text-xs">Python for DataScience (R-101) Dr. Smith (23CSE1A1)</td>
                    <td className="border-r p-2 text-xs">Cloud Computing (Lab-1) Prof. Johnson</td>
                    <td className="p-2 text-xs">Database Management (R-203) Ms. Davis</td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-2">10:00</td>
                    <td className="border-r p-2 text-xs">Machine Learning (R-105) Dr. Wilson</td>
                    <td className="border-r p-2"></td>
                    <td className="p-2 text-xs">Web Development (Lab-2) Mr. Brown</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <p><strong>Note:</strong> Only subject names and room numbers will be extracted. Instructor names and batch codes will be ignored.</p>
            </div>
          </CardContent>
        </Card>

        {/* Parse Warnings */}
        {parseWarnings.length > 0 && (
          <Card className="stat-card border-warning/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-warning">
                <AlertTriangle className="h-5 w-5" />
                Processing Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {parseWarnings.map((warning, index) => (
                <p key={index} className="text-muted-foreground">• {warning}</p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Test Notifications Button */}
        <Button 
          onClick={testNotifications}
          disabled={isTestingNotifications}
          className="w-full bg-primary hover:bg-primary-hover"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isTestingNotifications ? 'Sending...' : 'Test Notifications'}
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