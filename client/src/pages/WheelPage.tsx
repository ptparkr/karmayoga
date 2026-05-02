import { useState } from 'react';
import { WheelOfLife } from '../components/WheelOfLife';
import { useWheel } from '../hooks/useWheel';
import { useAreaColors } from '../hooks/useAreaColors';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBanner } from '../components/ui/StatusBanner';

export function WheelPage() {
  const { axes, snapshots, loading, error, updateAxis, takeSnapshot, getBalanceScore, getGroupScores, refresh } = useWheel();
  const { getColor } = useAreaColors();
  const [editable, setEditable] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const balanceScore = getBalanceScore();
  const groupScores = getGroupScores();

  const handleAxisChange = (id: string, value: number, type: 'current' | 'target') => {
    updateAxis(id as any, value, type);
  };

  const handleSnapshot = async () => {
    await takeSnapshot();
    refresh();
  };

  if (loading) {
    return (
      <div className="page-shell wheel-page">
        <div className="wheel-loading">
          <div className="wheel-spinner" />
          <p>Loading your Wheel of Life...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell wheel-page">
        <StatusBanner
          tone="danger"
          message={`Error: ${error}`}
          actions={<button onClick={() => refresh()} className="status-action">Retry</button>}
        />
      </div>
    );
  }

  const recentSnapshots = snapshots.slice(-12);

  return (
    <div className="page-shell wheel-page">
      <PageHeader
        title="Wheel of Life"
        subtitle="Balance your life across 10 key dimensions."
        actions={(
          <div className="wheel-header-actions">
            <button
              onClick={() => setEditable(!editable)}
              className={`btn btn-ghost ${editable ? 'active' : ''}`}
            >
              {editable ? 'Done Editing' : 'Edit'}
            </button>
            <button onClick={handleSnapshot} className="btn btn-primary">
              Take Snapshot
            </button>
          </div>
        )}
      />

      <div className="wheel-stats">
        <div className="wheel-stat">
          <span className="wheel-stat-label">Balance Score</span>
          <span className="wheel-stat-value">{balanceScore}</span>
        </div>
        {Object.entries(groupScores).map(([group, score]) => (
          <div key={group} className="wheel-stat">
            <span className="wheel-stat-label">{group}</span>
            <span
              className="wheel-stat-value"
              style={{ color: getColor(group === 'relationships' ? 'romance' : group === 'work' ? 'growth' : group === 'joy' ? 'joy' : 'body') }}
            >
              {score}
            </span>
          </div>
        ))}
      </div>

      <div className={`wheel-layout ${isExpanded ? 'expanded' : ''}`}>
        <section className="wheel-main">
          <WheelOfLife
            axes={axes}
            editable={editable}
            size={isExpanded ? 700 : 560}
            onAxisChange={handleAxisChange}
          />
          
          <button 
            className="wheel-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '-' : '+'}
          </button>
        </section>

        <aside className="wheel-sidebar">
          <div className="wheel-snapshots">
            <h3 className="section-title">Recent Snapshots</h3>
            {recentSnapshots.length === 0 ? (
              <div className="wheel-snapshots-empty">
                <p>No snapshots yet.</p>
                <p className="muted">Take your first snapshot to track progress.</p>
              </div>
            ) : (
              <div className="wheel-snapshot-list">
                {recentSnapshots.map((snapshot) => (
                  <div key={snapshot.date} className="wheel-snapshot-item">
                    <span className="wheel-snapshot-date">
                      {new Date(snapshot.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="wheel-snapshot-sparkline">
                      {Object.values(snapshot.scores).map((score, i) => (
                        <div
                          key={i}
                          className="spark-bar"
                          style={{
                            height: `${(score / 10) * 100}%`,
                            backgroundColor: getColor(Object.keys(snapshot.scores)[i] as any),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wheel-group-legend">
            <h3 className="section-title">Groups</h3>
            <div className="wheel-legend-items">
              {[
                { name: 'Health', axes: ['body', 'mind', 'soul'] },
                { name: 'Work', axes: ['growth', 'money', 'mission'] },
                { name: 'Relationships', axes: ['romance', 'family', 'friends'] },
                { name: 'Joy', axes: ['joy'] },
              ].map((group) => (
                <div key={group.name} className="wheel-legend-group">
                  <span className="legend-group-name">{group.name}</span>
                  <div className="legend-group-axes">
                    {group.axes.map((axis) => (
                      <span
                        key={axis}
                        className="legend-axis-dot"
                        style={{ backgroundColor: getColor(axis as any) }}
                      >
                        {axis.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
