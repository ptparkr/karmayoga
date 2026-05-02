use crate::date::round3;
use crate::types::{CorrelationPoint, RegressionLine};

pub fn linear_regression(points: &[CorrelationPoint]) -> RegressionLine {
    if points.len() < 2 {
        return RegressionLine {
            slope: 0.0,
            intercept: 0.0,
        };
    }

    let n = points.len() as f64;
    let mut sum_x = 0.0;
    let mut sum_y = 0.0;
    let mut sum_xy = 0.0;
    let mut sum_x2 = 0.0;

    for point in points {
        let x = point.sleep_hours;
        let y = point.avg_focus_minutes as f64;
        sum_x += x;
        sum_y += y;
        sum_xy += x * y;
        sum_x2 += x * x;
    }

    let denom = n * sum_x2 - sum_x * sum_x;
    if denom == 0.0 {
        return RegressionLine {
            slope: 0.0,
            intercept: round3(sum_y / n),
        };
    }

    let slope = (n * sum_xy - sum_x * sum_y) / denom;
    let intercept = (sum_y - slope * sum_x) / n;

    RegressionLine {
        slope: round3(slope),
        intercept: round3(intercept),
    }
}
