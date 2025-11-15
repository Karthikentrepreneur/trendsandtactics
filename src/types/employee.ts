
export interface ProfessionalExperience {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string | null;
  responsibilities: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  user_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_at: string;
}

export interface BankInformation {
  id: string;
  employee_id: string;
  bank_name: string;
  branch_name: string;
  bank_address: string | null;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentUpload {
  name: string;
  type: string;
  file: File | null;
}

export interface SalaryInformation {
  id: string;
  employee_id: string;
  user_id: string;
  gross_salary: number;
  epf_percentage: number;
  net_pay: number;
  total_deduction: number;
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

