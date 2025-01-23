export interface User {
  id: string;
  name: string | null;
  email: string | null;
  employee_id: string | null;
  designation: string | null;
  role: string | null;
  password: string | null;
}

export interface UserFormData {
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  password: string;
  role: "admin" | "manager" | "employee";
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string | null;
  assigned_date: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}