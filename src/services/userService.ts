
import { supabase } from "@/integrations/supabase/client";
import { UserFormData } from "@/types/user";

// Fetch all users
export const fetchUsers = async () => {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data;
};

// Get user role
export const getUserRole = async (userId: string): Promise<'admin' | 'manager' | 'employee' | null> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  
  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
  
  return data?.role || null;
};

// Create a new user
export const createUser = async (userData: UserFormData) => {
  try {
    // First create the user in auth with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          employee_id: userData.employeeId,
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

    // The trigger will automatically create the profile and user_roles
    // But we can update the profile with additional info
    if (authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          designation: userData.designation,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
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
  try {
    // First check if the current user is an admin
    const { data: currentUser, error: currentUserError } = await supabase.auth.getUser();
    if (currentUserError) throw currentUserError;

    const userRole = await getUserRole(currentUser.user.id);

    if (userRole !== 'admin') {
      throw new Error('Only admin users can delete users');
    }

    // Delete from profiles first - this will work because of our RLS policy
    // This will cascade delete to user_roles as well
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) throw profileError;

    // Then delete from auth using admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn("Unable to delete auth user - requires admin privileges. Profile has been deleted.");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};
