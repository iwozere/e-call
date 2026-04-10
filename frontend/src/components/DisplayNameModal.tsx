import { useEffect, useState } from 'react';

export interface DisplayNameModalProps {
  open: boolean;
  initialValue: string;
  onSave: (name: string) => void;
}

export function DisplayNameModal({ open, initialValue, onSave }: DisplayNameModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = value.trim();
    if (n) onSave(n);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dn-title">
      <form className="modal" onSubmit={submit}>
        <h2 id="dn-title">Your name</h2>
        <p className="modal__hint">Others will see this in the call.</p>
        <input
          className="modal__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Display name"
          autoFocus
          maxLength={64}
        />
        <button type="submit" className="modal__submit" disabled={!value.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
