import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHome from "@/components/admin/AdminHome";
import LeaveRequests from "@/components/admin/LeaveRequests";
import Tasks from "@/components/admin/Tasks";
import TaskChat from "@/components/admin/TaskChat";
import Employees from "@/components/admin/Employees";
import UserManagement from "@/components/admin/UserManagement";
import Announcements from "@/components/admin/Announcements";
import AttendanceTable from "@/components/admin/AttendanceTable";

const AdminDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="px-4 md:px-6 py-16 md:py-6 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<AdminHome />} />
              <Route path="/attendance" element={<AttendanceTable />} />
              <Route path="/leave-requests" element={<LeaveRequests />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/tasks/:taskId/chat" element={<TaskChat />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/announcements" element={<Announcements />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;