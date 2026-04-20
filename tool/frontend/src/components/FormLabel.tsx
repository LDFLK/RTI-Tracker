interface FormLabelProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
}

export function FormLabel({ label, required, htmlFor }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-0.5"
    >
      {label}
      {required && (
        <sup className="text-[11px] text-red-500 font-bold">*</sup>
      )}
    </label>
  );
}
