'use client';

import { useState } from 'react';
import { getEmployeeById } from '@/app/api';
import type { Employee } from '@/app/api/types/employee.type';

export default function EmployeesPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setError(null);
    setEmployee(null);
    setLoading(true);

    try {
      const data = await getEmployeeById(employeeId);
      setEmployee(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Search Employee based on Id</h1>

      <input
        type="text"
        placeholder="Enter Employee ID"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      />

      <button onClick={handleSearch}>Search</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {employee && (
        <ul>
          <li><b>ID:</b> {employee.id}</li>
          <li><b>First Name:</b> {employee.firstName}</li>
          <li><b>Last Name:</b> {employee.lastName}</li>
          <li><b>Department:</b> {employee.department}</li>
          <li><b>Email:</b> {employee.email}</li>
        </ul>
      )}
    </div>
  );
}
