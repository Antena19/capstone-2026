import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Empresa } from '../../core/models/empresa';
import {
  ColumnaExcel,
  MapeoColumnasImportacion,
  PreviewImportacionPasajeros,
  ResultadoImportacionPasajeros,
} from '../../core/models/pasajero';
import { PasajerosService } from '../../core/services/pasajeros.service';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { PaginacionLista } from '../../core/utils/paginacion';
import { ActionButton } from '../../shared/components/action-button/action-button';
import { Paginacion } from '../../shared/components/paginacion/paginacion';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

type PasoImportacion = 'archivo' | 'hoja' | 'mapeo' | 'preview';
type FiltroPreview = 'todas' | 'validas' | 'errores';

@Component({
  selector: 'app-pasajero-import',
  imports: [ActionButton, StatusBadge, Paginacion],
  templateUrl: './pasajero-import.html',
  styleUrl: './pasajero-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasajeroImport {
  readonly empresas = input<Empresa[]>([]);
  readonly abierto = input(false);
  private readonly inputArchivo = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');
  readonly importado = output<string>();
  readonly cancelado = output<void>();

  private readonly api = inject(PasajerosService);

  readonly paso = signal<PasoImportacion>('archivo');
  readonly idEmpresa = signal('');
  readonly archivo = signal<File | null>(null);
  readonly hojas = signal<string[]>([]);
  readonly hoja = signal('');
  readonly encabezados = signal<ColumnaExcel[]>([]);
  readonly mapeo = signal<MapeoColumnasImportacion>({
    nombreColumna: 0,
    rutColumna: 0,
    telefonoColumna: 0,
    emailColumna: null,
    direccionColumna: 0,
  });
  readonly preview = signal<PreviewImportacionPasajeros | null>(null);
  readonly resultado = signal<ResultadoImportacionPasajeros | null>(null);
  readonly filtro = signal<FiltroPreview>('todas');
  private readonly marcaPreview = signal(0);
  readonly cargando = signal(false);
  readonly importando = signal(false);
  readonly error = signal<string | null>(null);

  readonly empresasActivas = computed(() =>
    this.empresas().filter((empresa) => empresa.estado === 'ACTIVO'),
  );

  readonly tituloPaso = computed(() => {
    switch (this.paso()) {
      case 'archivo':
        return 'Paso 1 de 2 · Plantilla y archivo';
      case 'preview':
        return 'Paso 2 de 2 · Vista previa';
      case 'hoja':
        return 'Hoja';
      default:
        return 'Columnas';
    }
  });

  readonly filasVisibles = computed(() => {
    const preview = this.preview();
    if (!preview) {
      return [];
    }

    switch (this.filtro()) {
      case 'validas':
        return preview.filas.filter((fila) => fila.esValida);
      case 'errores':
        return preview.filas.filter((fila) => !fila.esValida);
      default:
        return preview.filas;
    }
  });

  readonly paginacion = new PaginacionLista(
    () => this.filasVisibles(),
    () => `${this.filtro()}|${this.marcaPreview()}`,
  );
  readonly filasPagina = computed(() => this.paginacion.recortar());

  constructor() {
    effect(() => {
      if (this.abierto()) {
        return;
      }

      this.resetear();
    });
  }

  readonly mapeoCompleto = computed(() => {
    const actual = this.mapeo();
    return actual.nombreColumna > 0
      && actual.rutColumna > 0
      && actual.telefonoColumna > 0
      && actual.direccionColumna > 0;
  });

  opcionesColumna(campo: keyof MapeoColumnasImportacion): ColumnaExcel[] {
    const actual = this.mapeo();
    const usados = new Set(
      [actual.nombreColumna, actual.rutColumna, actual.telefonoColumna, actual.direccionColumna, actual.emailColumna]
        .filter((indice): indice is number => typeof indice === 'number' && indice > 0),
    );
    const actualCampo = actual[campo];

    return this.encabezados().filter((columna) => {
      if (columna.indice === actualCampo) {
        return true;
      }

      return !usados.has(columna.indice);
    });
  }

  etiquetaColumna(columna: ColumnaExcel): string {
    const nombre = columna.nombre.trim() || '(sin título)';
    return `${columna.letra} · ${nombre}`;
  }

  seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivo.set(file);
    this.hojas.set([]);
    this.hoja.set('');
    this.encabezados.set([]);
    this.preview.set(null);
    this.error.set(null);
  }

  descargarPlantilla(): void {
    this.api.descargarPlantilla().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'Plantilla_Importacion_Pasajeros.xlsx';
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.error.set(mensajeErrorHttp(err, 'No fue posible descargar la plantilla.'));
      },
    });
  }

  continuarArchivo(): void {
    const archivo = this.archivo();
    const idEmpresa = Number(this.idEmpresa());
    if (!archivo || this.cargando() || !Number.isInteger(idEmpresa) || idEmpresa < 1) {
      this.error.set('Selecciona una empresa activa y un archivo .xlsx.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.api.inspeccionarExcel(archivo).subscribe({
      next: (respuesta) => {
        this.hojas.set(respuesta.hojas);
        const hojaOficial = respuesta.hojas.find((nombre) => normalizarEncabezado(nombre) === 'pasajeros');
        if (!hojaOficial) {
          this.cargando.set(false);
          this.error.set(MENSAJE_PLANTILLA);
          return;
        }

        this.leerPlantillaOficial(hojaOficial);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible leer el archivo.'));
      },
    });
  }

  continuarHoja(): void {
    if (!this.hoja()) {
      this.error.set('Selecciona la hoja a importar.');
      return;
    }

    this.cargarEncabezados(this.hoja());
  }

  actualizarMapeo(campo: keyof MapeoColumnasImportacion, valor: string): void {
    const indice = valor === '' ? null : Number(valor);
    this.mapeo.update((actual) => ({
      ...actual,
      [campo]: campo === 'emailColumna' ? indice : (indice ?? 0),
    }));
  }

  validar(): void {
    if (!this.archivo() || !this.mapeoCompleto() || this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.solicitarValidacion();
  }

  private solicitarValidacion(): void {
    const archivo = this.archivo();
    const idEmpresa = Number(this.idEmpresa());
    if (!archivo || !this.mapeoCompleto()) {
      this.cargando.set(false);
      return;
    }

    this.api.validarImportacion(idEmpresa, archivo, this.hoja(), this.mapeo()).subscribe({
      next: (preview) => {
        this.cargando.set(false);
        this.preview.set(preview);
        this.filtro.set('todas');
        this.marcaPreview.update((marca) => marca + 1);
        this.paso.set('preview');
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible validar el archivo.'));
      },
    });
  }

  confirmarImportacion(): void {
    const archivo = this.archivo();
    const preview = this.preview();
    const idEmpresa = Number(this.idEmpresa());
    if (!archivo || !preview || preview.validas === 0 || this.importando()) {
      return;
    }

    this.importando.set(true);
    this.error.set(null);
    this.api.importar(idEmpresa, archivo, this.hoja(), this.mapeo()).subscribe({
      next: (resultado) => {
        this.importando.set(false);
        this.resultado.set(resultado);
        this.importado.emit(mensajeImportacion(resultado));
      },
      error: (err: unknown) => {
        this.importando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible importar los pasajeros.'));
      },
    });
  }

  volver(): void {
    if (this.cargando() || this.importando()) {
      return;
    }

    this.error.set(null);
    switch (this.paso()) {
      case 'hoja':
        this.paso.set('archivo');
        return;
      case 'mapeo':
        this.paso.set(this.hojas().length > 1 ? 'hoja' : 'archivo');
        return;
      case 'preview':
        this.paso.set('archivo');
        return;
      default:
        return;
    }
  }

  cancelar(): void {
    if (this.importando()) {
      return;
    }

    this.resetear();
    this.cancelado.emit();
  }

  resetear(): void {
    this.paso.set('archivo');
    this.idEmpresa.set('');
    this.limpiarArchivo();
    this.hojas.set([]);
    this.hoja.set('');
    this.encabezados.set([]);
    this.mapeo.set({
      nombreColumna: 0,
      rutColumna: 0,
      telefonoColumna: 0,
      emailColumna: null,
      direccionColumna: 0,
    });
    this.preview.set(null);
    this.resultado.set(null);
    this.filtro.set('todas');
    this.marcaPreview.update((marca) => marca + 1);
    this.cargando.set(false);
    this.importando.set(false);
    this.error.set(null);
  }

  private leerPlantillaOficial(nombreHoja: string): void {
    const archivo = this.archivo();
    if (!archivo) {
      this.cargando.set(false);
      return;
    }

    this.api.leerEncabezados(archivo, nombreHoja).subscribe({
      next: (respuesta) => {
        const mapeo = mapeoPlantillaOficial(respuesta.encabezados);
        if (!mapeo) {
          this.cargando.set(false);
          this.error.set(MENSAJE_PLANTILLA);
          return;
        }

        this.hoja.set(respuesta.nombreHoja);
        this.encabezados.set(respuesta.encabezados);
        this.mapeo.set(mapeo);
        this.solicitarValidacion();
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible leer los encabezados.'));
      },
    });
  }

  private cargarEncabezados(nombreHoja: string): void {
    const archivo = this.archivo();
    if (!archivo) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.api.leerEncabezados(archivo, nombreHoja).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.hoja.set(respuesta.nombreHoja);
        this.encabezados.set(respuesta.encabezados);
        this.mapeo.set({
          nombreColumna: respuesta.sugerencia.nombreColumna,
          rutColumna: respuesta.sugerencia.rutColumna,
          telefonoColumna: respuesta.sugerencia.telefonoColumna,
          emailColumna: respuesta.sugerencia.emailColumna,
          direccionColumna: respuesta.sugerencia.direccionColumna,
        });
        this.paso.set('mapeo');
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorHttp(err, 'No fue posible leer los encabezados.'));
      },
    });
  }

  private limpiarArchivo(): void {
    this.archivo.set(null);
    const input = this.inputArchivo();
    if (input) {
      input.nativeElement.value = '';
    }
  }
}

