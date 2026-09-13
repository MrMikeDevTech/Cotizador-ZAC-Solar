import type { PrismaClient, Prisma } from '../generated/prisma/client.ts';
import {
  calcularPromedios,
  calcularDimensionamiento,
  calcularTotalesCotizacion,
  calcularBeneficiosAmbientales,
  calcularROI,
  calcularTIR5Anos,
  generarCodigoAbreviado,
  type GuardarProyectoInput,
} from '@cotizador/shared';
import { NoEncontradoError, ErrorApi } from '../errores.ts';

type Cliente = PrismaClient | Prisma.TransactionClient;

async function resolverContacto(tx: Cliente, payload: GuardarProyectoInput): Promise<string> {
  const { datosContacto } = payload;

  if (datosContacto.contactoExistenteId) {
    const existente = await tx.contacto.findUnique({ where: { id: datosContacto.contactoExistenteId } });
    if (!existente || existente.deletedAt) throw new NoEncontradoError('Contacto');
    return existente.id;
  }

  const nombreCompleto = [datosContacto.nombre, datosContacto.apellidoPaterno, datosContacto.apellidoMaterno]
    .filter(Boolean)
    .join(' ');

  const contacto = await tx.contacto.create({
    data: {
      codigo: generarCodigoAbreviado(nombreCompleto, String(Date.now()).slice(-6)),
      nombre: datosContacto.nombre,
      apellidoPaterno: datosContacto.apellidoPaterno,
      apellidoMaterno: datosContacto.apellidoMaterno,
      telefono: datosContacto.telefono,
      celular: datosContacto.celular,
      email: datosContacto.email,
      estado: datosContacto.estado,
      localidad: datosContacto.localidad,
      fuenteContacto: datosContacto.fuenteContacto,
      estatus: datosContacto.estatus,
      notas: datosContacto.notas,
      esEmpresa: datosContacto.mostrarEmpresariales,
      rfc: datosContacto.empresariales.rfc,
      cargo: datosContacto.empresariales.cargo,
      razonSocial: datosContacto.empresariales.razonSocial,
      actividadComercial: datosContacto.empresariales.actividadComercial,
    },
  });

  return contacto.id;
}

async function construirSnapshotCotizacion(tx: Cliente, payload: GuardarProyectoInput) {
  const factoresRaw = await tx.factoresCalculo.findUnique({ where: { id: '1' } });
  if (!factoresRaw) throw new ErrorApi('SIN_CONFIGURAR', 'Los factores de cálculo no están configurados', 500);
  const factores = { ...factoresRaw, factoresEstacionales: JSON.parse(factoresRaw.factoresEstacionales) as number[] };

  const panel = payload.equipo.panelClave
    ? await tx.panel.findUnique({ where: { clave: payload.equipo.panelClave } })
    : null;
  const inversor = payload.equipo.inversorClave
    ? await tx.inversor.findUnique({ where: { clave: payload.equipo.inversorClave } })
    : null;
  const estructura = payload.otrosCargos.estructuraId
    ? await tx.estructura.findUnique({ where: { id: payload.otrosCargos.estructuraId } })
    : null;

  const { consumoPromedioKwh, pagoPromedioCFE } = calcularPromedios(payload.datosProyecto.consumos);

  const dimensionamiento = calcularDimensionamiento({
    panel: panel ?? undefined,
    cantPaneles: payload.equipo.cantPaneles,
    consumoPromedioKwh,
    pagoPromedioCFE,
    factores,
  });

  const totales = calcularTotalesCotizacion({
    conceptos: payload.otrosCargos.conceptos,
    cargosEditables: payload.otrosCargos.cargosEditables,
    precioEstructura: estructura?.precio ?? 0,
    descuento5: payload.otrosCargos.descuento5,
    descuento10: payload.otrosCargos.descuento10,
    incluirIva: payload.otrosCargos.incluirIva,
    ivaPorcentaje: factores.ivaPorcentaje,
  });

  const multiplicadorAnual = payload.datosProyecto.periodo === 'Bimestral' ? 6 : 12;
  const ahorroAnual = dimensionamiento.ahorro * multiplicadorAnual;

  const ambiental = calcularBeneficiosAmbientales(
    dimensionamiento.produccion,
    payload.datosProyecto.periodo,
    factores.factorCo2,
    factores.factorArboles,
    factores.factorKmAuto
  );

  const roiTexto = calcularROI(totales.granTotal, ahorroAnual);
  const tirPorcentaje = calcularTIR5Anos(totales.granTotal, ahorroAnual, factores.inflacionCfe);

  return {
    panel,
    inversor,
    estructura,
    consumoPromedioKwh,
    pagoPromedioCFE,
    dimensionamiento,
    totales,
    ahorroAnual,
    ambiental,
    roiTexto,
    tirPorcentaje,
  };
}

