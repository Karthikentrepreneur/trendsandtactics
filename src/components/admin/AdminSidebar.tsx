
import { useNavigate, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Users,
  Calendar,
  DollarSign,
  Bell,
  LogOut,
  UserPlus,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { title: "Attendance", path: "/admin/attendance", icon: Calendar },
    { title: "Leave Requests", path: "/admin/leave-requests", icon: ClipboardList },
    { title: "Tasks", path: "/admin/tasks", icon: ClipboardList },
    { title: "Employees", path: "/admin/employees", icon: Users },
    { title: "User Management", path: "/admin/users", icon: UserPlus },
    { title: "Payroll", path: "/admin/payroll", icon: DollarSign },
    { title: "Reports", path: "/admin/reports", icon: FileText },
    { title: "Announcements", path: "/admin/announcements", icon: Bell },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          <SidebarTrigger>
            <Button variant="outline" size="icon" className="bg-white shadow-md hover:bg-gray-100">
              <img src="/logo.png" alt="Company Logo" className="h-4 w-4 object-contain" />
            </Button>
          </SidebarTrigger>
        </div>
      )}
      <Sidebar className="bg-white border-r shadow-md dark:bg-gray-900 dark:border-gray-800 fixed inset-y-0 left-0">
        <SidebarContent className="bg-white dark:bg-gray-900">
          <div className="p-4 border-b dark:border-gray-800 flex items-center gap-3">
            <img src="/logo.png" alt="Company Logo" className="h-8 w-8 object-contain" />
            <h1 className="text-xl font-bold dark:text-white">HR Admin</h1>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 ${
                        location.pathname === item.path 
                          ? "bg-gray-100 dark:bg-gray-800 text-primary" 
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => handleNavigation(item.path)}
                    >
                      <item.icon className={`h-5 w-5 flex-shrink-0 ${
                        location.pathname === item.path 
                          ? "text-primary" 
                          : "text-gray-500 dark:text-gray-400"
                      }`} />
                      <span className="truncate font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="mt-auto p-4 border-t dark:border-gray-800">
            <SidebarMenuButton
              onClick={() => handleNavigation("/login")}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
};

export default AdminSidebar;
