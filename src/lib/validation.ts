// Feedback validation engine

interface FeedbackPayload {
    success: boolean;
    steps_completed: string[];
    issues?: Array<{ step: string; severity: string; description: string }>;
    scores: { usability: number; speed: number; clarity: number; reliability?: number };
    notes?: string;
    duration_seconds: number;
    logs?: Array<{ timestamp: string; action: string; result: string; error?: string }>;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function validateFeedback(feedback: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!feedback || typeof feedback !== 'object') {
        return { valid: false, errors: ['Feedback must be a JSON object'], warnings: [] };
    }

    const fb = feedback as Partial<FeedbackPayload>;

    // Required fields
    if (typeof fb.success !== 'boolean') {
        errors.push('Field "success" (boolean) is required');
    }

    if (!Array.isArray(fb.steps_completed) || fb.steps_completed.length === 0) {
        errors.push('Field "steps_completed" must be a non-empty array of strings');
    } else {
        const hasEmpty = fb.steps_completed.some((s) => typeof s !== 'string' || s.trim().length === 0);
        if (hasEmpty) errors.push('All steps in "steps_completed" must be non-empty strings');
    }

    if (!fb.scores || typeof fb.scores !== 'object') {
        errors.push('Field "scores" is required and must be an object');
    } else {
        for (const key of ['usability', 'speed', 'clarity'] as const) {
            const val = fb.scores[key];
            if (typeof val !== 'number' || val < 1 || val > 10) {
                errors.push(`scores.${key} must be an integer between 1 and 10`);
            }
        }
        if (fb.scores.reliability !== undefined) {
            if (typeof fb.scores.reliability !== 'number' || fb.scores.reliability < 1 || fb.scores.reliability > 10) {
                warnings.push('scores.reliability should be between 1 and 10');
            }
        }
    }

    if (typeof fb.duration_seconds !== 'number' || fb.duration_seconds < 1) {
        errors.push('Field "duration_seconds" must be a positive integer');
    }

    // Optional field validations
    if (fb.notes !== undefined) {
        if (typeof fb.notes !== 'string' || fb.notes.trim().length < 10) {
            warnings.push('Field "notes" should have at least 10 characters for useful feedback');
        }
    }

    if (fb.issues !== undefined) {
        if (!Array.isArray(fb.issues)) {
            errors.push('Field "issues" must be an array');
        } else {
            fb.issues.forEach((issue, idx) => {
                if (!issue.step || !issue.severity || !issue.description) {
                    errors.push(`Issue[${idx}] must have step, severity, and description`);
                }
                if (issue.severity && !VALID_SEVERITIES.includes(issue.severity)) {
                    errors.push(`Issue[${idx}].severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
                }
                if (issue.description && issue.description.length < 20) {
                    warnings.push(`Issue[${idx}].description should be at least 20 characters`);
                }
            });
        }
    }

    if (fb.logs !== undefined) {
        if (!Array.isArray(fb.logs)) {
            warnings.push('Field "logs" should be an array of log entries');
        } else {
            fb.logs.forEach((log, idx) => {
                if (!log.timestamp || !log.action || !log.result) {
                    warnings.push(`Log[${idx}] should have timestamp, action, and result`);
                }
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// Check for duplicate/copy-paste feedback patterns
export function checkSuspiciousFeedback(feedback: FeedbackPayload): string[] {
    const flags: string[] = [];

    // Very short completion time
    if (feedback.duration_seconds < 5) {
        flags.push('Suspiciously fast completion time (<5 seconds)');
    }

    // All perfect scores
    const scores = Object.values(feedback.scores);
    if (scores.every((s) => s === 10)) {
        flags.push('All scores are perfect 10 — may indicate low-effort submission');
    }

    // Notes are suspiciously short or generic
    if (feedback.notes && feedback.notes.length < 20) {
        flags.push('Notes are very short — may indicate low-effort submission');
    }

    return flags;
}
