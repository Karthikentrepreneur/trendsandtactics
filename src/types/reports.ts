
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'absent';
  check_in?: string;
  check_out?: string;
}

export interface EmployeeStats {
  attendance: Array<{
    date: string;
    status: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  leaves: Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    completedTasks: number;
    pendingTasks: number;
  };
}
