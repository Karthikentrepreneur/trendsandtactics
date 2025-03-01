export interface UserFormData {
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  password?: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "open" | "in-progress" | "completed" | "blocked";
  assigned_to: string;
  due_date?: string;
  created_at: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  employee_id?: string;
  designation?: string;
  role?: string;
  profile_photo?: string;
  date_of_birth?: string;
  fathers_name?: string;
  mothers_name?: string;
  address?: string;
  contact_number?: string;
  emergency_contact?: string;
  date_of_joining?: string;
  department?: string;
  gross_salary?: number;
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
