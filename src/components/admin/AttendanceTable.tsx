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
import AttendanceDetailsModal from "@/components/employee/attendance/AttendanceDetailsModal";

interface AttendanceTableProps {
  showTodayOnly?: boolean;
  onViewDetails?: (log: AttendanceRecord) => void;
  userEmail?: string;
  selectedMonth?: string;
}

const AttendanceTable = ({ showTodayOnly = false, onViewDetails, userEmail, selectedMonth }: AttendanceTableProps) => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAttendanceLogs = async () => {
      try {
        const logs = await attendanceService.getAttendanceLogs();
        let filteredLogs = logs;

        if (userEmail) {
          filteredLogs = logs.filter(log => 
            log.email?.toLowerCase() === userEmail?.toLowerCase()
          );
        }

        if (showTodayOnly) {
          const today = new Date().toDateString();
          filteredLogs = filteredLogs.filter(log => 
            new Date(log.date).toDateString() === today
          );
        }

        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          filteredLogs = filteredLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate.getFullYear() === parseInt(year) && 
                   logDate.getMonth() === parseInt(month) - 1;
          });
        }

        setAttendanceLogs(filteredLogs);
      } catch (error) {
        console.error('Error fetching attendance logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceLogs();
  }, [userEmail, showTodayOnly, selectedMonth]);

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

  const handleViewDetails = (log: AttendanceRecord) => {
    setSelectedLog(log);
    setIsModalOpen(true);
    if (onViewDetails) {
      onViewDetails(log);
    }
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
    <>
      <ScrollArea className="h-[600px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {!isMobile && <TableHead>Employee ID</TableHead>}
              <TableHead>Name</TableHead>
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
                <TableCell>{log.employeeName}</TableCell>
                <TableCell>{formatTime(log.checkIn)}</TableCell>
                <TableCell>{formatTime(log.checkOut)}</TableCell>
                <TableCell>{getAttendanceStatus(log.effectiveHours)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <AttendanceDetailsModal
        log={selectedLog}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
};

export default AttendanceTable;