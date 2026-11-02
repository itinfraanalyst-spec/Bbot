import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MermaidDiagram } from '../MermaidDiagram';



describe('MermaidDiagram component', () => {
  const sampleCode = `
graph TD
    Customer[Customer] -->|Order| OrderClothes((Order clothes))
    OrderClothes -->|Bill| Customer
    OrderClothes -->|Order| ClothesStore[Clothes Store]
`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Mermaid SVG when valid code is provided', async () => {
    render(<MermaidDiagram code={sampleCode} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
    });
    expect(screen.getByText(/Process & Workflow Flowchart|Data Flow Diagram/i)).toBeInTheDocument();
  }, 30000);

  it('allows toggling between Diagram and Syntax modes', async () => {
    const user = userEvent.setup();
    render(<MermaidDiagram code={sampleCode} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
    });

    const syntaxBtn = screen.getByRole('button', { name: 'Syntax' });
    await user.click(syntaxBtn);

    expect(screen.getByText(/Customer\[Customer\]/)).toBeInTheDocument();

    const diagramBtn = screen.getByRole('button', { name: 'Diagram' });
    await user.click(diagramBtn);

    expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
  });

  it('allows copying diagram source code', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<MermaidDiagram code={sampleCode} />);
    const copyBtn = screen.getByTitle('Copy diagram source');
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(sampleCode);
  });
});
