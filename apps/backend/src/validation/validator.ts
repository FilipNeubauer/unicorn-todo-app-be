import type { output, ZodObject, ZodRawShape } from "zod";

interface ValidationSuccess<T> {
  valid: true;
  dtoIn: T;
}

interface ValidationFailure {
  valid: false;
  error: {
    code: string;
    message: string;
    params: {
      invalidTypeKeyMap: Record<string, string>;
      invalidValueKeyMap: Record<string, string>;
      missingKeyMap: Record<string, string>;
    };
  };
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateDtoIn<T extends ZodRawShape>(
  input: Record<string, unknown>,
  schema: ZodObject<T>,
): ValidationResult<output<ZodObject<T>>> {
  const safeInput = input ?? {};

  // Parse with zod
  const result = schema.safeParse(safeInput);

  if (!result.success) {
    const invalidTypeKeyMap: Record<string, string> = {};
    const invalidValueKeyMap: Record<string, string> = {};
    const missingKeyMap: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (
        issue.code === "invalid_type" &&
        issue.message.includes("received undefined")
      ) {
        missingKeyMap[key] = `Key '${key}' is required.`;
      } else if (issue.code === "invalid_type") {
        invalidTypeKeyMap[key] = issue.message;
      } else {
        invalidValueKeyMap[key] = issue.message;
      }
    }

    return {
      valid: false,
      error: {
        code: "invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap },
      },
    };
  }

  return { valid: true, dtoIn: result.data };
}
