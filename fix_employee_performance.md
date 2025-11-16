# Fix Plan

Replace all `.eq("employee_id", employeeId)` with `.eq("user_id", employeeId)` in EmployeePerformance.tsx
Replace all `employee_id` field references with `user_id` in insert/update operations
Remove department and emergency_contact references
Fix month/year string to number conversions
