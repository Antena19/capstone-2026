import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { confirmarRestablecimiento } from '../../features/auth/restablecer/restablecer.page';
import { guestGuard } from './auth.guard';
import { MENSAJE_PASSWORD, PATRON_PASSWORD } from '../constants/auth';
import { AVISO_RECUPERACION, RecuperacionPassword } from './recuperacion-password';

describe('recuperación de contraseña', () => {
  it('permanece inactiva y conserva la política de contraseñas', () => {
    expect(new RecuperacionPassword().disponible).toBe(false);
    expect(AVISO_RECUPERACION).toBe('La recuperación de contraseña estará disponible próximamente.');
    expect(MENSAJE_PASSWORD).toContain('8 y 100');
    expect(PATRON_PASSWORD.test('Abcdef12')).toBe(true);
    expect(PATRON_PASSWORD.test('sololetras')).toBe(false);
    expect(PATRON_PASSWORD.test('12345678')).toBe(false);
    expect(PATRON_PASSWORD.test('Abc12')).toBe(false);
  });

  it('exige coincidencia entre la nueva contraseña y su confirmación', () => {
    const fb = new FormBuilder();
    const form = fb.nonNullable.group(
      {
        passwordNueva: ['Abcdef12', Validators.required],
        confirmarPassword: ['Abcdef99', Validators.required],
      },
      { validators: confirmarRestablecimiento },
    );

    expect(form.hasError('confirmar')).toBe(true);
    form.controls.confirmarPassword.setValue('Abcdef12');
    expect(form.hasError('confirmar')).toBe(false);
  });

  it('abre recuperar, restablecer, login y activación sin sesión ni llamadas HTTP', async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });

    const recuperar = routes.find((ruta) => ruta.path === 'recuperar');
    const restablecer = routes.find((ruta) => ruta.path === 'restablecer');
    const activar = routes.find((ruta) => ruta.path === 'activar');
    expect(recuperar?.canActivate).toEqual([guestGuard]);
    expect(restablecer?.canActivate).toEqual([guestGuard]);
    expect(activar?.canActivate).toBeUndefined();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
    await router.navigateByUrl('/recuperar');
    expect(router.url).toBe('/recuperar');
    await router.navigateByUrl('/restablecer');
    expect(router.url).toBe('/restablecer');
    await router.navigateByUrl('/activar');
    expect(router.url).toBe('/activar');
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
