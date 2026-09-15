import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import {
  CrearAdministradorSolicitud,
  EditarAdministradorSolicitud,
  Usuario,
} from '../../core/models/usuario';
import { EstadoRegistro } from '../../core/models/empresa';
import { FeedbackService } from '../../core/services/feedback.service';
import { UsuariosService } from '../../core/services/usuarios.service';
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
import { AdministradorForm } from './administrador-form';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-administradores',
  imports: [
    DatePipe,
    PageHeader,
    ActionButton,
    SearchInput,
    FilterSelect,
    AppCard,
    StatusBadge,
    Icon,
    Modal,
    ConfirmDialog,
    AdministradorForm,
  ],
  templateUrl: './administradores.html',
  styleUrl: './administradores.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministradoresPage {
  private readonly api = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);

  readonly opcionesEstado: FilterOption[] = [
    { value: 'ACTIVO', label: 'Activos' },
    { value: 'INACTIVO', label: 'Inactivos' },
  ];

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  readonly administradores = signal<Usuario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal('');

  readonly formularioAbierto = signal(false);
  readonly modo = signal<ModoFormulario>('crear');
  readonly administradorEdicion = signal<Usuario | null>(null);
  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  readonly confirmacionAbierta = signal(false);
  readonly administradorEstado = signal<Usuario | null>(null);
  readonly idUsuarioCambiandoEstado = signal<number | null>(null);

  readonly idUsuarioActual = computed(() => this.auth.sesion()?.idUsuario ?? null);

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.administradores();
    if (!texto) {
      return lista;
    }

    return lista.filter((administrador) =>
      [administrador.email, administrador.telefono ?? ''].join(' ').toLowerCase().includes(texto),
    );
  });

  readonly subtitulo = computed(
    () => 'Gestiona las cuentas administrativas con acceso a la plataforma.',
  );

  readonly tituloFormulario = computed(() =>
    this.modo() === 'editar' ? 'Editar administrador' : 'Nuevo administrador',
  );

  readonly mensajeConfirmacion = computed(() => {
    const administrador = this.administradorEstado();
    if (!administrador) {
      return '';
    }

    return `Este administrador (${administrador.email}) dejará de poder acceder a la plataforma. Podrás volver a activarlo posteriormente.`;
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const estado = this.estadoFiltro() as EstadoRegistro | '';

    this.api.listarAdministradores(estado === '' ? null : estado).subscribe({
      next: (lista) => {
        this.administradores.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cargar los administradores.'));
      },
    });
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargar();
  }

  esCuentaPropia(administrador: Usuario): boolean {
    return this.idUsuarioActual() === administrador.idUsuario;
  }

  abrirCrear(): void {
    this.modo.set('crear');
    this.administradorEdicion.set(null);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  abrirEditar(administrador: Usuario): void {
    this.modo.set('editar');
    this.administradorEdicion.set(administrador);
    this.errorFormulario.set(null);
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.formularioAbierto.set(false);
    this.administradorEdicion.set(null);
    this.errorFormulario.set(null);
  }

  guardarCreacion(solicitud: CrearAdministradorSolicitud): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.crearAdministrador(solicitud).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.administradorEdicion.set(null);
        this.feedback.mostrar('Administrador creado correctamente.');
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible crear el administrador.'));
      },
    });
  }

  guardarEdicion(solicitud: EditarAdministradorSolicitud): void {
    if (this.guardando()) {
      return;
    }

    const edicion = this.administradorEdicion();
    if (!edicion) {
      this.errorFormulario.set('No es posible guardar el administrador.');
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.api.editarAdministrador(edicion.idUsuario, solicitud).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.administradorEdicion.set(null);
        this.feedback.mostrar('Administrador actualizado correctamente.');
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorHttp(err, 'No fue posible guardar el administrador.'));
      },
    });
  }

  pedirInactivar(administrador: Usuario): void {
    if (this.esCuentaPropia(administrador) || this.estaCambiandoEstado(administrador.idUsuario)) {
      return;
    }

    this.administradorEstado.set(administrador);
    this.confirmacionAbierta.set(true);
  }

  cancelarInactivar(): void {
    this.confirmacionAbierta.set(false);
    this.administradorEstado.set(null);
  }

  confirmarInactivar(): void {
    const administrador = this.administradorEstado();
    if (!administrador || this.estaCambiandoEstado(administrador.idUsuario)) {
      return;
    }

    this.confirmacionAbierta.set(false);
    this.administradorEstado.set(null);
    this.cambiarEstado(administrador, 'INACTIVO', 'Administrador inactivado correctamente.');
  }

  activar(administrador: Usuario): void {
    this.cambiarEstado(administrador, 'ACTIVO', 'Administrador activado correctamente.');
  }

  estaCambiandoEstado(idUsuario: number): boolean {
    return this.idUsuarioCambiandoEstado() === idUsuario;
  }

  private cambiarEstado(administrador: Usuario, estado: EstadoRegistro, mensaje: string): void {
    if (this.estaCambiandoEstado(administrador.idUsuario)) {
      return;
    }

    this.idUsuarioCambiandoEstado.set(administrador.idUsuario);
    this.api.cambiarEstado(administrador.idUsuario, { estado }).subscribe({
      next: () => {
        this.idUsuarioCambiandoEstado.set(null);
        this.feedback.mostrar(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.idUsuarioCambiandoEstado.set(null);
        this.error.set(mensajeErrorHttp(err, 'No fue posible cambiar el estado del administrador.'));
      },
    });
  }
}
