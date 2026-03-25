import { NextResponse } from 'next/server';

const employees = [
  {
    id: '1',
    firstName: 'Arun',
    lastName: 'Kumar',
    email: 'arun@gmail.com',
    department: 'IT',
  },
  {
    id: '2',
    firstName: 'Virat',
    lastName: 'Kohli',
    email: 'virat@gmail.com',
    department: 'Non-IT',
  },
];

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return NextResponse.json(
      { message: 'Employee not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(employee);
}
