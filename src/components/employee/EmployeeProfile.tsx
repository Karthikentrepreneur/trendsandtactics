import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

const EmployeeProfile = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    profilePhoto: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // TODO: Implement new profile fetching logic
        // Placeholder data
        setProfile({
          name: "",
          email: "",
          employeeId: "",
          designation: "",
          profilePhoto: "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to fetch profile details",
          variant: "destructive",
        });
      }
    };

    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // TODO: Implement new photo upload logic
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profilePhoto} />
                <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer"
              >
                <Upload className="h-4 w-4 text-primary-foreground" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </div>
          <div className="grid gap-4">
            <div>
              <Input
                value={profile.name}
                placeholder="Name"
                disabled
              />
            </div>
            <div>
              <Input
                value={profile.email}
                placeholder="Email"
                type="email"
                disabled
              />
            </div>
            <div>
              <Input
                value={profile.designation}
                placeholder="Designation"
                disabled
              />
            </div>
            <div>
              <Input 
                value={profile.employeeId} 
                placeholder="Employee ID" 
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfile;
