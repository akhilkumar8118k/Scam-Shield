import { z } from 'zod';
declare const AnalysisSchema: z.ZodObject<{
    assessment: z.ZodEnum<{
        few_signals_detected: "few_signals_detected";
        high_concern: "high_concern";
        insufficient_evidence: "insufficient_evidence";
        some_concerns: "some_concerns";
    }>;
    summary: z.ZodString;
    suspicious_findings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        quote: z.ZodString;
        reason: z.ZodString;
        source: z.ZodLiteral<"AI">;
    }, z.core.$strip>>>;
    reassuring_signals: z.ZodDefault<z.ZodArray<z.ZodObject<{
        quote: z.ZodString;
        reason: z.ZodString;
    }, z.core.$strip>>>;
    unknowns: z.ZodOptional<z.ZodString>;
    recommended_steps: z.ZodDefault<z.ZodArray<z.ZodString>>;
    likely_category: z.ZodOptional<z.ZodString>;
    analysis_language: z.ZodString;
}, z.core.$strip>;
export type StructuredAnalysis = z.infer<typeof AnalysisSchema>;
export declare function analyzeContent(content: string, type: 'message' | 'email' | 'url', language?: string): Promise<StructuredAnalysis | null>;
export declare function runProgrammedChecks(content: string, type: 'message' | 'email' | 'url'): {
    quote: string;
    reason: string;
    source: string;
}[];
export {};
//# sourceMappingURL=gemini.d.ts.map