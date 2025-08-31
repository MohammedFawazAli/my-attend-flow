export interface Subject {
  id: string;
  name: string;
  colorIndex: number;
  totalClasses: number;
  attendedClasses: number;
  attendancePercentage: number;
}

export interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  room?: string;
  instructor?: string;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  status: 'present' | 'absent';
  timetableEntryId: string;
}

export interface DailySchedule {
  date: string;
  classes: {
    id: string;
    subject: string;
    time: string;
    room?: string;
    instructor?: string;
    status?: 'present' | 'absent' | null;
    timetableEntryId: string;
  }[];
}

export interface AttendanceStats {
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  attendancePercentage: number;
}