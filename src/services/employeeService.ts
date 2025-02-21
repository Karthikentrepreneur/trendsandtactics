
import { supabase } from "@/integrations/supabase/client";

export const employeeService = {
  updatePersonalInfo: async (employeeId: string, data: any) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', employeeId);
    
    if (error) throw error;
  },

  updateBankInfo: async (employeeId: string, data: any) => {
    const { error } = await supabase
      .from('bank_information')
      .upsert({
        employee_id: employeeId,
        ...data
      });
    
    if (error) throw error;
  },

  updateSalaryInfo: async (employeeId: string, data: any) => {
    const { error } = await supabase
      .from('salary_information')
      .upsert({
        employee_id: employeeId,
        ...data
      });
    
    if (error) throw error;
  },

  addExperience: async (employeeId: string, data: any) => {
    const { error } = await supabase
      .from('professional_experience')
      .insert({
        employee_id: employeeId,
        ...data
      });
    
    if (error) throw error;
  },

  deleteExperience: async (id: string) => {
    const { error } = await supabase
      .from('professional_experience')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  uploadDocument: async (employeeId: string, file: File, name: string, type: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${employeeId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        document_name: name,
        document_type: type,
        file_path: filePath,
      });

    if (dbError) throw dbError;
  }
};
