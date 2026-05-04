import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderRTL } from '@/test/render';
import { WmsBulkActionsBar } from '@/components/ui/WmsBulkActionsBar';

describe('WmsBulkActionsBar (RTL)', () => {
  it('لا يعرض شيء عندما selectedCount=0', () => {
    const { container } = renderRTL(
      <WmsBulkActionsBar selectedCount={0} onClear={() => {}} actions={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('يعرض العدد والإجراءات عند تحديد عناصر', () => {
    renderRTL(
      <WmsBulkActionsBar
        selectedCount={5}
        totalCount={20}
        onClear={() => {}}
        actions={<button>حذف</button>}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حذف' })).toBeInTheDocument();
  });

  it('يستدعي onClear عند الضغط على ✕', () => {
    const onClear = vi.fn();
    renderRTL(
      <WmsBulkActionsBar selectedCount={3} onClear={onClear} actions={null} />
    );
    const clearBtn = screen.getByLabelText(/إلغاء التحديد|clear/i);
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
