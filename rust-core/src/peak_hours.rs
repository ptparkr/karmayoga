use crate::date::{parse_datetime_local, round1};
use crate::types::{PeakHourCell, SessionInput};
use chrono::{Datelike, Timelike};

pub fn peak_hours_grid(sessions: &[SessionInput]) -> Vec<Vec<PeakHourCell>> {
    let mut grid: Vec<Vec<PeakHourCell>> = (0..7)
        .map(|day| {
            (0..24)
                .map(|hour| PeakHourCell {
                    day,
                    hour,
                    avg_minutes: 0,
                    avg_quality: None,
                    session_count: 0,
                })
                .collect()
        })
        .collect();

    for session in sessions {
        if !session.completed_flag() {
            continue;
        }

        let Some(timestamp) = parse_datetime_local(&session.created_at) else {
            continue;
        };

        let day = timestamp.weekday().num_days_from_sunday() as usize;
        let hour = timestamp.hour() as usize;

        let cell = &grid[day][hour];
        let next_count = cell.session_count + 1;

        let new_avg_minutes = ((cell.avg_minutes as f64 * cell.session_count as f64)
            + session.focus_min as f64)
            / next_count as f64;

        let incoming_quality = session.quality.unwrap_or(3.0);
        let new_avg_quality = if let Some(existing_quality) = cell.avg_quality {
            ((existing_quality * cell.session_count as f64) + incoming_quality) / next_count as f64
        } else {
            incoming_quality
        };

        grid[day][hour] = PeakHourCell {
            day: day as u32,
            hour: hour as u32,
            avg_minutes: new_avg_minutes.round() as i64,
            avg_quality: Some(round1(new_avg_quality)),
            session_count: next_count,
        };
    }

    grid
}
