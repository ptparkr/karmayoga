use crate::date::{date_key_from_raw, parse_date, today_local_date, week_start_sunday};
use crate::types::{AreaBalanceData, SessionInput};
use chrono::Duration;
use std::collections::BTreeMap;

pub fn area_balance_by_areas(
    sessions: &[SessionInput],
    areas: &[String],
    weeks: usize,
) -> Vec<AreaBalanceData> {
    let mut output: Vec<AreaBalanceData> = Vec::new();
    let today = today_local_date();

    for week_offset in (0..weeks).rev() {
        let week_start = week_start_sunday(today, week_offset as i64);
        let week_end = week_start + Duration::days(7);

        let mut totals: BTreeMap<String, i64> = BTreeMap::new();
        for area in areas {
            totals.insert(area.clone(), 0);
        }

        for session in sessions {
            if !session.completed_flag() {
                continue;
            }
            let Some(date_key) = date_key_from_raw(&session.created_at) else {
                continue;
            };
            let Some(session_date) = parse_date(&date_key) else {
                continue;
            };

            if session_date < week_start || session_date >= week_end {
                continue;
            }

            let area = session.area_or_other();
            let current = totals.get(&area).copied().unwrap_or(0);
            totals.insert(area, current + session.focus_min);
        }

        output.push(AreaBalanceData {
            week_start: week_start.format("%Y-%m-%d").to_string(),
            data: totals,
        });
    }

    output
}
