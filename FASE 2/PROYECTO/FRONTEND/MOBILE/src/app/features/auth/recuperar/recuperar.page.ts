import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonNote } from '@ionic/angular';
import { AVISO_RECUPERACION, RecuperacionPassword } from '../../../core/auth/recuperacion-password';

@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonButton, IonNote],
})
export class RecuperarPage {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionPassword);

  readonly aviso = AVISO_RECUPERACION;
  readonly disponible = this.recuperacion.disponible;

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  mensajeCorreo(): string | null {
    const campo = this.form.controls.correo;
    if (!campo.touched || campo.valid) {
      return null;
    }

    return campo.hasError('email') ? 'Ingresa un correo válido.' : 'Ingresa tu correo electrónico.';
  }

  enviar(): void {
    this.form.markAllAsTouched();
    if (!this.disponible || this.form.invalid) {
      return;
    }
  }
}
