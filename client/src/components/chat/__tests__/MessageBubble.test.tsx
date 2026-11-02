import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { MessageBubble } from '../MessageBubble';

const renderBubble = (message: Parameters<typeof MessageBubble>[0]['message'], options?: Parameters<typeof MessageBubble>[0]) =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <MessageBubble {...options} message={message} />
      </ThemeProvider>
    </MemoryRouter>
  );

describe('MessageBubble status display', () => {
  it.each([
    { name: 'complete', status: 'complete' as const },
    { name: 'missing status', status: undefined },
  ])('$name messages have no status note', ({ status }) => {
    renderBubble({ id: 'assistant-1', role: 'assistant', content: 'A complete answer', status });

    expect(screen.getByText('A complete answer')).toBeInTheDocument();
    expect(screen.queryByText('Response was cut off')).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't generate a response")).not.toBeInTheDocument();
  });

  it('keeps partial text and shows the aborted note', () => {
    renderBubble({ id: 'assistant-1', role: 'assistant', content: 'Partial answer', status: 'aborted' });

    expect(screen.getByText('Partial answer')).toBeInTheDocument();
    expect(screen.getByText('Response was cut off')).toBeInTheDocument();
  });

  it('shows an error bubble and retries the preceding user text', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();
    const previousUserText = 'Please try that again';

    renderBubble(
      { id: 'assistant-1', role: 'assistant', content: '', status: 'error' },
      {
        onRetry: () => sendMessage(previousUserText),
      }
    );

    expect(screen.getByText("Couldn't generate a response")).toBeInTheDocument();
    expect(screen.queryByText('Response was cut off')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(sendMessage).toHaveBeenCalledWith(previousUserText);
  });

  it('disables Retry while generation is in progress', () => {
    renderBubble(
      { id: 'assistant-1', role: 'assistant', content: '', status: 'error' },
      { onRetry: vi.fn(), isGenerating: true }
    );

    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });

  it('confirms helpful feedback after the save succeeds', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    renderBubble({ id: 'assistant-feedback', role: 'assistant', content: 'Helpful answer' });
    await user.click(screen.getByRole('button', { name: 'Helpful answer' }));

    expect(await screen.findByText('Thanks for your feedback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Helpful answer' })).toHaveAttribute('aria-pressed', 'true');
    vi.unstubAllGlobals();
  });

  it('sends a suggested document action when clicked', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();

    renderBubble(
      { id: 'assistant-1', role: 'assistant', content: 'The document says...', status: 'complete' },
      {
        suggestedPrompts: ['Summarize this document'],
        onSuggestedPrompt: sendMessage,
      }
    );

    await user.click(screen.getByRole('button', { name: 'Summarize this document' }));
    expect(sendMessage).toHaveBeenCalledWith('Summarize this document');
  });

  it('renders Visualize in Studio button and sets session handoff on click', async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderBubble({
      id: 'assistant-viz',
      role: 'assistant',
      content: 'Here is the step-by-step workflow: 1. Ingestion 2. Analysis 3. Deployment',
      status: 'complete',
    });

    const vizButton = screen.getByRole('button', { name: /visualize in studio/i });
    expect(vizButton).toBeInTheDocument();

    await user.click(vizButton);
    expect(setItemSpy).toHaveBeenCalledWith(
      'bbot_studio_handoff',
      expect.stringContaining('Here is the step-by-step workflow')
    );
    setItemSpy.mockRestore();
  });
});