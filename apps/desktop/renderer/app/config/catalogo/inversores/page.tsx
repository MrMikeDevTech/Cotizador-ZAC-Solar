'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import { useConfiguracion } from '../../../../lib/ConfiguracionContext';
import { DataTable, type ColumnaTabla } from '../../../components/DataTable';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Pagination } from '../../../components/Pagination';
import { Icono } from '../../../components/Icono';

interface Inversor {
  id: string;
  clave: string;
  nombre: string;
  wattsMax: number;
  precioUnitario: number;
}

interface FormInversor extends Omit<Inversor, 'id' | 'clave'> {}

const INVERSOR_VACIO: FormInversor = {
  nombre: 'Nuevo inversor',
  wattsMax: 5000,
  precioUnitario: 13500,
};

export default function ConfigInversores() {
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const totalPaginas = Math.ceil(inversores.length / porPagina);
  const inversoresEnPagina = inversores.slice((pagina - 1) * porPagina, pagina * porPagina);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [inversorEditando, setInversorEditando] = useState<Inversor | null>(null);
  const [formulario, setFormulario] = useState<FormInversor>(INVERSOR_VACIO);

  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [inversorABorrar, setInversorABorrar] = useState<Inversor | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const { invalidar, refrescar } = useConfiguracion();

  const cargar = async () => {
    try {
      setCargando(true);
      const datos = await api.get<{ inversores: Inversor[] }>('/api/config');
      setInversores(datos.inversores ?? []);
    } catch (err) {
      toast.error('No se pudo cargar los inversores.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirEdicion = (inversor: Inversor | null) => {
    if (inversor) {
      setInversorEditando(inversor);
      setFormulario({ nombre: inversor.nombre, wattsMax: inversor.wattsMax, precioUnitario: inversor.precioUnitario });
    } else {
      setInversorEditando(null);
      setFormulario(INVERSOR_VACIO);
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setInversorEditando(null);
    setFormulario(INVERSOR_VACIO);
  };

  const guardar = async () => {
    if (!formulario.nombre.trim()) {
      toast.error('El nombre del inversor es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      if (inversorEditando) {
        await api.put(`/api/config/inversores/${inversorEditando.id}`, formulario);
        toast.success(`Inversor "${formulario.nombre}" actualizado.`);
      } else {
        await api.post('/api/config/inversores', {
          clave: `inversor_${Date.now()}`,
          ...formulario,
          activo: true,
          orden: inversores.length,
        });
        toast.success(`Inversor "${formulario.nombre}" creado.`);
      }
      invalidar();
      await refrescar();
      cerrarModal();
      await cargar();
    } catch (err) {
      toast.error('Error al guardar el inversor. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrar = (inversor: Inversor) => {
    setInversorABorrar(inversor);
    setConfirmBorrar(true);
  };

  const borrar = async () => {
    if (!inversorABorrar) return;
    setBorrando(true);
    try {
      await api.del(`/api/config/inversores/${inversorABorrar.id}`);
      toast.success(`Inversor "${inversorABorrar.nombre}" eliminado.`);
      invalidar();
      await refrescar();
      setInversores((prev) => prev.filter((i) => i.id !== inversorABorrar.id));
      if (inversoresEnPagina.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      }
    } catch (err) {
      toast.error('Error al eliminar el inversor.');
    } finally {
      setBorrando(false);
      setConfirmBorrar(false);
      setInversorABorrar(null);
    }
  };

  const columnas: ColumnaTabla<Inversor>[] = [
    { clave: 'nombre', encabezado: 'Nombre', ordenable: true, anchoMin: '200px' },
    { clave: 'wattsMax', encabezado: 'Potencia Máxima (W)', ordenable: true },
    { clave: 'precioUnitario', encabezado: 'Precio Unitario (MXN)', ordenable: true },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (inversor) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => abrirEdicion(inversor)}
            className="p-1.5 text-[#00388d] hover:bg-blue-100 rounded transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Icono icon={Edit2} size={16} />
          </button>
          <button
            type="button"
            onClick={() => confirmarBorrar(inversor)}
            className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors cursor-pointer"
            aria-label="Eliminar"
          >
            <Icono icon={Trash2} size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#8e94f2] p-4 md:p-8 font-sans text-gray-800 flex justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 md:p-10 relative h-max space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#00388d]">Inversores</h2>
            <p className="text-xs text-gray-500 mt-1">{inversores.length} inversor(es) registrado(s)</p>
          </div>
          <button
            type="button"
            onClick={() => abrirEdicion(null)}
            className="bg-[#f7931e] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-500 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Icono icon={Plus} size={16} />
            Agregar inversor
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : inversores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">No hay inversores registrados</p>
            <button
              type="button"
              onClick={() => abrirEdicion(null)}
              className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer"
            >
              Crear el primer inversor
            </button>
          </div>
        ) : (
          <>
            <DataTable<Inversor>
              columnas={columnas}
              filas={inversoresEnPagina}
              claveFila={(i) => i.id}
              vacio="No hay inversores en esta página"
            />
            <Pagination
              paginaActual={pagina}
              totalPaginas={totalPaginas}
              onCambiar={setPagina}
              totalRegistros={inversores.length}
            />
          </>
        )}
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={inversorEditando ? 'Editar inversor' : 'Nuevo inversor'}
        tamano="md"
        footer={
          <>
            <button
              type="button"
              onClick={cerrarModal}
              disabled={guardando}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#f7931e] hover:bg-orange-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              value={formulario.nombre}
              onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Nombre comercial del inversor</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Potencia máxima (watts)</label>
            <input
              type="number"
              value={formulario.wattsMax}
              onChange={(e) => setFormulario({ ...formulario, wattsMax: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Capacidad máxima de procesamiento del inversor en watts</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Precio unitario (MXN)</label>
            <input
              type="number"
              value={formulario.precioUnitario}
              onChange={(e) => setFormulario({ ...formulario, precioUnitario: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Costo por unidad en pesos mexicanos</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        abierto={confirmBorrar}
        onCerrar={() => {
          setConfirmBorrar(false);
          setInversorABorrar(null);
        }}
        onConfirmar={borrar}
        titulo="Eliminar inversor"
        mensaje={`¿Estás seguro de que deseas eliminar el inversor "${inversorABorrar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        peligroso={true}
      />
    </div>
  );
}
