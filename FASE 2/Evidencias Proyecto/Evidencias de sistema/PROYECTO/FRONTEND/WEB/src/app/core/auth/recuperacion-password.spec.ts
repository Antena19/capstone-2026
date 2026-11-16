import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { RecuperarPage } from '../../features/auth/recuperar/recuperar';
import { RestablecerPage } from '../../features/auth/restablecer/restablecer';
import { LoginPage } from '../../features/auth/login/login';
import { authGuard, guestGuard } from '../guards/auth.guard';
import { politicaPassword } from './politica-password';
import { AVISO_RECUPERACION, RecuperacionPassword } from './recuperacion-password';

describe('recuperación de contraseña', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('conserva la política vigente de contraseñas', () => {
    const politica = politicaPassword();
    expect(politica({ value: 'Abcdef12' } as never)).toBeNull();
    expect(politica({ value: '' } as never)).toBeNull();
    expect(politica({ value: 'sololetras' } as never)?.['passwordPolitica']).toBeTrue();
    expect(politica({ value: '12345678' } as never)?.['passwordPolitica']).toBeTrue();
    expect(politica({ value: 'Abc12' } as never)?.['passwordPolitica']).toBeTrue();
  });

  it('deja el servicio inactivo y sin aviso de envío realizado', () => {
    expect(new RecuperacionPassword().disponible).toBeFalse();
    expect(AVISO_RECUPERACION).toBe('La recuperación de contraseña estará disponible próximamente.');
  });

  it('expone recuperar y restablecer sin guard de sesión', () => {
    const recuperar = routes.find((ruta) => ruta.path === 'recuperar');
    const restablecer = routes.find((ruta) => ruta.path === 'restablecer');

    expect(recuperar?.canActivate).toEqual([guestGuard]);
    expect(restablecer?.canActivate).toEqual([guestGuard]);
    expect(recuperar?.canActivate).not.toContain(authGuard);
    expect(restablecer?.canActivate).not.toContain(authGuard);
  });

  it('recorre login, recuperar y restablecer sin llamar a la API', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
    await router.navigateByUrl('/recuperar');
    expect(router.url).toBe('/recuperar');
    await router.navigateByUrl('/restablecer');
    expect(router.url).toBe('/restablecer');
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
    http.expectNone(() => true);
  });

  it('valida el correo, mantiene el envío deshabilitado y vuelve al login', async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarPage, LoginPage],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const recuperar = TestBed.createComponent(RecuperarPage);
    recuperar.detectChanges();
    const boton = recuperar.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBeTrue();
    expect(boton.textContent).toContain('Enviar instrucciones');
    expect(recuperar.nativeElement.textContent).toContain(AVISO_RECUPERACION);
    expect(recuperar.nativeElement.querySelector('a[href="/login"]')?.textContent).toContain(
      'Volver a iniciar sesión',
    );

    recuperar.componentInstance.form.controls.correo.setValue('correo-invalido');
    recuperar.componentInstance.form.controls.correo.markAsTouched();
    recuperar.detectChanges();
    expect(recuperar.nativeElement.textContent).toContain('Ingrese un correo válido.');

    recuperar.componentInstance.form.controls.correo.setValue('admin@trayek.test');
    recuperar.componentInstance.enviar();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    expect(recuperar.nativeElement.textContent).not.toContain('enviado');

    const login = TestBed.createComponent(LoginPage);
    login.detectChanges();
    const acceso = login.nativeElement.querySelector('a[href="/recuperar"]');
    const ingresar = login.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(acceso?.textContent).toContain('¿Olvidaste tu contraseña?');
    expect(ingresar.disabled).toBeFalse();
  });

  it('valida la nueva contraseña y no confirma un restablecimiento', () => {
    TestBed.configureTestingModule({
      imports: [RestablecerPage],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RestablecerPage);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBeTrue();
    expect(boton.textContent).toContain('Restablecer contraseña');

    const formulario = fixture.componentInstance.form;
    formulario.controls.passwordNueva.setValue('sololetras');
    formulario.controls.passwordNueva.markAsTouched();
    formulario.controls.passwordConfirm.setValue('Abcdef12');
    formulario.controls.passwordConfirm.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'La contraseña debe tener entre 8 y 100 caracteres, e incluir al menos una letra y un número.',
    );
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');

    formulario.controls.passwordNueva.setValue('Abcdef12');
    formulario.controls.passwordConfirm.setValue('Abcdef12');
    fixture.componentInstance.enviar();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    expect(fixture.nativeElement.textContent).not.toContain('actualizada');
  });
});
