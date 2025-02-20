
export interface BankInformation {
  id: string;
  employee_id: string;
  bank_name: string;
  branch_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  bank_address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfessionalExperience {
  id: string;
  employee_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
  responsibilities?: string;
  created_at?: string;
}

export interface DocumentUpload {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface SalaryInformation {
  id: string;
  employee_id: string;
  gross_salary: number;
  epf_percentage?: number;
  net_pay?: number;
  total_deduction?: number;
  created_at?: string;
  updated_at?: string;
}
