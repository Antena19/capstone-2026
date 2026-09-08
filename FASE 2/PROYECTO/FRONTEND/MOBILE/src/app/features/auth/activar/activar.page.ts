import { Component, inject, OnDestroy, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../../core/auth/auth.service';

const PATRON_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

function confirmarPassword(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('nuevaPassword')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  if (!password || !confirmar || password === confirmar) {
    return null;
  }

  return { confirmar: true };
}

@Component({
  selector: 'app-activar',
  templateUrl: './activar.page.html',
  styleUrls: ['./activar.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
  ],
})
export class ActivarPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  readonly enviando = signal(false);
  readonly reenviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly cooldown = signal(0);

  readonly form = this.fb.nonNullable.group(
    {
      telefono: ['', Validators.required],
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      nuevaPassword: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: confirmarPassword },
  );

  ngOnDestroy(): void {
    this.limpiarCooldown();
  }

  enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.exito.set(null);

    const { telefono, codigo, nuevaPassword } = this.form.getRawValue();
    this.auth.activarCuenta(telefono.trim(), codigo.trim(), nuevaPassword).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exito.set('Cuenta activada correctamente.');
        setTimeout(() => void this.router.navigateByUrl('/login'), 900);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible activar la cuenta.'));
      },
    });
  }

  reenviar(): void {
    if (this.cooldown() > 0 || this.reenviando()) {
      return;
    }

    const telefono = this.form.controls.telefono.value.trim();
    if (!telefono) {
      this.form.controls.telefono.markAsTouched();
      return;
    }

    this.reenviando.set(true);
    this.error.set(null);
    this.auth.reenviarActivacion(telefono).subscribe({
      next: (respuesta) => {
        this.reenviando.set(false);
        this.exito.set(respuesta.mensaje);
        this.iniciarCooldown(60);
      },
      error: (err: unknown) => {
        this.reenviando.set(false);
        this.error.set(this.auth.mensajeErrorHttp(err, 'No fue posible reenviar el código.'));
        this.iniciarCooldown(60);
      },
    });
  }

  private iniciarCooldown(segundos: number): void {
    this.limpiarCooldown();
    this.cooldown.set(segundos);
    this.cooldownTimer = setInterval(() => {
      const restante = this.cooldown() - 1;
      if (restante <= 0) {
        this.limpiarCooldown();
        this.cooldown.set(0);
        return;
      }

      this.cooldown.set(restante);
    }, 1000);
  }

  private limpiarCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
