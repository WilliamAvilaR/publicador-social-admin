import { FormBuilder, Validators } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { isFieldInvalid, markFormGroupTouched } from './form.utils';

describe('form.utils', () => {
  const fb = new FormBuilder();

  it('markFormGroupTouched marca controles anidados', () => {
    const inner = fb.group({ x: [''] });
    const form = fb.group({ inner, y: [''] });
    markFormGroupTouched(form);
    expect(form.get('y')?.touched).toBe(true);
    expect(inner.get('x')?.touched).toBe(true);
  });

  it('isFieldInvalid es true si el campo es inválido y touched', () => {
    const form = fb.group({ email: ['', Validators.required] });
    form.get('email')?.markAsTouched();
    expect(isFieldInvalid(form, 'email')).toBe(true);
  });

  it('isFieldInvalid es false si no está tocado', () => {
    const form = fb.group({ email: ['', Validators.required] });
    expect(isFieldInvalid(form, 'email')).toBe(false);
  });
});
