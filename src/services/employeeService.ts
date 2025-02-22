import { supabase } from "@/integrations/supabase/client";

export const employeeService = {
  updatePersonalInfo: async (employeeId: string, data: any) => {
    console.log('Updating personal info:', data);
    // Validate date fields
    const formattedData = {
      name: data.name,
      email: data.email,
      designation: data.designation,
      contact_number: data.contact_number,
      emergency_contact: data.emergency_contact,
      fathers_name: data.fathers_name,
      mothers_name: data.mothers_name,
      address: data.address,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : null,
      date_of_joining: data.date_of_joining ? new Date(data.date_of_joining).toISOString().split('T')[0] : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(formattedData)
      .eq('id', employeeId);
    
    if (error) {
      console.error('Error updating personal info:', error);
      throw error;
    }

    // Fetch and return updated data
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (fetchError) throw fetchError;
    return updatedProfile;
  },

  updateBankInfo: async (employeeId: string, data: any) => {
    // First, check if a record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('bank_information')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('bank_information')
        .update({
          bank_name: data.bank_name,
          branch_name: data.branch_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          account_type: data.account_type,
          bank_address: data.bank_address,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId);
      
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('bank_information')
        .insert({
          employee_id: employeeId,
          bank_name: data.bank_name,
          branch_name: data.branch_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          account_type: data.account_type,
          bank_address: data.bank_address,
        });
      
      if (error) throw error;
    }
  },

  updateSalaryInfo: async (employeeId: string, data: any) => {
    // First, check if a record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('salary_information')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('salary_information')
        .update({
          gross_salary: data.gross_salary,
          epf_percentage: data.epf_percentage || 10.00,
          net_pay: data.net_pay,
          total_deduction: data.total_deduction,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId);
      
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('salary_information')
        .insert({
          employee_id: employeeId,
          gross_salary: data.gross_salary,
          epf_percentage: data.epf_percentage || 10.00,
          net_pay: data.net_pay,
          total_deduction: data.total_deduction,
        });
      
      if (error) throw error;
    }
  },

  addExperience: async (employeeId: string, data: any) => {
    // Format dates properly
    const formattedData = {
      ...data,
      start_date: new Date(data.start_date).toISOString().split('T')[0],
      end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null,
    };

    const { error } = await supabase
      .from('professional_experience')
      .insert({
        employee_id: employeeId,
        ...formattedData
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
