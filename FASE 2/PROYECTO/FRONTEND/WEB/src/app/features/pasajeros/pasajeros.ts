import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { EmpresasService } from '../../core/services/empresas.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { Empresa, EstadoRegistro } from '../../core/models/empresa';
import { EstadoAccesoPasajero, Pasajero, PasajeroConCuentaSolicitud, PasajeroSolicitud } from '../../core/models/pasajero';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { AppCard } from '../../shared/components/app-card/app-card';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FilterOption, FilterSelect } from '../../shared/components/filter-select/filter-select';
import { Icon } from '../../shared/components/icon/icon';
import { Modal } from '../../shared/components/modal/modal';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { PasajeroForm } from './pasajero-form';
import { PasajeroImport } from './pasajero-import';
import { environment } from '../../../environments/environment';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-pasajeros',
  imports: [
    PageHeader,
    ActionButton,
    SearchInput,
    FilterSelect,
    AppCard,
    StatusBadge,
    Icon,
    Modal,
    ConfirmDialog,
    PasajeroForm,
    PasajeroImport,
  ],
  templateUrl: './pasajeros.html',
  styleUrl: './pasajeros.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasajerosPage {
  private readonly api = inject(PasajerosService);
  private readonly empresasApi = inject(EmpresasService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly pasajeros = signal<Pasajero[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly catalogoCargado = signal(false);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');
  readonly empresaFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly pasajeroEdicion = signal<Pasajero | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly pasajeroEstado = signal<Pasajero | null>(null);
  readonly idPasajeroCambiandoEstado = signal<number | null>(null);
  readonly idPasajeroAcceso = signal<number | null>(null);
  readonly importacionAbierta = signal(false);

  readonly opcionesEmpresa = computed<FilterOption[]>(() =>
    this.empresas().map((empresa) => ({
      value: String(empresa.idEmpresa),
      label: empresa.razonSocial,
    })),
  );

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.pasajeros();
    if (!texto) {
      return lista;
    }

    return lista.filter((pasajero) => {
      const empresa = this.nombreEmpresa(pasajero.idEmpresa);
      return [pasajero.nombre, pasajero.rut, pasajero.telefono, pasajero.email, empresa]
        .join(' ')
        .toLowerCase()
        .includes(texto);
    });
  });

  readonly subtitulo = computed(
    () => 'Gestión de pasajeros asociados a las empresas clientes',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar pasajero' : 'Nuevo pasajero',
  );

  readonly mensajeConfirmacion = computed(() => {
    const pasajero = this.pasajeroEstado();
    if (!pasajero) {
      return '';
    }

    return `¿Desea desactivar al pasajero ${pasajero.nombre}? No se eliminará el registro; podrá activarlo nuevamente.`;
  });

  constructor() {
    this.cargar();
  }

  nombreEmpresa(idEmpresa: number): string {
    return this.empresas().find((empresa) => empresa.idEmpresa === idEmpresa)?.razonSocial
      ?? `Empresa ${idEmpresa}`;
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const estado = this.estadoFiltro() as EstadoRegistro | '';
    const idEmpresa = Number(this.empresaFiltro());

    const empresas$ = this.catalogoCargado()
      ? of(this.empresas())
      : this.empresasApi.listar();

    forkJoin({
      empresas: empresas$,
      pasajeros: this.api.listar(
        estado === '' ? null : estado,
        Number.isInteger(idEmpresa) && idEmpresa > 0 ? idEmpresa : null,
      ),
    }).subscribe({
      next: ({ empresas, pasajeros }) => {
        this.empresas.set(empresas);
        this.catalogoCargado.set(true);
        this.pasajeros.set(pasajeros);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los pasajeros.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  actualizarEmpresaFiltro(valor: string): void {
    this.empresaFiltro.set(valor);
    this.cargar();
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.pasajeroEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirImportar(): void {
    this.importacionAbierta.set(true);
  }

  cerrarImportacion(): void {
    this.importacionAbierta.set(false);
  }

  abrirEditar(pasajero: Pasajero): void {
    this.modo.set('editar');
    this.pasajeroEdicion.set(pasajero);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);

    this.api.obtenerPorId(pasajero.idPasajero).subscribe({
      next: (detalle) => this.pasajeroEdicion.set(detalle),
      error: (err: unknown) => {
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible actualizar los datos del pasajero.'));
      },
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.pasajeroEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardar(solicitud: PasajeroSolicitud): void {
    if (this.guardando()) {
      return;
    }

    const edicion = this.pasajeroEdicion();
    if (this.modo() !== 'editar' || !edicion) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.editar(edicion.idPasajero, solicitud).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.pasajeroEdicion.set(null);
        this.feedback.mostrar('Pasajero actualizado correctamente.');
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar el pasajero.'));
      },
    });
  }

  crearConCuenta(solicitud: PasajeroConCuentaSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.crearConCuenta(solicitud).subscribe({
      next: (pasajero) => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.pasajeroEdicion.set(null);
        this.feedback.mostrar(this.mensajeAlta(pasajero.telefono, pasajero.estadoAcceso));
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear el pasajero.'));
      },
    });
  }

  etiquetaAcceso(estado: EstadoAccesoPasajero): string {
    switch (estado) {
      case 'ACTIVADA':
        return 'Activado';
      case 'ERROR':
        return 'Error de envío';
      case 'SIN_CUENTA':
        return 'Sin cuenta';
      default:
        return 'Pendiente';
    }
  }

  tonoAcceso(estado: EstadoAccesoPasajero): 'green' | 'amber' | 'red' | 'slate' {
    switch (estado) {
      case 'ACTIVADA':
        return 'green';
      case 'ERROR':
        return 'red';
      case 'SIN_CUENTA':
        return 'slate';
      default:
        return 'amber';
    }
  }

  puedeReenviar(pasajero: Pasajero): boolean {
    return pasajero.estadoAcceso === 'PENDIENTE'
      || pasajero.estadoAcceso === 'ENVIADA'
      || pasajero.estadoAcceso === 'ERROR';
  }

  puedeHabilitar(pasajero: Pasajero): boolean {
    return pasajero.estadoAcceso === 'SIN_CUENTA';
  }

  estaProcesandoAcceso(idPasajero: number): boolean {
    return this.idPasajeroAcceso() === idPasajero;
  }

  reenviarActivacion(pasajero: Pasajero): void {
    if (this.estaProcesandoAcceso(pasajero.idPasajero) || !this.puedeReenviar(pasajero)) {
      return;
    }

    this.idPasajeroAcceso.set(pasajero.idPasajero);
    this.api.reenviarActivacion(pasajero.idPasajero).subscribe({
      next: () => {
        this.idPasajeroAcceso.set(null);
        this.feedback.mostrar(
          environment.production
            ? 'Activación reenviada.'
            : 'Activación simulada correctamente.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.idPasajeroAcceso.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible reenviar la activación.'));
      },
    });
  }

  habilitarAcceso(pasajero: Pasajero): void {
    if (this.estaProcesandoAcceso(pasajero.idPasajero) || !this.puedeHabilitar(pasajero)) {
      return;
    }

    this.idPasajeroAcceso.set(pasajero.idPasajero);
    this.api.habilitarAcceso(pasajero.idPasajero).subscribe({
      next: () => {
        this.idPasajeroAcceso.set(null);
        this.feedback.mostrar(
          environment.production
            ? `Se habilitó el acceso para ${pasajero.telefono}.`
            : 'Acceso habilitado. SMS simulado en entorno de desarrollo.',
        );
        this.cargar();
      },
      error: (err: unknown) => {
        this.idPasajeroAcceso.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible habilitar el acceso.'));
      },
    });
  }

  private mensajeAlta(telefono: string, estadoAcceso: EstadoAccesoPasajero): string {
    const invitacion = `Pasajero creado correctamente. Se generó una invitación de activación para ${telefono}.`;
    if (estadoAcceso === 'ERROR') {
      return `${invitacion} El envío quedó con error; puede reenviar la activación.`;
    }

    if (!environment.production) {
      return `${invitacion} SMS simulado en entorno de desarrollo.`;
    }

    return invitacion;
  }

  pedirDesactivar(pasajero: Pasajero): void {
    if (this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.pasajeroEstado.set(pasajero);
    this.confirmacionAbierta.set(true);
  }

  cancelarDesactivar(): void {
    this.confirmacionAbierta.set(false);
    this.pasajeroEstado.set(null);
  }

  confirmarDesactivar(): void {
    const pasajero = this.pasajeroEstado();
    if (!pasajero || this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.pasajeroEstado.set(null);
    this.cambiarEstado(pasajero, 'INACTIVO', 'Pasajero desactivado correctamente.');
  }

  activar(pasajero: Pasajero): void {
    this.cambiarEstado(pasajero, 'ACTIVO', 'Pasajero activado correctamente.');
  }

  estaCambiandoEstado(idPasajero: number): boolean {
    return this.idPasajeroCambiandoEstado() === idPasajero;
  }

  private cambiarEstado(pasajero: Pasajero, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(pasajero.idPasajero)) {
      return;
    }

    this.idPasajeroCambiandoEstado.set(pasajero.idPasajero);
    this.api.cambiarEstado(pasajero.idPasajero, { estado }).subscribe({
      next: () => {
        this.idPasajeroCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idPasajeroCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado del pasajero.'));
      },
    });
  }
}
