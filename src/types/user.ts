
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
