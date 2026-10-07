import { useEffect, useRef, type ReactNode } from 'react';

export function PreviewDialog({
  children,
  onClose,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="preview-dialog"
      aria-labelledby="complete-preview-title"
      onCancel={onClose}
    >
      <div className="preview-dialog-header">
        <h2 id="complete-preview-title">Complete print preview</h2>
        <button className="secondary-button" type="button" onClick={onClose}>
          Return to editor
        </button>
      </div>
      {children}
    </dialog>
  );
}
