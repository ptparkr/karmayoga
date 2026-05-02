use crate::date::{date_key_from_raw, parse_date, today_local_date};
use crate::types::{MomentumDataPoint, SessionInput};
use chrono::Duration;
use std::collections::BTreeMap;

pub fn momentum_time_series(sessions: &[SessionInput]) -> Vec<MomentumDataPoint> {
    let mut by_day: BTreeMap<String, f64> = BTreeMap::new();

    for session in sessions {
        if !session.completed_flag() {
            continue;
        }

        let Some(date_key) = date_key_from_raw(&session.created_at) else {
            continue;
        };

        let weight = (session.quality.unwrap_or(3.0) / 5.0).max(0.0);
        let weighted = (session.focus_min as f64) * weight;
        let current = by_day.get(&date_key).copied().unwrap_or(0.0);
        by_day.insert(date_key, current + weighted);
    }

    let Some(first_day_key) = by_day.keys().next().cloned() else {
        return Vec::new();
    };

    let Some(start_day) = parse_date(&first_day_key) else {
        return Vec::new();
    };

    let today = today_local_date();
    let end_day = if start_day > today { start_day } else { today };

    let mut filled: Vec<(String, f64)> = Vec::new();
    let mut cursor = start_day;
    while cursor <= end_day {
        let key = cursor.format("%Y-%m-%d").to_string();
        filled.push((key.clone(), by_day.get(&key).copied().unwrap_or(0.0)));
        cursor += Duration::days(1);
    }

    if filled.is_empty() {
        return Vec::new();
    }

    let alpha = 2.0 / 8.0;
    let mut ema = filled[0].1;
    let max_daily = 200.0;

    filled
        .into_iter()
        .map(|(date, raw_minutes)| {
            ema = alpha * raw_minutes + (1.0 - alpha) * ema;
            let score = ((ema / max_daily) * 100.0).round().clamp(0.0, 100.0) as i64;
            MomentumDataPoint {
                date,
                raw_minutes,
                score,
            }
        })
        .collect()
}
