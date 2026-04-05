
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
  'inline-flex items-center justify-center font-medium rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-900';
  const variants = {
    primary: 'bg-blue-900 text-white border-blue-900 hover:bg-blue-800',
    secondary: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    outline: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
    danger:
    'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}>
      
      {children}
    </button>);

}