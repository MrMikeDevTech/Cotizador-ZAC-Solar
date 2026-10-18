'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Card from '../../proyectos/nuevo/components/confirmacion/Card';
import { ApiError, api } from '../../../lib/api';

interface Concepto {
  id: string;
  concepto: string;
  costoBase: number;
  margenPorcentaje: number;
}

interface Factores {
  ivaPorcentaje: number;
  precioPanelDefault: number;
  precioInversorDefault: number;
  [key: string]: unknown;
}

interface Empresa {
  nombre: string;
  telefono: string;
  localidad: string;
  email: string;
  descripcion: string;
  tituloCotizacion: string;
  introPlantilla: string;
  observaciones: string;
  firmaNombre: string;
  firmaPuesto: string;
}

const EMPRESA_VACIA: Empresa = {
  nombre: '',
  telefono: '',
  localidad: '',
  email: '',
  descripcion: '',
  tituloCotizacion: '',
  introPlantilla: '',
  observaciones: '',
  firmaNombre: '',
  firmaPuesto: '',
};

/**
 * Recorta la fila de la API a los campos que este formulario edita. La API
 * devuelve la fila completa de Prisma (`id`, `createdAt`, `logoPath`, `rfc`
 * posiblemente null); reenviarla al guardar es lo que rompía el PUT.
 */
function soloCamposDelFormulario(fila: Partial<Empresa>): Empresa {
  return {
    nombre: fila.nombre ?? '',
    telefono: fila.telefono ?? '',
    localidad: fila.localidad ?? '',
    email: fila.email ?? '',
    descripcion: fila.descripcion ?? '',
    tituloCotizacion: fila.tituloCotizacion ?? '',
    introPlantilla: fila.introPlantilla ?? '',
    observaciones: fila.observaciones ?? '',
    firmaNombre: fila.firmaNombre ?? '',
    firmaPuesto: fila.firmaPuesto ?? '',
  };
}

/** Traduce el error del backend a algo accionable, nombrando el campo. */
function describirFalloAlGuardar(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudo guardar los datos de la empresa.';
  if (error.codigo !== 'VALIDACION') return error.message || 'No se pudo guardar los datos de la empresa.';

  const primera = Array.isArray(error.detalles) ? (error.detalles[0] as { path?: unknown[] }) : null;
  const campo = primera?.path?.[0];
  return campo
    ? `El campo "${String(campo)}" no es válido; revísalo y vuelve a guardar.`
    : 'Algún dato no es válido; revísalo y vuelve a guardar.';
}

