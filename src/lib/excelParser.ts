/**
 * Enhanced Excel Parser for Complex Timetable Structure
 * 
 * This parser handles:
 * - Batch numbers in first row
 * - Time and day headers starting from second row
 * - Complex cell data with multiple subjects, rooms, instructors, and batch info
 * - Extraction of only subject names and room numbers
 */

import * as XLSX from 'xlsx';

export interface ParsedTimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  room?: string;
  batch?: string;
}

export interface ExcelParseResult {
  success: boolean;
  data: ParsedTimetableEntry[];
  errors: string[];
  warnings: string[];
}

/**
 * Extracts subject name and room from complex cell data
 * Handles formats like:
 * - "Subject Name (Room) Instructor [Batch]"
 * - "Subject Name Room Instructor Batch"
 * - Multiple subjects separated by newlines or commas
 */
function extractSubjectAndRoom(cellData: string): { subject: string; room?: string } {
  if (!cellData || cellData.trim() === '') {
    return { subject: '' };
  }

  // Clean the cell data
  let cleanData = cellData.trim();
  
  // Handle multiple subjects - take only the first one
  const lines = cleanData.split(/[\n\r]+/);
  if (lines.length > 1) {
    cleanData = lines[0].trim();
  }
  
  // Split by commas if multiple subjects in one line
  const parts = cleanData.split(',');
  if (parts.length > 1) {
    cleanData = parts[0].trim();
  }

  // Extract room number using multiple patterns
  let room: string | undefined;
  
  // Pattern 1: Look for room codes in parentheses (most common format)
  const roomMatch = cleanData.match(/\(([^)]+)\)/);
  if (roomMatch) {
    const potentialRoom = roomMatch[1].trim();
    
    // Validate if this looks like a room number
    // Rooms in your timetable follow patterns like: 3102B-BL3-FF, 3002A-BL3-GF, etc.
    if (potentialRoom.match(/[A-Z]?\d+[A-Z]?-[A-Z]+\d+-[A-Z]+/)) {
      room = potentialRoom;
      cleanData = cleanData.replace(/\([^)]+\)/g, '').trim();
    }
  }
  
  // Pattern 2: Look for room codes without parentheses
  if (!room) {
    const roomPatterns = [
      /\b([A-Z]?\d+[A-Z]?-[A-Z]+\d+-[A-Z]+)\b/, // Patterns like "3102B-BL3-FF"
      /\b([A-Z]\d+[A-Z]?-[A-Z]+\d+)\b/, // Patterns like "B301A-BL3"
      /\b(\d{4}[A-Z]?)\b/, // 4-digit room numbers
      /\b([A-Z]+\d+[A-Z]?)\b/ // Alphanumeric room codes
    ];
    
    for (const pattern of roomPatterns) {
      const match = cleanData.match(pattern);
      if (match) {
        room = match[1] || match[0];
        cleanData = cleanData.replace(pattern, '').trim();
        break;
      }
    }
  }

  // Clean up subject name
  let subject = cleanData;
  
  // Remove instructor names and surnames (common patterns)
  subject = subject.replace(
    /\b(?:Dr|Prof|Mr|Ms|Mrs)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:?/g, 
    ''
  );
  
  // Remove batch codes and numbers
  subject = subject.replace(
    /(?:23CSBTB\d{2}[A-Z]?|\d{2}[A-Z]{3,}\d{2}[A-Z]?\d?)/g, 
    ''
  );
  
  // Remove any remaining parenthetical content
  subject = subject.replace(/\([^)]*\)/g, '');
  
  // Remove special characters and extra whitespace
  subject = subject
    .replace(/[:\-–—]+$/g, '') // Remove trailing colons/dashes
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common Indian surnames that might remain
  const commonSurnames = [
    'sujitha', 'sudharani', 'ramesh', 'mishra', 'nagalaxmi', 'sammaiah', 
    'rao', 'sourav', 'kumar', 'shiva', 'kotte', 'teja', 'tyagi', 'iram', 
    'venkatesh', 'gurrapu', 'reddy', 'hazra','Dr','dr','Mr','Mrs','Ms','sandeep',
    'Bhanu',
  ];
  
  // Create a regex pattern to match these surnames
  const surnamePattern = new RegExp(
    '\\b(' + commonSurnames.join('|') + ')\\b', 
    'gi'
  );
  subject = subject.replace(surnamePattern, '').trim();
  
  // Remove any remaining single letters or initials
  subject = subject.replace(/\b[A-Z]\b/g, '').trim();
  
  // Clean up any double spaces or trailing punctuation
  subject = subject
    .replace(/\s+/g, ' ')
    .replace(/[.,;:()\s]+$/g, '')
    .trim();

  // If subject is empty after cleaning, use a fallback
  if (!subject) {
    // Try to extract the first meaningful words as subject
    const words = cleanData.split(/\s+/);
    subject = words.slice(0, 3).join(' ').replace(/[^a-zA-Z\s]/g, '');
  }

  return { subject, room };
}

