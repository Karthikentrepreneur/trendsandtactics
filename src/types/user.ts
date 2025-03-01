export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  employee_id: string | null;
  designation: string | null;
  date_of_birth: string | null;
  date_of_joining: string | null;
  fathers_name: string | null;
  mothers_name: string | null;
  address: string | null;
  contact_number: string | null;
  emergency_contact: string | null;
  profile_photo: string | null;
  department?: string | null; // Make department optional
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
  status: string | null;
  due_date: string | null;
  assigned_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
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
  gross_salary: number;
  epf_percentage: number;
  total_deduction: number;
  net_pay: number;
  created_at: string;
  updated_at: string | null;
}
