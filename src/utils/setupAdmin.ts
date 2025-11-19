import { supabase } from "@/integrations/supabase/client";

export const createInitialAdmin = async () => {
  try {
    // Create admin user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "admin@trendsandtactics.in",
      password: "Admin@123",
      options: {
        data: {
          name: "Admin",
          employee_id: "TT-ADMIN-001",
          role: "admin",
        },
      },
    });

    if (authError) {
      if (authError.message.includes("User already registered")) {
        return { success: false, message: "Admin user already exists" };
      }
      throw authError;
    }

    if (authData.user) {
      // Update profile with designation
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          designation: "Administrator",
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      return { 
        success: true, 
        message: "Admin user created successfully",
        userId: authData.user.id 
      };
    }

    return { success: false, message: "Failed to create admin user" };
  } catch (error) {
    console.error("Error creating admin:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};
