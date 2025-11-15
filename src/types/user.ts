
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
  role?: 'admin' | 'manager' | 'employee'; // Optional, fetched from user_roles
}

export interface UserFormData {
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  password: string;
  role: "admin" | "employee" | "manager";
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

export interface PayslipFormValues {
  month: string;
  year: string;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  other_allowances: number;
  epf_deduction: number;
  other_deductions: number;
}

export interface SalaryInformation {
  id: string;
  employee_id: string;
  user_id: string;
  gross_salary: number;
  epf_percentage: number;
  total_deduction: number;
  net_pay: number;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  user_id: string;
  month: number;
  year: number;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  other_allowances: number;
  epf_deduction: number;
  other_deductions: number;
  gross_salary: number;
  net_salary: number;
  created_at: string;
  updated_at: string;
}
