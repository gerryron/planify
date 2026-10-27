import { ReactNode } from 'react';
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  ArrowLeftRight,
  PlusCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MenuActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onTransaction?: () => void;
  onTransfer?: () => void;
  canDelete?: boolean;
  transferLabel?: string;
  extraActions?: ReactNode;
}

export default function MenuActions({
  onEdit,
  onTransaction,
  onTransfer,
  onDelete,
  canDelete = true,
  transferLabel = 'Transfer',
  extraActions,
}: MenuActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-2"
      >
        <EllipsisVertical size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil size={16} className="mr-2" />
          Edit
        </DropdownMenuItem>
        {onTransaction && (
          <DropdownMenuItem onClick={onTransaction}>
            <PlusCircle size={16} className="mr-2" />
            Transaction
          </DropdownMenuItem>
        )}
        {onTransfer && (
          <DropdownMenuItem onClick={onTransfer}>
            <ArrowLeftRight size={16} className="mr-2" />
            {transferLabel}
          </DropdownMenuItem>
        )}
        {extraActions}
        {canDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-600 dark:text-red-400 focus:text-red-600"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
