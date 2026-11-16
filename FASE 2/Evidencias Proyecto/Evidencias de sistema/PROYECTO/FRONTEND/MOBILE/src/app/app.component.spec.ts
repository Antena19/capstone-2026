import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IonMenu } from '@ionic/angular';
import { afterEach, describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { CLAVE_SESION } from './core/constants/auth';

@Component({ template: '' })
class PantallaVacia {}

describe('AppComponent', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('crea la aplicación con el menú cerrado a gestos y deshabilitado sin sesión', async () => {
    const fixture = await crear();
    const menu = menuDe(fixture);

    expect(fixture.componentInstance).toBeTruthy();
    expect(menu?.contentId).toBe('contenido');
    expect(menu?.disabled).toBe(true);
    expect(menu?.swipeGesture).toBe(false);
    expect(fixture.nativeElement.querySelector('ion-router-outlet')?.id).toBe('contenido');
  });

  it('muestra las opciones del pasajero y cierra la sesión', async () => {
    guardarSesion('PASAJERO');
    const fixture = await crear();

    expect(fixture.componentInstance.menuActivo()).toBe(true);
    expect(fixture.componentInstance.opciones()).toEqual([
      { texto: 'Mis servicios', href: '/pasajero', icono: 'bus-outline' },
      { texto: 'Mi perfil', href: '/perfil', icono: 'person-outline' },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Cerrar sesión');

    await fixture.componentInstance.cerrarSesion();

    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(fixture.componentInstance.menuActivo()).toBe(false);
  });

  it('muestra las opciones del conductor', async () => {
    guardarSesion('CONDUCTOR');
    const fixture = await crear();

    expect(fixture.componentInstance.opciones()[0]?.href).toBe('/conductor');
  });

  it('no permite abrir el menú durante el cambio obligatorio de contraseña', async () => {
    guardarSesion('PASAJERO', true);
    const fixture = await crear();

    expect(fixture.componentInstance.menuActivo()).toBe(false);
    expect(menuDe(fixture)?.disabled).toBe(true);
  });
});

function guardarSesion(rol: string, debeCambiarPassword = false): void {
  localStorage.setItem(
    CLAVE_SESION,
    JSON.stringify({
      token: 'token-prueba',
      idUsuario: 1,
      email: 'persona@trayek.test',
      nombre: 'Persona',
      telefono: null,
      rol,
      expiracion: new Date(Date.now() + 60_000).toISOString(),
      debeCambiarPassword,
    }),
  );
}

function menuDe(fixture: { debugElement: { query: Function } }): IonMenu | undefined {
  return fixture.debugElement.query((elemento: { componentInstance: unknown }) => {
    return elemento.componentInstance instanceof IonMenu;
  })?.componentInstance as IonMenu | undefined;
}

async function crear() {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [
      provideRouter([{ path: 'login', component: PantallaVacia }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  return fixture;
}
