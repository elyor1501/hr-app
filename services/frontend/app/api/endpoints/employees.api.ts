import { api } from '../axios';
import { Employee } from '../types/employee.type';
import { ApiError } from '../types/api.error.types';
import { withRetry } from '../utils/retry';

export async function getEmployeeById(id: string): Promise<Employee> {
  return withRetry(async () => {
    try {
      const response = await api.get<Employee>(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Employee not found. Please check the ID.',
        404
      );
    }
  });
}
