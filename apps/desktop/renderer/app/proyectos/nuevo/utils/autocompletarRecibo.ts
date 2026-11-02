import {
  buscarLocalidadCatalogo,
  tarifasClasicas,
  tarifasNuevas,
  type LocalidadCatalogo,
  type ResultadoReciboCfe,
} from '@cotizador/shared';
import type { DatosContacto } from '../types';

/**
 * Traduce lo que se leyó de un recibo CFE a los valores del wizard (Pasos 1 y 2).
 *
 * Es una función pura, sin React: decide **qué** se asigna y **qué avisos** hay
 * que dar, y `page.tsx` solo ejecuta los `setX` en el orden correcto. Un valor
 * `null` significa "no tocar lo que ya hay" (p. ej. una tarifa que el
 * catálogo no conoce se deja como está en lugar de sustituirla por otra).
 */

export interface PlanAutocompletado {
  /** Parche para `datosContacto`; siempre quita `contactoExistenteId`. */
  contacto: Partial<DatosContacto>;
  nombreProyecto: string;
  nombreRecibo: string;
  numeroServicio: string;
  /** Domicilio sin el código postal; lo usa la Carta Poder. */
  direccion: string;
  codigoPostal: string;
  numeroMedidor: string;
  hilos: string | null;
  /** Va junto con `tarifa`: el checkbox de "tarifa nueva" decide qué lista de tarifas se ofrece. */
  usarNuevaTarifa: boolean | null;
  tarifa: string | null;
  /** `"Estado - Municipio"` exacto del catálogo, o `null` si no se encontró. */
  localidadConsumo: string | null;
  periodo: 'Bimestral' | 'Mensual' | null;
  /** `YYYY-MM-DD`: inicio del periodo más reciente (lo que persiste el Paso 2). */
  fechaInicio: string | null;
  /** `DD/MM/AAAA`: lo que muestra el campo de fecha. */
  fechaTexto: string | null;
  /** Del periodo más reciente al más antiguo; puede traer menos de 6. */
  consumos: Array<{ kwh: string; pago: string }>;
  /** Cosas que el asesor debe revisar o completar a mano. */
  avisos: string[];
}

/** `2026-06-12` pasa a `12/06/2026`. */
function aFechaTexto(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function construirAutocompletado(
  resultado: ResultadoReciboCfe,
  localidades: readonly LocalidadCatalogo[]
): PlanAutocompletado {
  const { datos } = resultado;
  const avisos: string[] = [];

  // ── Paso 1: contacto ───────────────────────────────────────────────────
  // Solo se escribe lo que el recibo trae: teléfono, correo, notas, etc. se conservan.
  const contacto: Partial<DatosContacto> = {
    // Un contacto del catálogo ya elegido no debe mezclarse con el titular de otro recibo.
    contactoExistenteId: undefined,
  };
  if (datos.contacto.nombre) contacto.nombre = datos.contacto.nombre;
  if (datos.contacto.apellidoPaterno) contacto.apellidoPaterno = datos.contacto.apellidoPaterno;
  if (datos.contacto.apellidoMaterno) contacto.apellidoMaterno = datos.contacto.apellidoMaterno;
  if (datos.estado) contacto.estado = datos.estado;
  if (datos.localidad) contacto.localidad = datos.localidad;
  if (datos.nombreCliente) {
    avisos.push('Revisa el nombre y los apellidos del contacto: se separaron del nombre impreso en el recibo.');
  }

  // ── Paso 2: tarifa ─────────────────────────────────────────────────────
  let usarNuevaTarifa: boolean | null = null;
  let tarifa: string | null = null;
  if (datos.tarifa) {
    if (tarifasNuevas.includes(datos.tarifa)) {
      usarNuevaTarifa = true;
      tarifa = datos.tarifa;
    } else if (tarifasClasicas.includes(datos.tarifa)) {
      usarNuevaTarifa = false;
      tarifa = datos.tarifa;
    } else {
      avisos.push(`La tarifa «${datos.tarifa}» no está en el catálogo del Paso 2: elígela a mano.`);
    }
  }

  // ── Paso 2: localidad de consumo ───────────────────────────────────────
  let localidadConsumo: string | null = null;
  if (datos.estado) {
    const encontrada = buscarLocalidadCatalogo(
      { estado: datos.estado, localidad: datos.localidad, municipio: datos.municipio },
      localidades
    );
    if (encontrada) {
      localidadConsumo = `${encontrada.estado} - ${encontrada.nombre}`;
    } else {
      const impreso = datos.municipio || datos.localidad;
      avisos.push(
        `No se encontró «${impreso}» (${datos.estado}) en el catálogo de localidades: elige el municipio en el Paso 2.`
      );
    }
  } else {
    avisos.push('No se reconoció el estado del domicilio: elige estado y municipio en el Paso 2.');
  }

  // ── Paso 2: periodo y consumos ─────────────────────────────────────────
  const consumos = datos.consumosHistoricos.map((c) => ({
    kwh: String(c.kwh),
    pago: c.importe.toFixed(2),
  }));
  if (consumos.length > 0 && consumos.length < 6) {
    avisos.push(`Solo se leyeron ${consumos.length} de 6 periodos: captura los que faltan.`);
  }
  if (consumos.length === 0) avisos.push('No se leyó el histórico de consumo: captúralo a mano.');

  return {
    contacto,
    nombreProyecto: datos.nombreProyecto,
    nombreRecibo: datos.nombreCliente,
    numeroServicio: datos.numeroServicio,
    direccion: datos.direccion,
    codigoPostal: datos.codigoPostal,
    numeroMedidor: datos.numeroMedidor,
    hilos: datos.hilos || null,
    usarNuevaTarifa,
    tarifa,
    localidadConsumo,
    periodo: datos.periodo,
    fechaInicio: datos.fechaInicio || null,
    fechaTexto: datos.fechaInicio ? aFechaTexto(datos.fechaInicio) : null,
    consumos,
    avisos,
  };
}
