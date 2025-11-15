
import { Task } from "./user";

export interface PerformanceAnalytics {
  presentDays: number;
  absentDays: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfile {
  date_of_birth: string;
  fathers_name: string;
  mothers_name: string;
  address: string;
  contact_number: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'late';
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
