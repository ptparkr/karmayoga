import type { ReactNode } from 'react';

type StatusTone = 'default' | 'subtle' | 'danger';

interface StatusBannerProps {
  tone?: StatusTone;
  message: ReactNode;
  actions?: ReactNode;
}

export function StatusBanner({ tone = 'default', message, actions }: StatusBannerProps) {
  const toneClass = tone === 'subtle' ? 'status-banner-subtle' : tone === 'danger' ? 'status-banner-danger' : '';

  return (
    <div className={`status-banner ${toneClass}`.trim()}>
      <span>{message}</span>
      {actions ? <div className="status-banner-actions">{actions}</div> : null}
    </div>
  );
}
