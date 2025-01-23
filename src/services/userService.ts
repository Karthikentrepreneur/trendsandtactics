import { supabase } from "@/integrations/supabase/client";
import { UserFormData } from "@/types/user";

// Fetch all users
export const fetchUsers = async () => {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data;
};

// Create a new user
export const createUser = async (userData: UserFormData) => {
  try {
    // First create the user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          role: userData.role,
        },
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("User already registered")) {
        throw new Error("User with this email already exists");
      }
      throw authError;
    }

    if (authData.user) {
      // Then create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          employee_id: userData.employeeId,
          designation: userData.designation,
          role: userData.role,
        });

      if (profileError) throw profileError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId: string) => {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
};