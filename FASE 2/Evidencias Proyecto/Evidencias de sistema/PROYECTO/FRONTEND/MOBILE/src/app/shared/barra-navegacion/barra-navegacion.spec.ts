import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonBackButton, IonButton, IonIcon } from '@ionic/angular';
import { describe, expect, it } from 'vitest';
import { BarraNavegacionComponent } from './barra-navegacion.component';

@Component({
  imports: [BarraNavegacionComponent],
  template: `<app-barra-navegacion titulo="Mis servicios" [mostrarMenu]="true" />`,
})
class BarraInicio {}

@Component({
  imports: [BarraNavegacionComponent],
  template: `<app-barra-navegacion titulo="Detalle del servicio" hrefRegreso="/pasajero" />`,
})
class BarraDetalle {}

@Component({
  imports: [BarraNavegacionComponent],
  template: `<app-barra-navegacion titulo="Cambiar contraseña" hrefRegreso="/perfil" />`,
})
class BarraCambioVoluntario {}

@Component({
  imports: [BarraNavegacionComponent, IonButton, IonIcon],
  template: `
    <app-barra-navegacion titulo="Cambiar contraseña">
      <ion-button aria-label="Cerrar sesión">
        <ion-icon name="log-out-outline" />
      </ion-button>
    </app-barra-navegacion>
  `,
})
class BarraCambioObligatorio {}

describe('barra de navegación', () => {
  it('muestra el menú y el título sin acciones de texto', async () => {
    const fixture = await crear(BarraInicio);
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Mis servicios');
    expect(texto).not.toContain('Perfil');
    expect(texto).not.toContain('Cerrar sesión');
    expect(fixture.nativeElement.querySelector('ion-menu-button')?.getAttribute('aria-label')).toBe(
      'Abrir menú',
    );
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.logo-toolbar')).toBeNull();
  });

  it('muestra solo la flecha de regreso y conserva el destino', async () => {
    const fixture = await crear(BarraDetalle);
    const regreso = botonRegreso(fixture);

    expect(fixture.nativeElement.textContent).toContain('Detalle del servicio');
    expect(regreso?.text).toBe('');
    expect(regreso?.defaultHref).toBe('/pasajero');
    expect(fixture.nativeElement.querySelector('ion-menu-button')).toBeNull();
  });

  it('permite volver al perfil sin mostrar el menú en el cambio voluntario', async () => {
    const fixture = await crear(BarraCambioVoluntario);
    const regreso = botonRegreso(fixture);

    expect(regreso?.text).toBe('');
    expect(regreso?.defaultHref).toBe('/perfil');
    expect(fixture.nativeElement.querySelector('ion-menu-button')).toBeNull();
  });

  it('mantiene el cierre de sesión accesible y sin regreso en el cambio obligatorio', async () => {
    const fixture = await crear(BarraCambioObligatorio);
    const boton = fixture.nativeElement.querySelector('ion-button');

    expect(fixture.nativeElement.textContent).toContain('Cambiar contraseña');
    expect(boton?.getAttribute('aria-label')).toBe('Cerrar sesión');
    expect(fixture.nativeElement.querySelector('ion-icon')?.getAttribute('name')).toBe(
      'log-out-outline',
    );
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-menu-button')).toBeNull();
  });
});

function botonRegreso(fixture: ComponentFixture<unknown>): IonBackButton | undefined {
  return fixture.debugElement.query((elemento) => elemento.componentInstance instanceof IonBackButton)
    ?.componentInstance as IonBackButton | undefined;
}

async function crear<T>(tipo: new () => T): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({ imports: [tipo] }).compileComponents();
  const fixture = TestBed.createComponent(tipo);
  fixture.detectChanges();
  return fixture;
}
