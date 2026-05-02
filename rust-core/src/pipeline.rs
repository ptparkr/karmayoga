use crate::area_balance::area_balance_by_areas;
use crate::momentum::momentum_time_series;
use crate::peak_hours::peak_hours_grid;
use crate::regression::linear_regression;
use crate::sleep_correlation::sleep_focus_correlation;
use crate::types::{AnalyticsRequest, AnalyticsResponse};
use crate::weekly_report::build_weekly_report;

pub fn run_analytics(request: &AnalyticsRequest) -> AnalyticsResponse {
    let momentum = momentum_time_series(&request.sessions);
    let peak_hours = peak_hours_grid(&request.sessions);
    let area_balance = area_balance_by_areas(&request.sessions, &request.areas, request.weeks);
    let sleep_focus_data = sleep_focus_correlation(&request.sessions, &request.checkins);
    let sleep_focus_regression = linear_regression(&sleep_focus_data);
    let weekly_report = build_weekly_report(
        &request.sessions,
        &request.checkins,
        &request.habits,
        &request.habit_entries,
        &request.wheel_axes,
    );

    AnalyticsResponse {
        momentum,
        peak_hours,
        area_balance,
        sleep_focus_data,
        sleep_focus_regression,
        weekly_report,
    }
}
