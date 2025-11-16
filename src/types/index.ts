// Central type definitions aligned with database schema
export interface User {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  designation: string | null;
  date_of_birth: string | null;
  date_of_joining: string | null;
  fathers_name: string | null;
  mothers_name: string | null;
  address: string | null;
  contact_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  role?: 'admin' | 'manager' | 'employee';
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: string;
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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  password: string;
  role: "admin" | "employee" | "manager";
}