/**
 * Converts an object and an optional file into Multipart FormData.
 */
export const toFormData = (
  fields: Record<string, string | number | boolean | null | undefined>,
  file?: File | Blob
): FormData => {
  const formData = new FormData();

  // Append regular fields
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  // Append file if provided
  if (file) {
    formData.append('file', file);
  }

  return formData;
};
