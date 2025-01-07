import { useEffect, useState } from "react";
import { attendanceService } from "@/services/attendanceService";
import { localStorageService } from "@/services/localStorageService";
import { AttendanceRecord } from "@/services/attendance/types";
import AttendanceLoading from "./attendance/AttendanceLoading";
import AttendanceTable from "./attendance/AttendanceTable";
import AttendanceDetailsModal from "./attendance/AttendanceDetailsModal";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const EmployeeAttendance = () => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AttendanceRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const currentUser = localStorageService.getCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to view attendance records",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const allLogs = await attendanceService.getAttendanceLogs();
        console.log('All logs:', allLogs);
        console.log('Current user:', currentUser);
        
        // Filter logs for current employee and sort by date in descending order
        const employeeLogs = allLogs
          .filter(log => log.employeeId === currentUser.employeeId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log('Filtered logs:', employeeLogs);
        setAttendanceLogs(employeeLogs);
      } catch (error) {
        console.error('Error fetching attendance logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch attendance records",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentUser, navigate, toast]);

  const handleViewDetails = (log: AttendanceRecord) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  if (loading) {
    return <AttendanceLoading />;
  }

  if (attendanceLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-lg text-gray-600">No attendance records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-3xl font-bold tracking-tight">My Attendance</h2>
      
      <AttendanceTable 
        attendanceLogs={attendanceLogs} 
        onViewDetails={handleViewDetails}
      />

      <AttendanceDetailsModal
        log={selectedLog}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </div>
  );
};

export default EmployeeAttendance;