import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderRTL } from '@/test/render';
import { StandardModal } from '@/components/ui/StandardModal';

function Wrapper({ onSubmit, defaultOpen = true }: { onSubmit: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <StandardModal
      open={open}
      onOpenChange={setOpen}
      title="نافذة تجريبية"
      description="وصف"
      onSubmit={onSubmit}
      submitLabel="حفظ"
      cancelLabel="إلغاء"
    >
      <input data-testid="field" />
    </StandardModal>
  );
}

describe('StandardModal (RTL)', () => {
  it('يعرض العنوان والوصف ويظهر الأزرار', () => {
    renderRTL(<Wrapper onSubmit={() => {}} />);
    expect(screen.getByText('نافذة تجريبية')).toBeInTheDocument();
    expect(screen.getByText('وصف')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
  });

  it('يستدعي onSubmit عند الضغط على حفظ', () => {
    const onSubmit = vi.fn();
    renderRTL(<Wrapper onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('يُغلق عند الضغط على إلغاء', async () => {
    renderRTL(<Wrapper onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => {
      expect(screen.queryByText('نافذة تجريبية')).not.toBeInTheDocument();
    });
  });

  it('يحترم اتجاه RTL على document', () => {
    renderRTL(<Wrapper onSubmit={() => {}} />);
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('submit مُعطّل أثناء submitting', () => {
    renderRTL(
      <StandardModal open onOpenChange={() => {}} title="x" submitting onSubmit={() => {}}>
        <span />
      </StandardModal>
    );
    const btn = screen.getByRole('button', { name: /حفظ|save/i });
    expect(btn).toBeDisabled();
  });
});
