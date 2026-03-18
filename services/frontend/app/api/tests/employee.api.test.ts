import MockAdapter from "axios-mock-adapter";
import { api } from "../axios";
import { getEmployeeById } from "../endpoints/employees.api";
import { ApiError } from "../types/api.error.types";
import { describe, it, expect, afterEach } from "vitest";

const mock = new MockAdapter(api);

describe("getEmployeeById", () => {
  afterEach(() => {
    mock.reset();
  });

  it("returns employee data when API call succeeds", async () => {
    mock.onGet("/employees/1").reply(200, {
      id: "1",
      firstName: "Arun",
      lastName: "Kumar",
      email: "arun@gmail.com",
      department: "IT",
    });

    const employee = await getEmployeeById("1");

    expect(employee.id).toBe("1");
    expect(employee.firstName).toBe("Arun");
  });

  it("throws ApiError with user-friendly message on 404", async () => {
    mock.onGet("/employees/99").reply(404);

    await expect(getEmployeeById("99")).rejects.toBeInstanceOf(ApiError);
    await expect(getEmployeeById("99")).rejects.toThrow("Employee not found");
  });
});
