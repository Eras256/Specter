/** Centralized, validated environment access for the decision API. */
export const env = {
  port: Number(process.env.SPECTER_PORT ?? process.env.PORT ?? 8080),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  detectorModel: process.env.DETECTOR_MODEL ?? 'claude-haiku-4-5',
  supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.RESEND_FROM ?? 'Specter <onboarding@resend.dev>',
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

export const isLlmEnabled = (): boolean => env.anthropicApiKey.length > 0;