export default function ConfigCotizacion() {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [factores, setFactores] = useState<Factores | null>(null);
  const [empresa, setEmpresa] = useState<Empresa>(EMPRESA_VACIA);
  const [cargando, setCargando] = useState(true);
  const [guardandoFactores, setGuardandoFactores] = useState(false);
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);

  useEffect(() => {
    api
      .get<{ conceptos: Concepto[]; factores: Factores; empresa: Empresa | null }>('/api/config')
      .then((datos) => {
        setConceptos(datos.conceptos);
        setFactores(datos.factores);
        // Sólo los campos del formulario. La fila que devuelve la API trae
        // además `id`, `createdAt`, `logoPath` y un `rfc` que puede ser null;
        // guardarla entera en el estado hacía que el PUT los reenviara y el
        // validador rechazara el guardado completo.
        setEmpresa(datos.empresa ? soloCamposDelFormulario(datos.empresa) : EMPRESA_VACIA);
      })
      .catch(() => {
        toast.error('No se pudo conectar con el backend local.');
      })
      .finally(() => setCargando(false));
  }, []);

  /**
   * Guarda la empresa. Las dos primeras tarjetas editan **un mismo registro**
   * (`Empresa`, el singleton `id: '1'`), así que cualquiera de sus botones
   * guarda todo: no son secciones independientes aunque lo parezcan.
   *
   * La validación del nombre se repite aquí a propósito. El backend ya la
   * exige (`empresaSchema.nombre.min(1)`) pero responde con un genérico
   * "Datos inválidos", que llegaba al usuario como "no se pudo guardar" sin
   * decir qué faltaba: con la empresa todavía sin configurar, escribir sólo
   * el título del PDF y pulsar Guardar fallaba sin forma de saber por qué.
   * El nombre no puede volverse opcional —es lo que distingue "empresa
   * configurada" de "sin configurar", y de eso depende que la cotización
   * salga sin encabezado inventado—, así que lo que faltaba era decirlo.
   */
  const guardarEmpresa = async () => {
    if (empresa.nombre.trim() === '') {
      toast.error('Escribe el nombre de la empresa: es lo único obligatorio para poder guardar.');
      document.getElementById('empresa-nombre')?.focus();
      return;
    }

    setGuardandoEmpresa(true);
    try {
      const actualizada = await api.put<Empresa>('/api/config/empresa', empresa);
      setEmpresa(soloCamposDelFormulario(actualizada));
      toast.success('Datos de la empresa guardados.');
    } catch (error) {
      // Se nombra el campo que el validador rechazó. El mensaje genérico
      // "no se pudo guardar" dejaba al usuario sin nada que corregir: el
      // fallo real podía estar en un campo que ni siquiera había tocado.
      toast.error(describirFalloAlGuardar(error));
    } finally {
      setGuardandoEmpresa(false);
    }
  };

  const guardarConcepto = async (concepto: Concepto) => {
    try {
      await api.put(`/api/config/conceptos/${concepto.id}`, {
        concepto: concepto.concepto,
        costoBase: concepto.costoBase,
        margenPorcentaje: concepto.margenPorcentaje,
      });
      toast.success(`Concepto "${concepto.concepto}" guardado.`);
    } catch {
      toast.error('No se pudo guardar el concepto.');
    }
  };

  const eliminarConcepto = async (id: string) => {
    try {
      await api.del(`/api/config/conceptos/${id}`);
      setConceptos((prev) => prev.filter((c) => c.id !== id));
      toast.success('Concepto eliminado.');
    } catch {
      toast.error('No se pudo eliminar el concepto.');
    }
  };

  const agregarConcepto = async () => {
    try {
      const nuevo = await api.post<Concepto>('/api/config/conceptos', {
        concepto: 'Nuevo concepto',
        costoBase: 0,
        margenPorcentaje: 0,
        orden: conceptos.length,
        activo: true,
      });
      setConceptos((prev) => [...prev, nuevo]);
      toast.success('Concepto creado.');
    } catch {
      toast.error('No se pudo crear el concepto.');
    }
  };

  const guardarFactores = async () => {
    if (!factores) return;
    setGuardandoFactores(true);
    try {
      const actualizado = await api.put<Factores>('/api/config/factores', factores);
      setFactores(actualizado);
      toast.success('Precios y ajustes guardados.');
    } catch {
      toast.error('No se pudo guardar.');
    } finally {
      setGuardandoFactores(false);
    }
  };

  if (cargando || !factores) {
    return (
      <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 flex justify-center">
        <p className="text-sm text-white">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <h2 className="text-2xl font-bold text-[#00388d]">Formato de cotización</h2>
        <p className="text-sm text-gray-500 -mt-4">
          Define cómo se ve el PDF que recibe el cliente: quién lo emite, con qué texto y con qué
          precios arranca cada cotización nueva. Se configura una vez y aplica a todos los proyectos.
        </p>

        <Card title="Datos de la empresa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="empresa-nombre" className="block text-xs text-gray-400 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="empresa-nombre"
                type="text"
                required
                value={empresa.nombre}
                onChange={(e) => setEmpresa({ ...empresa, nombre: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
              <p className="text-xs text-gray-400 mt-1">
                Obligatorio. Mientras esté vacío no se guarda nada, y las cotizaciones salen sin
                encabezado de empresa.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
              <input
                type="text"
                value={empresa.telefono}
                onChange={(e) => setEmpresa({ ...empresa, telefono: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Localidad</label>
              <input
                type="text"
                value={empresa.localidad}
                onChange={(e) => setEmpresa({ ...empresa, localidad: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={empresa.email}
                onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Descripción</label>
              <textarea
                rows={3}
                value={empresa.descripcion}
                onChange={(e) => setEmpresa({ ...empresa, descripcion: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-8 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={guardarEmpresa}
              disabled={guardandoEmpresa}
              className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {guardandoEmpresa ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </Card>

        <Card title="Formato del PDF de cotización">
          <div className="space-y-6">
            <p className="text-xs text-gray-400">
              Estos campos y los de la tarjeta anterior son el mismo registro: cualquiera de los dos
              botones Guardar los guarda todos.
            </p>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Título del documento</label>
              <input
                type="text"
                value={empresa.tituloCotizacion}
                onChange={(e) => setEmpresa({ ...empresa, tituloCotizacion: e.target.value })}
                placeholder="Ej: Cotización Sistema Fotovoltaico Interconectado"
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
              <p className="text-xs text-gray-400 mt-1">Encabezado que aparece arriba en el PDF</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Párrafo de introducción</label>
              <textarea
                rows={4}
                value={empresa.introPlantilla}
                onChange={(e) => setEmpresa({ ...empresa, introPlantilla: e.target.value })}
                placeholder="Ej: En atención a su interés... ponemos a su disposición la cotización para el suministro e instalación de un sistema de {kwp} kWp con una producción aproximada de {kwh} kWh por periodo."
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Admite los marcadores {'{kwp}'} y {'{kwh}'}, que se sustituyen por el tamaño y la producción del sistema cotizado. Si se deja vacío se usa el texto por defecto.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Observaciones</label>
              <textarea
                rows={3}
                value={empresa.observaciones}
                onChange={(e) => setEmpresa({ ...empresa, observaciones: e.target.value })}
                placeholder="Una por línea. Ej:&#10;Tiempo estimado de instalación 15 días.&#10;Cotización vigente los próximos 20 días."
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d] resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Una por línea. Aparecen al pie del PDF</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre de quien firma</label>
                <input
                  type="text"
                  value={empresa.firmaNombre}
                  onChange={(e) => setEmpresa({ ...empresa, firmaNombre: e.target.value })}
                  placeholder="Nombre completo"
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <p className="text-xs text-gray-400 mt-1">Si se deja vacío, firma quien genera la cotización</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Puesto</label>
                <input
                  type="text"
                  value={empresa.firmaPuesto}
                  onChange={(e) => setEmpresa({ ...empresa, firmaPuesto: e.target.value })}
                  placeholder="Ej: Gerente en área Comercial"
                  className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-8 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={guardarEmpresa}
                disabled={guardandoEmpresa}
                className="bg-[#f7931e] text-white px-8 py-3 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardandoEmpresa ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Card>

        <Card title="Precios sugeridos y ajustes generales">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio sugerido por panel (MXN)</label>
              <input
                type="number"
                value={factores.precioPanelDefault}
                onChange={(e) => setFactores({ ...factores, precioPanelDefault: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio sugerido por inversor (MXN)</label>
              <input
                type="number"
                value={factores.precioInversorDefault}
                onChange={(e) => setFactores({ ...factores, precioInversorDefault: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">IVA (%)</label>
              <input
                type="number"
                value={factores.ivaPorcentaje}
                onChange={(e) => setFactores({ ...factores, ivaPorcentaje: Number(e.target.value) })}
                className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={guardarFactores}
              disabled={guardandoFactores}
              className="bg-[#f7931e] text-white px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {guardandoFactores ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </Card>

        <Card title="Conceptos por defecto de la cotización">
          <div className="space-y-3">
            {conceptos.map((concepto) => (
              <div key={concepto.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center border-b border-gray-50 pb-3">
                <input
                  value={concepto.concepto}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, concepto: e.target.value } : c)))}
                  className="md:col-span-2 border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={concepto.costoBase}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, costoBase: Number(e.target.value) } : c)))}
                  placeholder="Costo base"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <input
                  type="number"
                  value={concepto.margenPorcentaje}
                  onChange={(e) => setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, margenPorcentaje: Number(e.target.value) } : c)))}
                  placeholder="Margen %"
                  className="border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-[#00388d]"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => guardarConcepto(concepto)} className="text-xs border border-[#2dd4bf] text-[#2dd4bf] px-3 py-1 rounded-full hover:bg-teal-50 cursor-pointer">Guardar</button>
                  <button type="button" onClick={() => eliminarConcepto(concepto.id)} className="text-xs border border-red-300 text-red-500 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer">Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarConcepto} className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer">+ Agregar concepto</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