export async function guardarProyecto(
  prisma: PrismaClient,
  payload: GuardarProyectoInput,
  proyectoIdExistente?: string
) {
  return prisma.$transaction(async (tx) => {
    const contactoId = await resolverContacto(tx, payload);
    const snapshot = await construirSnapshotCotizacion(tx, payload);

    const datosProyecto = {
      contactoId,
      nombre: payload.datosProyecto.nombreProyecto,
      localidadConsumo: payload.datosProyecto.localidadConsumo,
      hilos: payload.datosProyecto.hilos,
      nombreRecibo: payload.datosProyecto.nombreRecibo,
      numeroServicio: payload.datosProyecto.numeroServicio,
      tarifa: payload.datosProyecto.tarifaSeleccionada,
      usarNuevaTarifa: payload.datosProyecto.usarNuevaTarifa,
      ivaCfe: payload.datosProyecto.ivaCFE,
      aplicarDac: payload.datosProyecto.aplicarDac,
      aplicarDap: payload.datosProyecto.aplicarDap,
      porcentajeDap: payload.datosProyecto.porcentajeDap,
      periodo: payload.datosProyecto.periodo,
      fechaInicio: payload.datosProyecto.fechaInicio,
      estatus: payload.estatus,
      pasoActual: payload.pasoActual,
    };

    let proyectoId: string;
    let siguienteVersion = 1;

    if (proyectoIdExistente) {
      const existente = await tx.proyecto.findUnique({ where: { id: proyectoIdExistente } });
      if (!existente || existente.deletedAt) throw new NoEncontradoError('Proyecto');

      await tx.proyecto.update({ where: { id: proyectoIdExistente }, data: datosProyecto });
      await tx.consumoPeriodo.deleteMany({ where: { proyectoId: proyectoIdExistente } });
      proyectoId = proyectoIdExistente;

      const totalCotizaciones = await tx.cotizacion.count({ where: { proyectoId } });
      siguienteVersion = totalCotizaciones + 1;
    } else {
      const codigo = generarCodigoAbreviado(
        payload.datosProyecto.nombreProyecto || 'proyecto',
        String(Date.now()).slice(-6)
      );
      const nuevoProyecto = await tx.proyecto.create({ data: { codigo, ...datosProyecto } });
      proyectoId = nuevoProyecto.id;
    }

    await tx.consumoPeriodo.createMany({
      data: payload.datosProyecto.consumos.map((consumo, orden) => ({
        proyectoId,
        orden,
        inicioStr: consumo.inicioStr,
        terminoStr: consumo.terminoStr,
        kwh: Number(consumo.kwh) || 0,
        pago: Number(consumo.pago) || 0,
      })),
    });

    const cotizacion = await tx.cotizacion.create({
      data: {
        proyectoId,
        version: siguienteVersion,
        panelId: snapshot.panel?.id,
        panelClave: snapshot.panel?.clave ?? '',
        panelNombre: snapshot.panel?.nombre ?? '',
        panelWatts: snapshot.panel?.watts ?? 0,
        cantPaneles: payload.equipo.cantPaneles,
        inversorId: snapshot.inversor?.id,
        inversorClave: snapshot.inversor?.clave ?? '',
        inversorNombre: snapshot.inversor?.nombre ?? '',
        inversorWattsMax: snapshot.inversor?.wattsMax ?? 0,
        cantInversores: payload.equipo.cantInversores,
        estructuraId: snapshot.estructura?.id,
        estructuraNombre: snapshot.estructura?.nombre ?? '',
        estructuraPrecio: snapshot.estructura?.precio ?? 0,
        tamanoSistemaW: snapshot.dimensionamiento.tamanoSistema,
        produccionPeriodo: snapshot.dimensionamiento.produccion,
        autoconsumoPct: snapshot.dimensionamiento.autoconsumo,
        nuevoPago: snapshot.dimensionamiento.nuevoPago,
        ahorroPeriodo: snapshot.dimensionamiento.ahorro,
        ahorroAnual: snapshot.ahorroAnual,
        subtotalGeneral: snapshot.totales.subtotalGeneral,
        montoDescuento: snapshot.totales.montoDescuento,
        subtotalConDescuento: snapshot.totales.subtotalConDescuento,
        montoIva: snapshot.totales.montoIVA,
        granTotal: snapshot.totales.granTotal,
        roiTexto: snapshot.roiTexto,
        tirPorcentaje: snapshot.tirPorcentaje,
        kgCo2: snapshot.ambiental.kgCO2,
        arboles: snapshot.ambiental.arboles,
        kmAuto: snapshot.ambiental.kmAuto,
        metodoPrecio: payload.otrosCargos.metodoPrecio,
        tipoMoneda: payload.otrosCargos.tipoMoneda,
        valorDolar: payload.otrosCargos.valorDolar,
        incluirIva: payload.otrosCargos.incluirIva,
        ocultarDesglose: payload.otrosCargos.ocultarDesglose,
        descuento5: payload.otrosCargos.descuento5,
        descuento10: payload.otrosCargos.descuento10,
        conceptos: {
          create: payload.otrosCargos.conceptos.map((concepto, orden) => ({
            concepto: concepto.concepto,
            costoBase: concepto.costoBase,
            margenPorcentaje: concepto.margenPorcentaje,
            orden,
          })),
        },
        cargos: {
          create: payload.otrosCargos.cargosEditables.map((cargo, orden) => ({
            nombre: cargo.nombre,
            monto: cargo.monto,
            orden,
          })),
        },
      },
      include: { conceptos: true, cargos: true },
    });

    return obtenerProyectoHidratado(tx, proyectoId, cotizacion.id);
  });
}

export async function obtenerProyectoHidratado(tx: Cliente, proyectoId: string, cotizacionId?: string) {
  const proyecto = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      contacto: true,
      consumos: { orderBy: { orden: 'asc' } },
      cotizaciones: {
        where: cotizacionId ? { id: cotizacionId } : undefined,
        orderBy: { version: 'desc' },
        take: 1,
        include: { conceptos: { orderBy: { orden: 'asc' } }, cargos: { orderBy: { orden: 'asc' } } },
      },
    },
  });
  if (!proyecto || proyecto.deletedAt) throw new NoEncontradoError('Proyecto');
  return proyecto;
}

export { construirSnapshotCotizacion };
