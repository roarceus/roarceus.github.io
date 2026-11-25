import { describe, expect, it } from 'vitest';

import { validateContact } from './validate';

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there, nice site!' };

describe('validateContact', () => {
  it('accepts a complete message and trims every field', () => {
    expect(
      validateContact({ name: '  Ada  ', email: ' ada@example.com ', message: '  Hello there!  ' }),
    ).toEqual({
      kind: 'valid',
      value: { name: 'Ada', email: 'ada@example.com', message: 'Hello there!' },
    });
  });

  it('reports every empty field at once', () => {
    expect(validateContact({ name: ' ', email: '', message: '' })).toEqual({
      kind: 'invalid',
      errors: {
        name: 'Please enter your name.',
        email: 'Please enter your email address.',
        message: 'Please write a message.',
      },
    });
  });

  it.each(['ada', 'ada@', '@example.com', 'ada@example', 'ada example@x.com', 'a@b@c.com'])(
    'rejects the email %j',
    (email) => {
      expect(validateContact({ ...valid, email })).toEqual({
        kind: 'invalid',
        errors: { email: 'Please enter a valid email address, like name@example.com.' },
      });
    },
  );

  it('enforces message length between 10 and 5000 characters', () => {
    expect(validateContact({ ...valid, message: 'Too short' })).toEqual({
      kind: 'invalid',
      errors: { message: 'Please write at least 10 characters.' },
    });
    expect(validateContact({ ...valid, message: 'x'.repeat(5000) }).kind).toBe('valid');
    expect(validateContact({ ...valid, message: 'x'.repeat(5001) })).toEqual({
      kind: 'invalid',
      errors: { message: 'Please keep your message under 5000 characters.' },
    });
  });

  it('caps the name at 100 characters', () => {
    expect(validateContact({ ...valid, name: 'x'.repeat(101) })).toEqual({
      kind: 'invalid',
      errors: { name: 'Please keep your name under 100 characters.' },
    });
  });

  it('flags a filled honeypot as spam, whatever else is in the form', () => {
    expect(validateContact({ ...valid, botcheck: 'yes' })).toEqual({ kind: 'spam' });
    expect(validateContact({ name: '', email: '', message: '', botcheck: 'on' })).toEqual({
      kind: 'spam',
    });
  });

  it('ignores an empty honeypot', () => {
    expect(validateContact({ ...valid, botcheck: '' }).kind).toBe('valid');
  });
});
