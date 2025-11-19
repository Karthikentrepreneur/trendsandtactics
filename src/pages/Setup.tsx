import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { createInitialAdmin } from "@/utils/setupAdmin";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const Setup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const navigate = useNavigate();

  const handleSetup = async () => {
    setIsLoading(true);
    setResult(null);

    const response = await createInitialAdmin();
    setResult(response);

    if (response.success) {
      toast.success("Success", {
        description: response.message,
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } else {
      toast.error("Setup Failed", {
        description: response.message,
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Trends & Tactics Logo" 
          className="w-32 h-32 object-contain mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-900">Trends & Tactics</h1>
      </div>
      
      <Card className="w-full max-w-[450px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Initial Setup</CardTitle>
          <CardDescription className="text-center">
            Create the initial admin account for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Email:</strong> admin@trendsandtactics.in</p>
            <p><strong>Password:</strong> Admin@123</p>
            <p><strong>Role:</strong> Administrator</p>
          </div>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}

          <Button
            onClick={handleSetup}
            className="w-full"
            disabled={isLoading || result?.success}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin Account...
              </>
            ) : result?.success ? (
              "Admin Created - Redirecting..."
            ) : (
              "Create Admin Account"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="w-full"
            disabled={isLoading}
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
