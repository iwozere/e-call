import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvitePanel } from './InvitePanel';

vi.mock('../hooks/useInviteActions', () => ({
  useInviteActions: () => ({
    feedback: null,
    copyManual: false,
    share: vi.fn(),
    copyLink: vi.fn(),
    openSms: vi.fn(),
    openEmail: vi.fn(),
  }),
}));

describe('InvitePanel', () => {
  const data = {
    roomId: 'abc123xyz0',
    roomCode: 'ABC123XYZ0',
    inviteUrl: 'https://example.com/room/abc123xyz0',
    roomMode: 'p2p' as const,
  };

  it('renders nothing when not visible', () => {
    const { container } = render(<InvitePanel data={data} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows room URL and room code when visible', () => {
    const { container } = render(<InvitePanel data={data} visible />);
    const panel = within(container);
    expect(panel.getByRole('textbox', { name: /^room link$/i })).toHaveValue(data.inviteUrl);
    expect(panel.getByText(data.roomCode)).toBeInTheDocument();
  });

  it('always shows Copy link', () => {
    const { container } = render(<InvitePanel data={data} visible />);
    expect(within(container).getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('feedback region is present for screen readers', () => {
    const { container } = render(<InvitePanel data={data} visible />);
    expect(within(container).getByRole('status')).toBeInTheDocument();
  });
});
