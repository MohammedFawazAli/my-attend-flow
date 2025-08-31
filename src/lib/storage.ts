import { Subject, TimetableEntry, AttendanceRecord, AttendanceStats } from '@/types/attendance';

const STORAGE_KEYS = {
  SUBJECTS: 'attendflow_subjects',
  TIMETABLE: 'attendflow_timetable',
  ATTENDANCE: 'attendflow_attendance',
} as const;

// Subject Storage
export const saveSubjects = (subjects: Subject[]) => {
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const getSubjects = (): Subject[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
  return data ? JSON.parse(data) : [];
};

// Timetable Storage
export const saveTimetable = (timetable: TimetableEntry[]) => {
  localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
};

export const getTimetable = (): TimetableEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
  return data ? JSON.parse(data) : [];
};

// Attendance Storage
export const saveAttendanceRecords = (records: AttendanceRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
};

export const getAttendanceRecords = (): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

// Utility Functions
export const calculateAttendanceStats = (): AttendanceStats => {
  const records = getAttendanceRecords();
  const totalClasses = records.length;
  const attendedClasses = records.filter(r => r.status === 'present').length;
  const missedClasses = totalClasses - attendedClasses;
  const attendancePercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

  return {
    totalClasses,
    attendedClasses,
    missedClasses,
    attendancePercentage,
  };
};

export const getSubjectAttendance = (subjectId: string): AttendanceStats => {
  const records = getAttendanceRecords().filter(r => r.subjectId === subjectId);
  const totalClasses = records.length;
  const attendedClasses = records.filter(r => r.status === 'present').length;
  const missedClasses = totalClasses - attendedClasses;
  const attendancePercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

  return {
    totalClasses,
    attendedClasses,
    missedClasses,
    attendancePercentage,
  };
};

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};