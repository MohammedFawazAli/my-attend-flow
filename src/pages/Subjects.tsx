import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, TrendingDown, Edit3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSubjects, saveSubjects, getSubjectAttendance } from '@/lib/storage';
import { Subject } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = () => {
    const storedSubjects = getSubjects();
    
    // Update with actual attendance data
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
  };

  const getSubjectColor = (index: number) => `subject-color-${(index % 8) + 1}`;

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 75) return { status: 'good', color: 'success' };
    if (percentage >= 60) return { status: 'medium', color: 'warning' };
    return { status: 'low', color: 'destructive' };
  };

  const editSubject = (subject: Subject) => {
    setEditingSubject({ ...subject });
  };

  const saveEdit = () => {
    if (editingSubject) {
      const updatedSubjects = subjects.map(subject => 
        subject.id === editingSubject.id ? editingSubject : subject
      );
      
      setSubjects(updatedSubjects);
      saveSubjects(updatedSubjects);
      setEditingSubject(null);
      
      toast({
        title: "Subject updated successfully!",
        description: `${editingSubject.name} has been updated.`,
      });
    }
  };

  const calculateRequiredClasses = (subject: Subject) => {
    const requiredPercentage = 75;
    const { totalClasses, attendedClasses } = subject;
    
    if (totalClasses === 0) return 0;
    
    // Calculate minimum classes needed for 75%
    const minRequired = Math.ceil((requiredPercentage * totalClasses) / 100);
    const stillNeeded = Math.max(0, minRequired - attendedClasses);
    
    return stillNeeded;
  };

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-md mx-auto text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Subjects Found</h2>
          <p className="text-muted-foreground mb-6">
            Upload your timetable to create subjects and track attendance
          </p>
        </div>
      </div>
    );
  }

  // Sort subjects by attendance percentage (lowest first)
  const sortedSubjects = [...subjects].sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
          <p className="text-muted-foreground">Track attendance for each subject</p>
        </div>

        {/* Summary Stats */}
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{subjects.length}</div>
                <div className="text-sm text-muted-foreground">Total Subjects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {subjects.filter(s => s.attendancePercentage >= 75).length}
                </div>
                <div className="text-sm text-muted-foreground">Good (≥75%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {subjects.filter(s => s.attendancePercentage < 75).length}
                </div>
                <div className="text-sm text-muted-foreground">Below Target</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects List */}
        <div className="space-y-4">
          {sortedSubjects.map((subject, index) => {
            const { status, color } = getAttendanceStatus(subject.attendancePercentage);
            const requiredClasses = calculateRequiredClasses(subject);
            
            return (
              <Card key={subject.id} className={`stat-card ${status === 'low' ? 'border-destructive/20' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${getSubjectColor(subject.colorIndex)}`} />
                      <CardTitle className="text-base">{subject.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {subject.attendancePercentage < 75 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Below 75%
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editSubject(subject)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attendance Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center text-sm">
                    <div>
                      <div className="text-lg font-bold text-success">{subject.attendedClasses}</div>
                      <div className="text-muted-foreground">Attended</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-destructive">
                        {subject.totalClasses - subject.attendedClasses}
                      </div>
                      <div className="text-muted-foreground">Missed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{subject.totalClasses}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold text-${color}`}>
                        {subject.attendancePercentage.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">Percentage</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Attendance Progress</span>
                      <span className={`font-semibold text-${color}`}>
                        {subject.attendancePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={subject.attendancePercentage} 
                      className={`h-2 ${status}-attendance`}
                    />
                  </div>

                  {/* Additional Info */}
                  {subject.attendancePercentage < 75 && requiredClasses > 0 && (
                    <div className="bg-destructive-light border border-destructive/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <TrendingDown className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          Need {requiredClasses} more class{requiredClasses !== 1 ? 'es' : ''} to reach 75%
                        </span>
                      </div>
                    </div>
                  )}

                  {subject.attendancePercentage >= 75 && (
                    <div className="bg-success-light border border-success/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium text-sm">Great! Above minimum requirement</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          {editingSubject && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subjectName">Subject Name</Label>
                <Input
                  id="subjectName"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingSubject(null)}>
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