import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { getFieldError } from './validation.utils';

describe('validation.utils', () => {
  it('devuelve vacío si no hay control o no está touched', () => {
    const c = new FormControl('', Validators.required);
    expect(getFieldError(c)).toBe('');
    c.markAsTouched();
    expect(getFieldError(c)).toBeTruthy();
  });

  it('required', () => {
    const c = new FormControl('', Validators.required);
    c.markAsTouched();
    expect(getFieldError(c)).toBe('Este campo es requerido');
  });

  it('email', () => {
    const c = new FormControl('bad', Validators.email);
    c.markAsTouched();
    c.updateValueAndValidity();
    expect(getFieldError(c)).toBe('El correo electrónico no es válido');
  });

  it('minlength y maxlength', () => {
    const min = new FormControl('a', Validators.minLength(3));
    min.markAsTouched();
    expect(getFieldError(min)).toContain('Mínimo 3');

    const max = new FormControl('abcd', Validators.maxLength(2));
    max.markAsTouched();
    expect(getFieldError(max)).toContain('Máximo 2');
  });

  it('pattern', () => {
    const c = new FormControl('x', Validators.pattern(/^[0-9]+$/));
    c.markAsTouched();
    expect(getFieldError(c)).toBe('El formato no es válido');
  });

  it('error desconocido', () => {
    const c = new FormControl('', () => ({ custom: true }));
    c.markAsTouched();
    expect(getFieldError(c)).toBe('Campo inválido');
  });
});
