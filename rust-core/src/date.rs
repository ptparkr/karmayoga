use chrono::{
    DateTime, Datelike, Duration, Local, LocalResult, NaiveDate, NaiveDateTime, TimeZone,
};

fn from_local_naive(naive: NaiveDateTime) -> Option<DateTime<Local>> {
    match Local.from_local_datetime(&naive) {
        LocalResult::Single(value) => Some(value),
        LocalResult::Ambiguous(early, _) => Some(early),
        LocalResult::None => None,
    }
}

pub fn parse_datetime_local(raw: &str) -> Option<DateTime<Local>> {
    if raw.trim().is_empty() {
        return None;
    }

    if let Ok(value) = DateTime::parse_from_rfc3339(raw) {
        return Some(value.with_timezone(&Local));
    }

    let datetime_formats = [
        "%Y-%m-%d %H:%M:%S%.f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%.f",
    ];
    for format in datetime_formats {
        if let Ok(value) = NaiveDateTime::parse_from_str(raw, format) {
            if let Some(local_value) = from_local_naive(value) {
                return Some(local_value);
            }
        }
    }

    if let Ok(date_only) = NaiveDate::parse_from_str(raw, "%Y-%m-%d") {
        if let Some(naive) = date_only.and_hms_opt(0, 0, 0) {
            return from_local_naive(naive);
        }
    }

    None
}

pub fn date_key_from_datetime(value: DateTime<Local>) -> String {
    value.format("%Y-%m-%d").to_string()
}

pub fn date_key_from_raw(raw: &str) -> Option<String> {
    if let Some(value) = parse_datetime_local(raw) {
        return Some(date_key_from_datetime(value));
    }

    if raw.len() >= 10 {
        let candidate = &raw[0..10];
        if NaiveDate::parse_from_str(candidate, "%Y-%m-%d").is_ok() {
            return Some(candidate.to_string());
        }
    }

    None
}

pub fn parse_date(raw: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(raw, "%Y-%m-%d").ok()
}

pub fn today_local_date() -> NaiveDate {
    Local::now().date_naive()
}

pub fn week_start_sunday(now: NaiveDate, weeks_ago: i64) -> NaiveDate {
    let days_from_sunday = i64::from(now.weekday().num_days_from_sunday());
    now - Duration::days(days_from_sunday + weeks_ago * 7)
}

pub fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

pub fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

pub fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}
