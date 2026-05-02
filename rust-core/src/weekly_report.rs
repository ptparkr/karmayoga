use crate::date::{
    date_key_from_raw, parse_date, round1, round2, today_local_date, week_start_sunday,
};
use crate::momentum::momentum_time_series;
use crate::types::{
    HabitEntryInput, HabitInput, HealthCheckinInput, LongestStreak, LowestWheelAxis, SessionInput,
    WeeklyReportData, WheelAxisInput,
};
use chrono::{Datelike, Duration};
use std::collections::{BTreeMap, BTreeSet, HashSet};

fn wheel_balance_score(wheel_axes: &[WheelAxisInput]) -> i64 {
    if wheel_axes.is_empty() {
        return 50;
    }

    let scores: Vec<f64> = wheel_axes.iter().map(|axis| axis.current_score).collect();
    let mean = scores.iter().sum::<f64>() / scores.len() as f64;
    let variance = scores
        .iter()
        .map(|score| {
            let diff = score - mean;
            diff * diff
        })
        .sum::<f64>()
        / scores.len() as f64;
    let std_dev = variance.sqrt();

    (100.0 - std_dev * 10.0).round().max(0.0) as i64
}

fn wheel_label(axis_id: &str) -> String {
    match axis_id {
        "body" => "Body",
        "mind" => "Mind",
        "soul" => "Soul",
        "growth" => "Growth",
        "money" => "Money",
        "mission" => "Mission",
        "romance" => "Romance",
        "family" => "Family",
        "friends" => "Friends",
        "joy" => "Joy",
        _ => axis_id,
    }
    .to_string()
}

fn average(values: &[Option<f64>]) -> Option<f64> {
    let concrete: Vec<f64> = values.iter().flatten().copied().collect();
    if concrete.is_empty() {
        return None;
    }
    Some(concrete.iter().sum::<f64>() / concrete.len() as f64)
}

