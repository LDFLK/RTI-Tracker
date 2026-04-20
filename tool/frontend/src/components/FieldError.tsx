interface FieldErrorProps {
  error?: string;
}

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null;
  return (
    <span className="text-[11px] text-red-500 font-medium mt-1">
      {error}
    </span>
  );
}
