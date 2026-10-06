'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { api } from '../../../lib/api';
import { DataTable, type ColumnaTabla } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { Icono } from '../../components/Icono';

interface CotizacionListado {
  id: string;
  version: number;
  createdAt: string;
  granTotal: number;
  proyecto: {
    id: string;
    codigo: string;
    nombre: string;
    contacto: {
      nombre: string;
      apellidoPaterno: string;
    };
  };
}

interface CotizacionDetalle extends CotizacionListado {
  conceptos: Array<{ id: string; concepto: string; costoBase: number; margenPorcentaje: number; [key: string]: unknown }>;
  cargos: Array<{ id: string; cargo: string; monto: number; [key: string]: unknown }>;
}

interface RespuestaListado {
  datos: CotizacionListado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export default function ConfigHistorial() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<CotizacionDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [totalCotizaciones, setTotalCotizaciones] = useState(0);
  const totalPaginas = Math.ceil(totalCotizaciones / porPagina);

  const cargar = async (p: number) => {
    try {
      setCargando(true);
      const respuesta = await api.get<RespuestaListado>(`/api/cotizacion?pagina=${p}&porPagina=${porPagina}`);
      setCotizaciones(respuesta.datos ?? []);
      setTotalCotizaciones(respuesta.total ?? 0);
    } catch (err) {
      toast.error('No se pudo cargar el historial de cotizaciones.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(pagina);
  }, [pagina]);

  const abrirDetalle = async (cotizacionId: string) => {
    setCargandoDetalle(true);
    try {
      const detalle = await api.get<CotizacionDetalle>(`/api/cotizacion/${cotizacionId}`);
      setDetalleSeleccionado(detalle);
      setDetalleAbierto(true);
    } catch (err) {
      toast.error('No se pudo cargar los detalles de la cotización.');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const formatearFecha = (fecha: string): string => {
    try {
      return new Date(fecha).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fecha;
    }
  };

  const formatearDinero = (monto: number): string => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  };

  const columnas: ColumnaTabla<CotizacionListado>[] = [
    { clave: 'proyecto.codigo', encabezado: 'Código', ordenable: true },
    { clave: 'proyecto.nombre', encabezado: 'Proyecto', ordenable: true, anchoMin: '200px' },
    {
      clave: 'proyecto.contacto',
      encabezado: 'Contacto',
      render: (cot) => `${cot.proyecto.contacto.nombre} ${cot.proyecto.contacto.apellidoPaterno}`,
    },
    { clave: 'version', encabezado: 'Versión', ordenable: true },
    {
      clave: 'granTotal',
      encabezado: 'Gran Total',
      render: (cot) => formatearDinero(cot.granTotal),
    },
    {
      clave: 'createdAt',
      encabezado: 'Fecha',
      render: (cot) => formatearFecha(cot.createdAt),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (cotizacion) => (
        <button
          type="button"
          onClick={() => abrirDetalle(cotizacion.id)}
          className="p-1.5 text-[#00388d] hover:bg-blue-100 rounded transition-colors cursor-pointer"
          aria-label="Ver detalles"
        >
          <Icono icon={Eye} size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#00388d]">Historial de cotizaciones</h2>
          <p className="text-xs text-gray-500 mt-1">{totalCotizaciones} cotización(es) registrada(s)</p>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : cotizaciones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No hay cotizaciones registradas</p>
          </div>
        ) : (
          <>
            <DataTable<CotizacionListado>
              columnas={columnas}
              filas={cotizaciones}
              claveFila={(c) => c.id}
              vacio="No hay cotizaciones en esta página"
            />
            <Pagination
              paginaActual={pagina}
              totalPaginas={totalPaginas}
              onCambiar={setPagina}
              totalRegistros={totalCotizaciones}
            />
          </>
        )}
      </div>

      <Modal
        abierto={detalleAbierto}
        onCerrar={() => {
          setDetalleAbierto(false);
          setDetalleSeleccionado(null);
        }}
        titulo={`Cotización - ${detalleSeleccionado?.proyecto.codigo}`}
        tamano="lg"
      >
        {cargandoDetalle ? (
          <p className="text-sm text-gray-400">Cargando detalles…</p>
        ) : detalleSeleccionado ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Proyecto</p>
                <p className="text-sm font-semibold text-gray-800">{detalleSeleccionado.proyecto.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contacto</p>
                <p className="text-sm font-semibold text-gray-800">
                  {detalleSeleccionado.proyecto.contacto.nombre} {detalleSeleccionado.proyecto.contacto.apellidoPaterno}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Versión</p>
                <p className="text-sm font-semibold text-gray-800">{detalleSeleccionado.version}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="text-sm font-semibold text-gray-800">{formatearFecha(detalleSeleccionado.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gran Total</p>
                <p className="text-sm font-bold text-[#f7931e]">{formatearDinero(detalleSeleccionado.granTotal)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#00388d] mb-3">Conceptos</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {detalleSeleccionado.conceptos.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2">Concepto</th>
                        <th className="text-right py-2 px-2">Costo Base</th>
                        <th className="text-right py-2 px-2">Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleSeleccionado.conceptos.map((concepto) => (
                        <tr key={concepto.id} className="border-b border-gray-100">
                          <td className="py-2 px-2">{concepto.concepto}</td>
                          <td className="text-right py-2 px-2">{formatearDinero(concepto.costoBase)}</td>
                          <td className="text-right py-2 px-2">{concepto.margenPorcentaje}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-400">Sin conceptos</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#00388d] mb-3">Cargos adicionales</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {detalleSeleccionado.cargos.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2">Cargo</th>
                        <th className="text-right py-2 px-2">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleSeleccionado.cargos.map((cargo) => (
                        <tr key={cargo.id} className="border-b border-gray-100">
                          <td className="py-2 px-2">{cargo.cargo}</td>
                          <td className="text-right py-2 px-2">{formatearDinero(cargo.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-400">Sin cargos adicionales</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
