
import { Task } from "./user";

export interface PerformanceAnalytics {
  presentDays: number;
  absentDays: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string; // Changed from strict union type to string to match database
  created_at: string;
  updated_at?: string; // Added to match the database schema
}

export interface EmployeeProfile {
  date_of_birth: string;
  fathers_name: string;
  mothers_name: string;
  address: string;
  contact_number: string;
  emergency_contact: string;
}
