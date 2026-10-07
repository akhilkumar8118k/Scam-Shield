export interface User {
    id: string;
    email: string;
    display_name: string;
    preferred_language: string;
    created_at: string;
}
export interface AuthSession {
    id: string;
    user_id: string;
    session_token: string;
    expires_at: string;
    revoked: boolean;
}
export type CaseInputType = 'message' | 'email' | 'url';
export type CaseStatus = 'pending' | 'analyzed' | 'archived';
export interface Case {
    id: string;
    user_id: string;
    title: string;
    input_type: CaseInputType;
    submitted_content: string;
    user_notes?: string;
    status: CaseStatus;
    created_at: string;
    updated_at: string;
}
export type AnalysisAssessment = 'high_concern' | 'some_concerns' | 'few_signals_detected' | 'insufficient_evidence';
export interface SuspiciousFinding {
    quote: string;
    reason: string;
    source: string;
}
export interface ReassuringSignal {
    quote: string;
    reason: string;
}
export interface Analysis {
    id: string;
    case_id: string;
    user_id: string;
    content_snapshot: string;
    assessment: AnalysisAssessment;
    summary: string;
    suspicious_findings: SuspiciousFinding[];
    reassuring_signals: ReassuringSignal[];
    unknowns?: string;
    recommended_steps: string[];
    likely_category?: string;
    analysis_language: string;
    is_outdated: boolean;
    created_at: string;
}
//# sourceMappingURL=index.d.ts.map