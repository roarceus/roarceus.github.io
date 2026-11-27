import { useRef, useState, type SubmitEvent, type ReactNode } from 'react';

import { button, focusRing } from '@/components/ui/recipes';
import { site } from '@/config/site';
import { contactPayload, sendContact, toSubmitResult, type SubmitResult } from '@/lib/contact/submit';
import { validateContact, type ContactField, type ContactMessage } from '@/lib/contact/validate';

/**
 * The contact manifest (`kubectl apply -f contact.yaml`, ADR 0005): a YAML manifest where only the spec
 * values are inputs. It validates with the plain form's rules and sends to the same Web3Forms endpoint,
 * so the dashboard never leaves the page. Loaded on demand by the detail panel. On the one-screen
 * layout it fills the panel and the message box takes the height left, so the form never pages.
 */

interface Props {
  /** Shown when sending fails, so the visitor can still reach me. Missing until data loads. */
  email: string | undefined;
}

const FIELDS: ContactField[] = ['name', 'email', 'message'];
const EMPTY: ContactMessage = { name: '', email: '', message: '' };
const AUTOCOMPLETE: Record<ContactField, string> = { name: 'name', email: 'email', message: 'off' };

const key = 'text-text-muted';
const inputClass = `min-h-11 w-full min-w-0 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-base text-text aria-invalid:border-status-failed ${focusRing}`;

type Status = SubmitResult | 'spam';

function statusLines(result: Status, email: string | undefined): { text: ReactNode; tone: string }[] {
  switch (result) {
    case 'sent':
    case 'spam':
      return [
        { text: 'contactmessage/sohan created', tone: 'text-status-running' },
        { text: "Thanks, your message is on its way. I'll reply by email.", tone: 'text-text-muted' },
      ];
    case 'invalid':
      return [
        { text: 'Error from server (Invalid): the message was not accepted.', tone: 'text-status-failed' },
        { text: 'Check spec and press Apply again.', tone: 'text-text-muted' },
      ];
    case 'offline':
      return [
        { text: 'Unable to connect to the server: you seem to be offline.', tone: 'text-status-failed' },
        {
          text: "Your message is still here. Press Apply again when you're back online.",
          tone: 'text-text-muted',
        },
      ];
    case 'server-error':
      return [
        {
          text: 'Error from server (InternalError): something went wrong on my end.',
          tone: 'text-status-failed',
        },
        {
          text:
            email === undefined ? (
              'Please press Apply again in a moment.'
            ) : (
              <>
                Press Apply again, or email me at{' '}
                <a href={`mailto:${email}`} className={`link ${focusRing}`}>
                  {email}
                </a>
                .
              </>
            ),
          tone: 'text-text-muted',
        },
      ];
  }
}

export function ContactManifest({ email }: Props) {
  const [values, setValues] = useState<ContactMessage>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const botcheckRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<Partial<Record<ContactField, HTMLInputElement | HTMLTextAreaElement | null>>>(
    {},
  );

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const result = validateContact({ ...values, botcheck: botcheckRef.current?.checked ? 'on' : '' });
    setStatus(undefined);
    if (result.kind === 'invalid') {
      setErrors(result.errors);
      const first = FIELDS.find((name) => result.errors[name] !== undefined);
      if (first) controlsRef.current[first]?.focus();
      return;
    }
    setErrors({});
    if (result.kind === 'spam') {
      setValues(EMPTY);
      setStatus('spam');
      return;
    }
    setSending(true);
    void sendContact(site.contact.endpoint, contactPayload(result.value, site.contact.accessKey)).then(
      (outcome) => {
        const submitted = toSubmitResult(outcome);
        if (submitted === 'sent') setValues(EMPTY);
        setStatus(submitted);
        setSending(false);
      },
    );
  };

  return (
    <form
      aria-label="Contact manifest"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-2 font-mono text-sm desk:h-full"
    >
      <h2 className="font-normal text-text-muted">apply -f contact.yaml</h2>
      <div className="flex flex-col gap-0.5 text-text">
        <p>
          <span className={key}>apiVersion:</span> v1
        </p>
        <p>
          <span className={key}>kind:</span> ContactMessage
        </p>
        <p className={key}>metadata:</p>
        <p className="pl-[2ch]">
          <span className={key}>name:</span> sohan
        </p>
        <p className={key}>spec:</p>
      </div>
      {FIELDS.map((name) => {
        const error = errors[name];
        const id = `contact-manifest-${name}`;
        const props = {
          id,
          name,
          value: values[name],
          autoComplete: AUTOCOMPLETE[name],
          'aria-invalid': error === undefined ? undefined : true,
          'aria-describedby': error === undefined ? undefined : `${id}-error`,
          className: inputClass,
          onChange: (event: { target: { value: string } }) => {
            setValues((current) => ({ ...current, [name]: event.target.value }));
          },
        };
        const message = name === 'message';
        return (
          <div
            key={name}
            className={
              message
                ? 'flex flex-col gap-1 pl-[2ch] desk:min-h-0 desk:flex-1'
                : 'grid grid-cols-[8ch_minmax(0,1fr)] items-center gap-x-2 gap-y-1 pl-[2ch]'
            }
          >
            <label htmlFor={id} className={key}>{`${name}:`}</label>
            {message ? (
              <textarea
                {...props}
                rows={3}
                ref={(element) => {
                  controlsRef.current[name] = element;
                }}
                className={`${inputClass} resize-none desk:min-h-18 desk:flex-1`}
              />
            ) : (
              <input
                {...props}
                type={name === 'email' ? 'email' : 'text'}
                ref={(element) => {
                  controlsRef.current[name] = element;
                }}
              />
            )}
            {error !== undefined && (
              <p id={`${id}-error`} className={`flex flex-col ${message ? '' : 'col-start-2'}`}>
                <span className="text-status-failed">
                  {`error: validation failed: spec.${name}: ${values[name].trim() === '' ? 'Required value' : 'Invalid value'}`}
                </span>
                <span className="font-sans text-text-muted">{error}</span>
              </p>
            )}
          </div>
        );
      })}
      {/* Honeypot: people never see it, bots fill it in. */}
      <input
        ref={botcheckRef}
        type="checkbox"
        name="botcheck"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending} className={`${button('primary')} disabled:opacity-70`}>
          {sending ? 'Applying...' : 'Apply'}
        </button>
      </div>
      <div role="status" className="flex flex-col gap-0.5">
        {status !== undefined &&
          statusLines(status, email).map((line) => (
            <p key={line.tone} className={line.tone}>
              {line.text}
            </p>
          ))}
      </div>
    </form>
  );
}
