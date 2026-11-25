export type ContactField = 'name' | 'email' | 'message';

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

export type ContactValidation =
  | { kind: 'valid'; value: ContactMessage }
  | { kind: 'invalid'; errors: Partial<Record<ContactField, string>> }
  /** The honeypot was filled in: drop the message quietly. */
  | { kind: 'spam' };

const NAME_MAX = 100;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
// One @, something on each side, a dot in the domain, no spaces. Deliberately simple: the real
// check is whether a reply arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the contact form. Error messages are shown to visitors as is. */
export function validateContact(
  input: ContactMessage & { botcheck?: string | undefined },
): ContactValidation {
  if (input.botcheck) return { kind: 'spam' };

  const value = {
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
  };
  const errors: Partial<Record<ContactField, string>> = {};

  if (!value.name) errors.name = 'Please enter your name.';
  else if (value.name.length > NAME_MAX) errors.name = 'Please keep your name under 100 characters.';

  if (!value.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL.test(value.email)) {
    errors.email = 'Please enter a valid email address, like name@example.com.';
  }

  if (!value.message) errors.message = 'Please write a message.';
  else if (value.message.length < MESSAGE_MIN) errors.message = 'Please write at least 10 characters.';
  else if (value.message.length > MESSAGE_MAX) {
    errors.message = 'Please keep your message under 5000 characters.';
  }

  return Object.keys(errors).length > 0 ? { kind: 'invalid', errors } : { kind: 'valid', value };
}
