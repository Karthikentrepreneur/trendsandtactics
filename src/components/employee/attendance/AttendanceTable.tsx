import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { AttendanceRecord } from "@/services/attendance/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { attendanceService } from "@/services/attendanceService";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface AttendanceTableProps {
  showTodayOnly?: boolean;
  onViewDetails: (log: AttendanceRecord) => void;
  userEmail: string;
}

const AttendanceTable = ({ showTodayOnly = false, onViewDetails, userEmail }: AttendanceTableProps) => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAttendanceLogs = async () => {
      try {
        const logs = await attendanceService.getAttendanceLogs();
        const filteredLogs = logs.filter(log => 
          log.email?.toLowerCase() === userEmail?.toLowerCase()
        );

        if (showTodayOnly) {
          const today = new Date().toDateString();
          const todayLogs = filteredLogs.filter(log => 
            new Date(log.date).toDateString() === today
          );
          setAttendanceLogs(todayLogs);
        } else {
          setAttendanceLogs(filteredLogs);
        }
      } catch (error) {
        console.error('Error fetching attendance logs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchAttendanceLogs();
    }
  }, [userEmail, showTodayOnly]);

  const formatTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getAttendanceStatus = (effectiveHours: number) => {
    if (effectiveHours >= 8) {
      return <Badge className="bg-green-500">Full Day</Badge>;
    } else if (effectiveHours > 0) {
      return <Badge className="bg-yellow-500">Partial Day</Badge>;
    }
    return <Badge className="bg-red-500">Absent</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (attendanceLogs.length === 0) {
    return <div className="text-center text-gray-500">No attendance records found.</div>;
  }

  return (
    <ScrollArea className="h-[600px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {!isMobile && <TableHead>Employee ID</TableHead>}
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceLogs.map((log, index) => (
            <TableRow key={index}>
              <TableCell>{formatDate(log.date)}</TableCell>
              {!isMobile && <TableCell>{log.employeeId}</TableCell>}
              <TableCell>{formatTime(log.checkIn)}</TableCell>
              <TableCell>{formatTime(log.checkOut)}</TableCell>
              <TableCell>{getAttendanceStatus(log.effectiveHours)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default AttendanceTable;