/**
 * Parses Excel file with complex timetable structure
 */
export async function parseExcelTimetable(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    success: false,
    data: [],
    errors: [],
    warnings: []
  };

  try {
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to 2D array
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '', 
      raw: false 
    }) as string[][];

    if (rawData.length < 3) {
      result.errors.push('Excel file must contain at least 3 rows (batch header, day header, and data)');
      return result;
    }

    console.log('Raw Excel data:', rawData.slice(0, 5)); // Debug log

    // Skip first row (batch numbers) and use second row as headers
    const headers = rawData[1].map(h => String(h || '').trim());
    const dataRows = rawData.slice(2);

    console.log('Headers from row 2:', headers);

    // Find time column (usually first column)
    const timeColumnIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('time') || h.toLowerCase().includes('period') || h === '')
    );
    
    // If no explicit time header, assume first column is time
    const timeColumn = timeColumnIndex !== -1 ? timeColumnIndex : 0;

    // Find day columns (skip time column)
    const dayColumns: { name: string; index: number }[] = [];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    headers.forEach((header, index) => {
      if (index === timeColumn) return; // Skip time column
      
      const headerLower = header.toLowerCase();
      const matchedDay = dayNames.find(day => 
        headerLower.includes(day) || headerLower.includes(day.slice(0, 3))
      );
      
      if (matchedDay) {
        dayColumns.push({
          name: matchedDay.charAt(0).toUpperCase() + matchedDay.slice(1),
          index
        });
      }
    });

    if (dayColumns.length === 0) {
      result.errors.push(`No day columns found in headers: ${headers.join(', ')}`);
      return result;
    }

    console.log('Day columns found:', dayColumns);

    // Process data rows
    const timetableEntries: ParsedTimetableEntry[] = [];
    
    dataRows.forEach((row, rowIndex) => {
      const timeValue = String(row[timeColumn] || '').trim();
      
      // Skip rows without time values
      if (!timeValue) return;
      
      // Process each day column
      dayColumns.forEach(dayCol => {
        const cellData = String(row[dayCol.index] || '').trim();
        
        // Skip empty cells or cells with just "Free" or similar
        if (!cellData || 
            cellData.toLowerCase().includes('free') || 
            cellData.toLowerCase().includes('break') ||
            cellData === '-') {
          return;
        }

        // Extract subject and room from complex cell data
        const { subject, room } = extractSubjectAndRoom(cellData);
        
        if (subject) {
          const entry: ParsedTimetableEntry = {
            id: `${dayCol.name.toLowerCase()}-${timeValue}-${rowIndex}-${Math.random().toString(36).substr(2, 9)}`,
            day: dayCol.name,
            time: timeValue,
            subject: subject,
            room: room,
          };
          
          timetableEntries.push(entry);
          
          // Log successful extraction for debugging
          console.log(`Extracted: ${cellData} -> Subject: ${subject}, Room: ${room}`);
        }
      });
    });

    if (timetableEntries.length === 0) {
      result.errors.push('No valid timetable entries found. Please check your Excel format.');
      return result;
    }

    result.success = true;
    result.data = timetableEntries;
    result.warnings.push(`Successfully parsed ${timetableEntries.length} timetable entries`);
    
    // Add warnings for common issues
    const uniqueSubjects = new Set(timetableEntries.map(e => e.subject));
    if (uniqueSubjects.size < 3) {
      result.warnings.push('Only found a few unique subjects. Please verify the data extraction.');
    }

    return result;

  } catch (error) {
    console.error('Excel parsing error:', error);
    result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Validates timetable entry data
 */
export function validateTimetableEntry(entry: ParsedTimetableEntry): string[] {
  const errors: string[] = [];
  
  if (!entry.subject || entry.subject.trim() === '') {
    errors.push('Subject name is required');
  }
  
  if (!entry.day || entry.day.trim() === '') {
    errors.push('Day is required');
  }
  
  if (!entry.time || entry.time.trim() === '') {
    errors.push('Time is required');
  }
  
  return errors;
}