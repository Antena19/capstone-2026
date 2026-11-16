import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonNote } from '@ionic/angular';
import { AVISO_RECUPERACION, RecuperacionPassword } from '../../../core/auth/recuperacion-password';
import { MENSAJE_PASSWORD, PATRON_PASSWORD } from '../../../core/constants/auth';
import { CampoPasswordComponent } from '../../../shared/campo-password/campo-password.component';

export function confirmarRestablecimiento(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('passwordNueva')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  if (!password || !confirmar || password === confirmar) {
    return null;
  }

  return { confirmar: true };
}

@Component({
  selector: 'app-restablecer',
  templateUrl: './restablecer.page.html',
  styleUrls: ['./restablecer.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonButton, IonNote, CampoPasswordComponent],
})
export class RestablecerPage {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionPassword);

  readonly aviso = AVISO_RECUPERACION;
  readonly mensajePolitica = MENSAJE_PASSWORD;
  readonly disponible = this.recuperacion.disponible;

  readonly form = this.fb.nonNullable.group(
    {
      passwordNueva: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: confirmarRestablecimiento },
  );

  enviar(): void {
    this.form.markAllAsTouched();
    if (!this.disponible || this.form.invalid) {
      return;
    }
  }
}
