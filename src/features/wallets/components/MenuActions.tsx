import { useEffect, useRef, useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface MenuActionsProps {
  onEdit: () => void;
  onTransfer: () => void;
  onDelete: () => void;
  canDelete: boolean;
  transferLabel: string;
}

export default function MenuActions({
  onEdit,
  onTransfer,
  onDelete,
  canDelete,
  transferLabel,
}: MenuActionsProps) {
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggleMenu = () => {
    if (!open) {
      const triggerRect = containerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const estimatedMenuWidth = 180;
        const viewportPadding = 12;
        const hasLeftOverflowRisk =
          triggerRect.right - estimatedMenuWidth < viewportPadding;
        setMenuAlign(hasLeftOverflowRisk ? 'left' : 'right');
      }
    }

    setOpen((value) => !value);
  };

  return (
    <div
      ref={containerRef}
      className='relative'
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className='p-2 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
        aria-label='Action'
        type='button'
        onClick={handleToggleMenu}
      >
        <MoreVertIcon fontSize='small' />
      </button>
      {open && (
        <div
          className={
            'absolute top-10 z-10 min-w-36 max-w-[calc(100vw-1.5rem)] rounded-md border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md ' +
            (menuAlign === 'left' ? 'left-0' : 'right-0')
          }
        >
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            type='button'
          >
            <EditIcon fontSize='small' />
            Edit
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onTransfer();
            }}
            type='button'
          >
            <SwapHorizIcon fontSize='small' />
            {transferLabel}
          </button>
          {canDelete && (
            <button
              className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              type='button'
            >
              <DeleteIcon fontSize='small' />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
