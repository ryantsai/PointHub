import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { keys } from './keys';
import type {
  EmailLogEntry,
  EmailPreview,
  EmailPreviewInput,
  EmailSettings,
  EmailStatus,
  EmailTemplate,
  EmailTemplateKey,
  EmailTestInput,
  EmailTestResult,
  Locale,
  Paged,
} from './types';

/** SMTP status, queue numbers and every template in every language (system admin). */
export function useEmailSettings() {
  return useQuery({
    queryKey: keys.email,
    queryFn: () => api.get<EmailSettings>('/api/admin/email'),
  });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: EmailTemplateKey; locale: Locale; subject: string; body: string }) =>
      api.put<EmailTemplate>(`/api/admin/email/templates/${vars.key}/${vars.locale}`, { subject: vars.subject, body: vars.body }),
    onSuccess: (template) => storeTemplate(qc, template),
  });
}

/** Back to the built-in default text. */
export function useResetEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: EmailTemplateKey; locale: Locale }) =>
      api.delete<EmailTemplate>(`/api/admin/email/templates/${vars.key}/${vars.locale}`),
    onSuccess: (template) => storeTemplate(qc, template),
  });
}

function storeTemplate(qc: QueryClient, template: EmailTemplate) {
  qc.setQueryData<EmailSettings>(
    keys.email,
    (old) =>
      old && {
        ...old,
        templates: old.templates.map((item) => (item.key === template.key && item.locale === template.locale ? template : item)),
      },
  );
}

/** Switches one notification on or off in every language. */
export function useSetEmailTemplateEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: EmailTemplateKey; isEnabled: boolean }) =>
      api.put<EmailSettings>(`/api/admin/email/templates/${vars.key}/enabled`, { isEnabled: vars.isEnabled }),
    onSuccess: (settings) => qc.setQueryData(keys.email, settings),
  });
}

/** Renders a draft with sample values. A draft with an unknown placeholder answers `validation_failed`. */
export function useEmailPreview(input: EmailPreviewInput) {
  return useQuery({
    queryKey: keys.emailPreview(input),
    queryFn: () => api.post<EmailPreview>('/api/admin/email/preview', input),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
    retry: false,
  });
}

/** Sends one message now and reports the SMTP server's answer. */
export function useSendTestEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTestInput) => api.post<EmailTestResult>('/api/admin/email/test', input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.email });
      void qc.invalidateQueries({ queryKey: keys.emailOutbox() });
    },
  });
}

export function useEmailOutbox(status: EmailStatus | null, page: number, pageSize: number) {
  const query = { status, page, pageSize };
  return useQuery({
    queryKey: keys.emailOutbox(query),
    queryFn: () => api.get<Paged<EmailLogEntry>>('/api/admin/email/outbox', query),
    placeholderData: (previous) => previous,
  });
}
