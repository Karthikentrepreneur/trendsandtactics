import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, ClipboardList } from "lucide-react";
import { attendanceService } from "@/services/attendanceService";
import { supabase } from "@/integrations/supabase/client";
import AttendanceTable from "./AttendanceTable";
import { AttendanceRecord } from "@/services/attendance/types";

const AdminHome = () => {
  const [stats, setStats] = useState([
    {
      title: "Total Employees",
      value: "10",
      icon: Users,
      description: "Active employees",
    },
    {
      title: "Present Today",
      value: "0",
      icon: CheckCircle,
      description: "Attendance rate",
    },
    {
      title: "Absent Today",
      value: "0",
      icon: XCircle,
      description: "Absence rate",
    },
    {
      title: "Pending Tasks",
      value: "0",
      icon: ClipboardList,
      description: "Due this week",
    },
  ]);

  useEffect(() => {
    const updateStats = async () => {
      // Get pending tasks count from Supabase
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending');
      
      const pendingTasks = tasks?.length || 0;
      const totalEmployees = 10; // Constant value as requested

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Get attendance records for today
      const allAttendanceLogs = await attendanceService.getAttendanceLogs();
      const todayAttendance = allAttendanceLogs.filter(log => log.date === today);
      const presentToday = todayAttendance.length;
      
      // Calculate absent count
      const absentToday = totalEmployees - presentToday;
      
      setStats([
        {
          title: "Total Employees",
          value: totalEmployees.toString(),
          icon: Users,
          description: "Active employees",
        },
        {
          title: "Present Today",
          value: presentToday.toString(),
          icon: CheckCircle,
          description: `${Math.round((presentToday/totalEmployees) * 100)}% attendance`,
        },
        {
          title: "Absent Today",
          value: absentToday.toString(),
          icon: XCircle,
          description: `${Math.round((absentToday/totalEmployees) * 100)}% absence rate`,
        },
        {
          title: "Pending Tasks",
          value: pendingTasks.toString(),
          icon: ClipboardList,
          description: "Due this week",
        },
      ]);
    };

    updateStats();

    // Set up real-time subscription for tasks
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          updateStats();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewDetails = (log: AttendanceRecord) => {
    console.log("Viewing details for:", log);
    // Implement view details functionality if needed
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tight">Today's Attendance</h3>
        <AttendanceTable 
          showTodayOnly={true} 
          onViewDetails={handleViewDetails}
          userEmail=""
        />
      </div>
    </div>
  );
};

export default AdminHome;