const MENSAJE_PLANTILLA =
  'El archivo no corresponde a la plantilla oficial de Trayek. Descárgala y conserva los encabezados Nombre, RUT, Teléfono, Correo y Dirección.';

const ENCABEZADOS_PLANTILLA = ['nombre', 'rut', 'telefono', 'correo', 'direccion'] as const;

function normalizarEncabezado(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapeoPlantillaOficial(columnas: ColumnaExcel[]): MapeoColumnasImportacion | null {
  const ordenadas = [...columnas].sort((a, b) => a.indice - b.indice);
  while (ordenadas.length > 0 && normalizarEncabezado(ordenadas[ordenadas.length - 1].nombre) === '') {
    ordenadas.pop();
  }

  if (ordenadas.length !== ENCABEZADOS_PLANTILLA.length) {
    return null;
  }

  if (ordenadas.some((columna, indice) => normalizarEncabezado(columna.nombre) !== ENCABEZADOS_PLANTILLA[indice])) {
    return null;
  }

  const indiceDe = (nombre: string) => ordenadas.find((columna) => normalizarEncabezado(columna.nombre) === nombre)!.indice;

  return {
    nombreColumna: indiceDe('nombre'),
    rutColumna: indiceDe('rut'),
    telefonoColumna: indiceDe('telefono'),
    emailColumna: indiceDe('correo'),
    direccionColumna: indiceDe('direccion'),
  };
}

function mensajeImportacion(resultado: ResultadoImportacionPasajeros): string {
  const creados = resultado.creados === 1
    ? '1 pasajero creado'
    : `${resultado.creados} pasajeros creados`;

  if (resultado.omitidos <= 0) {
    return `Importación completada: ${creados}.`;
  }

  const omitidos = resultado.omitidos === 1
    ? '1 registro omitido'
    : `${resultado.omitidos} registros omitidos`;

  return `Importación completada: ${creados} y ${omitidos}.`;
}
