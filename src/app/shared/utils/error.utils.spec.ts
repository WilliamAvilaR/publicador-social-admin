import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './error.utils';

describe('error.utils', () => {
  it('extrae detail de HttpErrorResponse', () => {
    const err = new HttpErrorResponse({
      error: { detail: 'Detalle API', title: 'T' },
      status: 400,
    });
    expect(extractErrorMessage(err)).toBe('Detalle API');
  });

  it('usa title si no hay detail', () => {
    const err = new HttpErrorResponse({
      error: { title: 'Solo título' },
      status: 400,
    });
    expect(extractErrorMessage(err)).toBe('Solo título');
  });

  it('usa message de Error genérico', () => {
    expect(extractErrorMessage(new Error('fallo local'))).toBe('fallo local');
  });

  it('usa error.message de HttpErrorResponse si el cuerpo no aporta texto', () => {
    const err = new HttpErrorResponse({ error: {}, status: 500, statusText: 'Server Error' });
    expect(extractErrorMessage(err)).toContain('Http failure');
  });

  it('usa message del cuerpo cuando no hay detail ni title', () => {
    const err = new HttpErrorResponse({
      error: { message: 'Solo message en body' },
      status: 422,
    });
    expect(extractErrorMessage(err)).toBe('Solo message en body');
  });

  it('Error con mensaje vacío devuelve texto por defecto', () => {
    expect(extractErrorMessage(new Error(''))).toBe('Ocurrió un error desconocido');
  });
});
