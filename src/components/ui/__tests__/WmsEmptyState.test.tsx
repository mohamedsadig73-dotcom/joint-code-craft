import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderRTL } from '@/test/render';
import { WmsEmptyState } from '@/components/ui/WmsEmptyState';

describe('WmsEmptyState (RTL)', () => {
  it('يعرض العنوان والوصف', () => {
    renderRTL(<WmsEmptyState title="لا بيانات" description="ابدأ بالإضافة" />);
    expect(screen.getByText('لا بيانات')).toBeInTheDocument();
    expect(screen.getByText('ابدأ بالإضافة')).toBeInTheDocument();
  });

  it('يعرض زر الإجراء ويستجيب للنقر', () => {
    const onAction = vi.fn();
    renderRTL(
      <WmsEmptyState title="فارغ" actionLabel="إضافة" onAction={onAction} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('لا يعرض زراً بدون onAction', () => {
    renderRTL(<WmsEmptyState title="x" actionLabel="x" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
