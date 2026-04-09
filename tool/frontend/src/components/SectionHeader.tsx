import { Plus } from 'lucide-react';
import { Button } from './Button';

interface SectionHeaderProps {
  title: string;
  onAdd: () => void;
}

export function SectionHeader({ title, onAdd }: SectionHeaderProps) {
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3">
      <div className="font-semibold text-xs uppercase tracking-wider text-gray-500">{title} List</div>
      <Button onClick={onAdd} size="sm" className="flex items-center gap-2 whitespace-nowrap">
        <Plus className="w-4 h-4" /> New {title}
      </Button>
    </div>
  );
}
