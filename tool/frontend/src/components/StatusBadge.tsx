
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'CREATED' || s === 'DELIVERY' || s === 'APPROVAL' || s === 'IN PROGRESS') {
      return 'bg-blue-50 text-blue-700 border-blue-100';
    }
    if (s === 'ACCEPTED' || s === 'COMPLETED' || s === 'ACKNOWLEDGE') {
      return 'bg-green-50 text-green-700 border-green-100';
    }
    if (s === 'REJECTION') {
      return 'bg-red-50 text-red-700 border-red-100';
    }
    if (s === 'APPEAL') {
      return 'bg-orange-50 text-orange-700 border-orange-100';
    }
    if (s === 'PENDING' || s === 'DRAFT') {
      return 'bg-gray-50 text-gray-700 border-gray-100';
    }
    return 'bg-blue-50 text-blue-700 border-blue-100'; // Default to blue for others
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
}
