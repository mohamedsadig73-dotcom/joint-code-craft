import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderRTL } from '@/test/render';
import { UnifiedFilterBar } from '@/components/ui/UnifiedFilterBar';

describe('UnifiedFilterBar (RTL)', () => {
  it('يعرض حقل البحث ويستدعي onSearchChange', () => {
    const onSearchChange = vi.fn();
    renderRTL(
      <UnifiedFilterBar search="" onSearchChange={onSearchChange} searchPlaceholder="بحث..." />
    );
    const input = screen.getByPlaceholderText('بحث...');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onSearchChange).toHaveBeenCalledWith('abc');
  });

  it('يظهر الشرائح النشطة ويسمح بإزالتها', () => {
    const onRemove = vi.fn();
    renderRTL(
      <UnifiedFilterBar
        search=""
        onSearchChange={() => {}}
        activeChips={[{ key: 'a', label: 'الحالة: نشط', onRemove }]}
      />
    );
    expect(screen.getByText('الحالة: نشط')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Remove/i));
    expect(onRemove).toHaveBeenCalled();
  });

  it('يعرض زر Reset عند وجود فلاتر نشطة', () => {
    const onReset = vi.fn();
    renderRTL(
      <UnifiedFilterBar
        search="x"
        onSearchChange={() => {}}
        onReset={onReset}
      />
    );
    const reset = screen.getByRole('button', { name: /تصفير|reset/i });
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalled();
  });
});