pub fn build_weekly_report(
    sessions: &[SessionInput],
    checkins: &[HealthCheckinInput],
    habits: &[HabitInput],
    habit_entries: &[HabitEntryInput],
    wheel_axes: &[WheelAxisInput],
) -> WeeklyReportData {
    let today = today_local_date();
    let week_start = week_start_sunday(today, 0);
    let week_end = week_start + Duration::days(6);
    let week_start_str = week_start.format("%Y-%m-%d").to_string();
    let week_end_str = week_end.format("%Y-%m-%d").to_string();

    let week_sessions: Vec<SessionInput> = sessions
        .iter()
        .filter(|session| {
            let Some(date_key) = date_key_from_raw(&session.created_at) else {
                return false;
            };
            date_key >= week_start_str && date_key <= week_end_str
        })
        .cloned()
        .collect();

    let completed_sessions: Vec<SessionInput> = week_sessions
        .iter()
        .filter(|session| session.completed_flag())
        .cloned()
        .collect();

    let total_focus_minutes = week_sessions
        .iter()
        .map(|session| session.focus_min)
        .sum::<i64>();

    let completion_rate = if week_sessions.is_empty() {
        0.0
    } else {
        completed_sessions.len() as f64 / week_sessions.len() as f64
    };

    let quality_values: Vec<f64> = completed_sessions
        .iter()
        .filter_map(|session| session.quality)
        .collect();
    let avg_quality = if quality_values.is_empty() {
        None
    } else {
        Some(quality_values.iter().sum::<f64>() / quality_values.len() as f64)
    };

    let mut focus_by_area: BTreeMap<String, i64> = BTreeMap::new();
    for session in &week_sessions {
        let area = session.area_or_other();
        let existing = focus_by_area.get(&area).copied().unwrap_or(0);
        focus_by_area.insert(area, existing + session.focus_min);
    }

    let top_focus_area = focus_by_area
        .iter()
        .max_by(|left, right| left.1.cmp(right.1))
        .map(|(area, _)| area.clone());

    let completion_lookup: HashSet<String> = habit_entries
        .iter()
        .filter(|entry| entry.completed)
        .map(|entry| format!("{}:{}", entry.habit_id, entry.date))
        .collect();

    let area_ids: BTreeSet<String> = habits.iter().map(|habit| habit.area.clone()).collect();
    let mut habit_area_rates: BTreeMap<String, f64> = BTreeMap::new();
    let mut total_scheduled = 0usize;
    let mut total_completed = 0usize;

    for area_id in area_ids {
        let mut area_scheduled = 0usize;
        let mut area_completed = 0usize;

        for day_index in 0..7 {
            let day = week_start + Duration::days(day_index);
            let day_of_week = day.weekday().num_days_from_sunday();
            let date_str = day.format("%Y-%m-%d").to_string();

            for habit in habits.iter().filter(|habit| habit.area == area_id) {
                if !habit.target_days.contains(&day_of_week) {
                    continue;
                }

                area_scheduled += 1;
                total_scheduled += 1;

                if completion_lookup.contains(&format!("{}:{}", habit.id, date_str)) {
                    area_completed += 1;
                    total_completed += 1;
                }
            }
        }

        let area_rate = if area_scheduled == 0 {
            0.0
        } else {
            round2(area_completed as f64 / area_scheduled as f64)
        };

        habit_area_rates.insert(area_id, area_rate);
    }

    let habit_completion_rate = if total_scheduled == 0 {
        0.0
    } else {
        total_completed as f64 / total_scheduled as f64
    };

    let mut longest_streak: Option<LongestStreak> = None;

    for habit in habits {
        let mut dates: Vec<String> = habit_entries
            .iter()
            .filter(|entry| entry.habit_id == habit.id && entry.completed)
            .map(|entry| entry.date.clone())
            .collect();

        if dates.is_empty() {
            continue;
        }

        dates.sort();
        dates.dedup();

        let mut streak = 1i64;
        let mut current = 1i64;

        for index in 1..dates.len() {
            let Some(previous_date) = parse_date(&dates[index - 1]) else {
                current = 1;
                continue;
            };
            let Some(current_date) = parse_date(&dates[index]) else {
                current = 1;
                continue;
            };

            let diff = current_date.signed_duration_since(previous_date).num_days();
            if diff == 1 {
                current += 1;
                if current > streak {
                    streak = current;
                }
            } else {
                current = 1;
            }
        }

        let candidate = LongestStreak {
            name: habit.name.clone(),
            days: streak,
        };

        if longest_streak
            .as_ref()
            .map(|existing| candidate.days > existing.days)
            .unwrap_or(true)
        {
            longest_streak = Some(candidate);
        }
    }

    let week_checkins: Vec<&HealthCheckinInput> = checkins
        .iter()
        .filter(|checkin| checkin.date >= week_start_str)
        .collect();

    let sleep_avg = average(
        &week_checkins
            .iter()
            .map(|checkin| checkin.sleep_hours)
            .collect::<Vec<Option<f64>>>(),
    );
    let hrv_avg = average(
        &week_checkins
            .iter()
            .map(|checkin| checkin.hrv)
            .collect::<Vec<Option<f64>>>(),
    );
    let energy_avg = average(
        &week_checkins
            .iter()
            .map(|checkin| checkin.energy_level)
            .collect::<Vec<Option<f64>>>(),
    );
    let mood_avg = average(
        &week_checkins
            .iter()
            .map(|checkin| checkin.mood_score)
            .collect::<Vec<Option<f64>>>(),
    );

    let wheel_balance = wheel_balance_score(wheel_axes);
    let lowest_wheel_axis = wheel_axes
        .iter()
        .min_by(|left, right| left.current_score.total_cmp(&right.current_score))
        .map(|axis| LowestWheelAxis {
            id: axis.id.clone(),
            label: wheel_label(&axis.id),
            score: axis.current_score,
        });

    let momentum = momentum_time_series(sessions);
    let week_momentum: Vec<i64> = momentum
        .iter()
        .filter(|point| point.date >= week_start_str)
        .map(|point| point.score)
        .collect();
    let momentum_score = if week_momentum.is_empty() {
        0
    } else {
        (week_momentum.iter().sum::<i64>() as f64 / week_momentum.len() as f64).round() as i64
    };

    let mut recommendations: Vec<String> = Vec::new();

    if completion_rate < 0.7 {
        recommendations.push(format!(
            "Session completion was {}%. Switch to 25-min blocks to rebuild consistency.",
            (completion_rate * 100.0).round() as i64
        ));
    }

    let focus_areas = ["health", "learning", "social", "finance", "recovery"];
    if let Some(top_area) = &top_focus_area {
        if !focus_areas.contains(&top_area.as_str()) {
            recommendations.push(format!(
                "Focus on \"{}\" - consider adding more variety.",
                top_area
            ));
        }
    }

    if let Some(value) = sleep_avg {
        if value < 7.0 {
            recommendations.push(format!(
                "Average sleep was {:.1} hrs - below the 7-hr threshold for optimal focus.",
                value
            ));
        }
    }

    if habit_completion_rate < 0.6 {
        recommendations.push(format!(
            "Overall habit completion was {}%. Consider dropping 1-2 low-impact habits.",
            (habit_completion_rate * 100.0).round() as i64
        ));
    }

    let mut underperforming_habits: Vec<String> = Vec::new();

    for habit in habits {
        let relevant_entries = habit_entries
            .iter()
            .filter(|entry| {
                entry.habit_id == habit.id && entry.completed && entry.date >= week_start_str
            })
            .count();

        let scheduled_count = (0..7)
            .filter(|day_index| {
                let day = week_start + Duration::days(*day_index);
                let weekday = day.weekday().num_days_from_sunday();
                habit.target_days.contains(&weekday)
            })
            .count();

        if scheduled_count > 0 && (relevant_entries as f64 / scheduled_count as f64) < 0.4 {
            underperforming_habits.push(habit.name.clone());
        }
    }

    if !underperforming_habits.is_empty() {
        recommendations.push(format!(
            "Habit friction detected: \"{}\" were often missed. Try a smaller version of these.",
            underperforming_habits
                .iter()
                .take(2)
                .cloned()
                .collect::<Vec<String>>()
                .join(", ")
        ));
    }

    if let Some(axis) = &lowest_wheel_axis {
        if axis.score < 4.0 {
            recommendations.push(format!(
                "\"{}\" is your lowest wheel axis ({}/10). One intentional action this week can move it.",
                axis.label,
                axis.score
            ));
        }
    }

    if recommendations.is_empty() {
        recommendations
            .push("Excellent week. Raise your lowest wheel axis by 1 point next week.".to_string());
    }

    while recommendations.len() < 3 {
        recommendations.push("Log HRV and mood daily to unlock deeper correlations.".to_string());
    }

    WeeklyReportData {
        week_start: week_start_str,
        week_end: week_end_str,
        total_focus_minutes,
        focus_by_area,
        completed_sessions: completed_sessions.len(),
        completion_rate: round2(completion_rate),
        avg_quality: avg_quality.map(round1),
        top_focus_area,
        habit_completion_rate: round2(habit_completion_rate),
        habit_area_rates,
        longest_current_streak: longest_streak,
        sleep_avg: sleep_avg.map(round1),
        hrv_avg: hrv_avg.map(|value| value.round()),
        energy_avg: energy_avg.map(round1),
        mood_avg: mood_avg.map(round1),
        wheel_balance_score: wheel_balance,
        lowest_wheel_axis,
        momentum_score,
        recommendations: recommendations.into_iter().take(5).collect(),
    }
}
