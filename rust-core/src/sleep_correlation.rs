use crate::date::{date_key_from_raw, round1};
use crate::types::{CorrelationPoint, HealthCheckinInput, SessionInput};
use std::collections::BTreeMap;

pub fn sleep_focus_correlation(
    sessions: &[SessionInput],
    checkins: &[HealthCheckinInput],
) -> Vec<CorrelationPoint> {
    let mut sleep_by_date: BTreeMap<String, f64> = BTreeMap::new();
    for checkin in checkins {
        if let Some(value) = checkin.sleep_hours {
            sleep_by_date.insert(checkin.date.clone(), value);
        }
    }

    let mut focus_by_date: BTreeMap<String, (f64, f64, usize)> = BTreeMap::new();
    for session in sessions {
        if !session.completed_flag() {
            continue;
        }
        let Some(date_key) = date_key_from_raw(&session.created_at) else {
            continue;
        };

        let existing = focus_by_date
            .get(&date_key)
            .copied()
            .unwrap_or((0.0, 0.0, 0));
        focus_by_date.insert(
            date_key,
            (
                existing.0 + session.focus_min as f64,
                existing.1 + session.quality.unwrap_or(3.0),
                existing.2 + 1,
            ),
        );
    }

    let mut points: Vec<CorrelationPoint> = Vec::new();
    for (date, sleep_hours) in sleep_by_date {
        let Some((focus_total, quality_total, count)) = focus_by_date.get(&date).copied() else {
            continue;
        };

        if count == 0 {
            continue;
        }

        points.push(CorrelationPoint {
            date,
            sleep_hours,
            avg_focus_minutes: (focus_total / count as f64).round() as i64,
            avg_quality: round1(quality_total / count as f64),
        });
    }

    points
}
