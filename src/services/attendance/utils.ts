import { CheckInLog } from './types';

export const calculateHours = (start: string, end: string): number => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const hours = (endTime - startTime) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

export const parseGoogleSheetJson = (text: string): CheckInLog[] => {
  try {
    // Remove Google's JSON API response prefix and suffix
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows) {
      console.error('Invalid Google Sheets data format');
      return [];
    }

    return data.table.rows
      .filter((row: any) => row.c && Array.isArray(row.c))
      .map((row: any) => {
        const cols = row.c;
        
        // Safely extract date components
        const dateObj = cols[0]?.v;
        const timeStr = cols[1]?.v || '';
        
        if (!dateObj || !timeStr) {
          console.log('Missing date or time:', { dateObj, timeStr });
          return null;
        }
        
        // Extract the date components from the "Date(year,month,day)" string
        const dateMatch = dateObj.toString().match(/Date\((\d+),(\d+),(\d+)\)/);
        if (!dateMatch) {
          console.error('Invalid date format:', dateObj);
          return null;
        }
        
        const [_, year, month, day] = dateMatch;
        
        // Parse time (assuming format like "03.44 AM")
        const [timeHours, timeMinutes] = timeStr.split(' ')[0].split('.').map(Number);
        const isPM = timeStr.includes('PM');
        
        if (isNaN(timeHours) || isNaN(timeMinutes)) {
          console.error('Invalid time format:', timeStr);
          return null;
        }
        
        // Create date object
        const date = new Date(
          Number(year),
          Number(month),
          Number(day),
          isPM ? (timeHours === 12 ? 12 : timeHours + 12) : (timeHours === 12 ? 0 : timeHours),
          timeMinutes
        );

        if (isNaN(date.getTime())) {
          console.error('Invalid date created:', date);
          return null;
        }

        // Convert punch type to standardized format
        const punchType = cols[6]?.v?.toString()?.toUpperCase().includes('OUT') ? 'OUT' : 'IN';

        return {
          employeeId: cols[2]?.v?.toString() || '',
          employeeName: cols[3]?.v?.toString() || '',
          emailId: cols[4]?.v?.toString() || '',
          position: cols[5]?.v?.toString() || '',
          punchType: punchType,
          timestamp: date.toISOString()
        };
      })
      .filter((log: CheckInLog | null): log is CheckInLog => 
        log !== null && 
        Boolean(log.employeeId) && 
        Boolean(log.timestamp)
      );
  } catch (error) {
    console.error('Error parsing Google Sheet data:', error);
    return [];
  }
};