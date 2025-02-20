
export interface ProfessionalExperience {
  id: string;
  employee_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string | null;
  responsibilities: string | null;
  created_at: string | null;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_by: string | null;
  uploaded_at: string | null;
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
  employee_id: string | null;
  gross_salary: number;
  epf_percentage: number | null;
  net_pay: number | null;
  total_deduction: number | null;
  created_at: string | null;
  updated_at: string | null;
}
