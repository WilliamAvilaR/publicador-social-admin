import { FormGroup } from '@angular/forms';

/**
 * Marca todos los campos de un formulario como touched
 */
export function markFormGroupTouched(formGroup: FormGroup): void {
  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    control?.markAsTouched();
    
    if (control instanceof FormGroup) {
      markFormGroupTouched(control);
    }
  });
}

/**
 * Verifica si un campo es inválido y ha sido tocado
 */
export function isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
  const field = formGroup.get(fieldName);
  return !!(field && field.invalid && field.touched);
}
