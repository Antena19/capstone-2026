import { Component, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonButton, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

addIcons({ eyeOutline, eyeOffOutline });

export function tipoCampoPassword(visible: boolean): 'text' | 'password' {
  return visible ? 'text' : 'password';
}

export function etiquetaOjoPassword(visible: boolean): string {
  return visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
}

@Component({
  selector: 'app-campo-password',
  templateUrl: './campo-password.component.html',
  styleUrls: ['./campo-password.component.scss'],
  imports: [IonInput, IonButton, IonIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoPasswordComponent),
      multi: true,
    },
  ],
})
export class CampoPasswordComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly autocomplete = input('current-password');

  private readonly campo = viewChild<IonInput>('campo');
  readonly visible = signal(false);
  valor = '';
  deshabilitado = false;

  private alCambiar: (valor: string) => void = () => undefined;
  private alTocar: () => void = () => undefined;

  tipo(): 'text' | 'password' {
    return tipoCampoPassword(this.visible());
  }

  etiqueta(): string {
    return etiquetaOjoPassword(this.visible());
  }

  icono(): string {
    return this.visible() ? 'eye-off-outline' : 'eye-outline';
  }

  writeValue(valor: string | null): void {
    this.valor = valor ?? '';
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
  }

  escribir(evento: CustomEvent): void {
    this.valor = String(evento.detail?.value ?? '');
    this.alCambiar(this.valor);
  }

  marcarTocado(): void {
    this.alTocar();
  }

  conservarFoco(evento: Event): void {
    evento.preventDefault();
  }

  alternar(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.visible.update((actual) => !actual);
    queueMicrotask(() => {
      void this.campo()?.setFocus();
    });
  }
}
