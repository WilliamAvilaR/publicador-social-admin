import { AbstractControl } from '@angular/forms';

/**
 * Obtiene el mensaje de error de un campo del formulario
 */
export function getFieldError(control: AbstractControl | null): string {
  if (!control || !control.errors || !control.touched) {
    return '';
  }

  if (control.errors['required']) {
    return 'Este campo es requerido';
  }

  if (control.errors['email']) {
    return 'El correo electrónico no es válido';
  }

  if (control.errors['minlength']) {
    return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
  }

  if (control.errors['maxlength']) {
    return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
  }

  if (control.errors['pattern']) {
    return 'El formato no es válido';
  }

  return 'Campo inválido';
}
