import { useEffect, useState } from 'react';
import { buildTargetSlots, getCountdownParts } from '../../lib/dashboard';
import type { Target, TargetDraft } from '../../types';

interface Props {
  targets: Target[];
  addTarget: (draft: TargetDraft) => void;
  updateTarget: (id: string, draft: TargetDraft) => void;
  removeTarget: (id: string) => void;
  completeTarget: (id: string) => void;
  setPrimary: (id: string) => void;
}

const TARGET_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6'];

const EMPTY_DRAFT: TargetDraft = {
  title: '',
  deadline: '',
  description: '',
  color: TARGET_COLORS[0],
  isPrimary: true,
};

export function TargetsPanel(props: Props) {
  const { primary, secondary, completed, activeCount } = buildTargetSlots(props.targets);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_DRAFT);

  useEffect(() => {
    const handle = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, isPrimary: activeCount === 0 });
    setIsFormOpen(true);
  };

  const startEdit = (target: Target) => {
    setEditingId(target.id);
    setDraft({
      title: target.title,
      deadline: target.deadline.slice(0, 16),
      description: target.description ?? '',
      color: target.color,
      isPrimary: target.isPrimary,
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.deadline) return;

    if (editingId) {
      props.updateTarget(editingId, draft);
    } else {
      props.addTarget(draft);
    }

    resetForm();
  };

  return (
    <div className="card dashboard-card dashboard-targets-card">
      <div className="dashboard-card-header">
        <div>
          <div className="card-title">Targets Panel</div>
          <p className="dashboard-card-subtitle">One primary countdown and two supporting deadlines.</p>
        </div>
        <button type="button" className="btn btn-ghost dashboard-inline-button" onClick={startCreate}>
          Add target
        </button>
      </div>

      {isFormOpen && (
        <form className="target-form" onSubmit={handleSubmit}>
          <input
            className="input target-input"
            placeholder="Target title"
            value={draft.title}
            onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
          />
          <input
            className="input target-input"
            type="datetime-local"
            value={draft.deadline}
            onChange={event => setDraft(current => ({ ...current, deadline: event.target.value }))}
          />
          <textarea
            className="input target-input target-textarea"
            placeholder="Optional description"
            value={draft.description}
            onChange={event => setDraft(current => ({ ...current, description: event.target.value }))}
          />
          <div className="target-form-row">
            <div className="target-color-palette">
              {TARGET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`target-color-swatch ${draft.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setDraft(current => ({ ...current, color }))}
                />
              ))}
            </div>
            <label className="target-primary-toggle">
              <input
                type="checkbox"
                checked={draft.isPrimary}
                onChange={event => setDraft(current => ({ ...current, isPrimary: event.target.checked }))}
              />
              <span>Primary</span>
            </label>
          </div>
          <div className="target-form-actions">
            <button type="submit" className="btn btn-primary dashboard-inline-button">
              {editingId ? 'Save' : 'Create'}
            </button>
            <button type="button" className="btn btn-ghost dashboard-inline-button" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="targets-grid">
        {primary ? (
          <TargetCard
            target={primary}
            nowMs={nowMs}
            size="large"
            onEdit={startEdit}
            onDelete={props.removeTarget}
            onComplete={props.completeTarget}
            onPrimary={props.setPrimary}
          />
        ) : (
          <button type="button" className="target-placeholder primary" onClick={startCreate}>
            Add your first active target
          </button>
        )}

        <div className="targets-secondary-column">
          {[0, 1].map(index => {
            const target = secondary[index];
            return target ? (
              <TargetCard
                key={target.id}
                target={target}
                nowMs={nowMs}
                size="small"
                onEdit={startEdit}
                onDelete={props.removeTarget}
                onComplete={props.completeTarget}
                onPrimary={props.setPrimary}
              />
            ) : (
              <button key={`empty-${index}`} type="button" className="target-placeholder" onClick={startCreate}>
                Add target
              </button>
            );
          })}
        </div>
      </div>

      {completed.length > 0 && (
        <div className="target-completed-list">
          <span className="target-completed-heading">Done recently</span>
          {completed.map(target => (
            <div key={target.id} className="target-completed-item">
              <span className="target-completed-dot" style={{ background: target.color }} />
              <span>{target.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TargetCardProps {
  target: Target;
  nowMs: number;
  size: 'large' | 'small';
  onEdit: (target: Target) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onPrimary: (id: string) => void;
}

function TargetCard({ target, nowMs, size, onEdit, onDelete, onComplete, onPrimary }: TargetCardProps) {
  const countdown = getCountdownParts(target.deadline, nowMs);
  const label = `${String(countdown.days).padStart(2, '0')}d ${String(countdown.hours).padStart(2, '0')}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s`;
  const completedLabel = target.completed ? 'Reached' : countdown.expired ? 'Due now' : 'Live';

  return (
    <article
      className={`target-card ${size}`}
      style={{
        borderColor: `${target.color}55`,
        background: `linear-gradient(160deg, ${target.color}22, rgba(10, 16, 30, 0.92))`,
        boxShadow: `0 0 30px ${target.color}18`,
      }}
    >
      <div className="target-card-top">
        <span className="target-badge" style={{ color: target.color, borderColor: `${target.color}40`, background: `${target.color}18` }}>
          {completedLabel}
        </span>
        <div className="target-card-actions">
          {!target.isPrimary && !target.completed && (
            <button type="button" className="target-action" onClick={() => onPrimary(target.id)}>
              Primary
            </button>
          )}
          <button type="button" className="target-action" onClick={() => onEdit(target)}>
            Edit
          </button>
          <button type="button" className="target-action danger" onClick={() => onDelete(target.id)}>
            Delete
          </button>
        </div>
      </div>

      <div className="target-card-title" style={{ color: target.color }}>{target.title}</div>
      {target.description ? <p className="target-card-description">{target.description}</p> : null}
      <div className={`target-countdown ${size}`}>{label}</div>
      <div className="target-deadline">{new Date(target.deadline).toLocaleString()}</div>

      {!target.completed && (
        <button type="button" className="btn btn-primary dashboard-inline-button target-complete-button" onClick={() => onComplete(target.id)}>
          Mark complete
        </button>
      )}
    </article>
  );
}
