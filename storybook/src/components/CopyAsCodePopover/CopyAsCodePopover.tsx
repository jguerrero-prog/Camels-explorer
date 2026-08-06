import { useState } from 'react';
import copyIcon from './assets/copy.svg';
import { tokenizePython } from '../../lib/highlightPython';
import './CopyAsCodePopover.css';

export type CopyAsCodePopoverProps = {
  code: string;
  onClose: () => void;
};

/** Real (Figma node 1076-10's "plot-code-modal") - anchored next to the
 * focused tile via App.tsx's own positioning, not by this component.
 * `code` is real, runnable Python against backend.py's actual function
 * signatures (see App.tsx's generateTileCode) - deliberately NOT the
 * aspirational `camels_viz` API shown in the Figma copy, which doesn't
 * exist anywhere in this codebase (see generateTileCode's own docs for
 * why). Syntax highlighting (2026-08-06) via `tokenizePython` - a small,
 * narrowly-scoped tokenizer for exactly the fixed subset of Python
 * `generateTileCode` emits, not a general-purpose highlighting library
 * pulled in for one small code block. */
export function CopyAsCodePopover({ code, onClose }: CopyAsCodePopoverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="copy-as-code-popover">
      <div className="copy-as-code-popover__pointer" aria-hidden="true" />
      <div className="copy-as-code-popover__header">
        <p className="copy-as-code-popover__title">Plot Code</p>
        <div className="copy-as-code-popover__header-actions">
          <button type="button" className="copy-as-code-popover__copy-btn" onClick={handleCopy} aria-label="Copy code" title="Copy code">
            <img src={copyIcon} alt="" />
          </button>
          <button type="button" className="copy-as-code-popover__close-btn" onClick={onClose} aria-label="Close" title="Close">
            ×
          </button>
        </div>
      </div>
      <pre className="copy-as-code-popover__code-block">
        {tokenizePython(code).map((token, i) =>
          token.type ? (
            <span key={i} className={`copy-as-code-popover__tok--${token.type}`}>
              {token.text}
            </span>
          ) : (
            token.text
          ),
        )}
      </pre>
      {copied && <p className="copy-as-code-popover__copied">Copied</p>}
    </div>
  );
}
