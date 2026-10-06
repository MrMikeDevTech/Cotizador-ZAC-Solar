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

interface Estructura {
  id: string;
  nombre: string;
  precio: number;
}

interface FormEstructura extends Omit<Estructura, 'id'> {}

const ESTRUCTURA_VACIA: FormEstructura = {
  nombre: 'Nueva estructura',
  precio: 0,
};

export default function ConfigEstructuras() {
  const [estructuras, setEstructuras] = useState<Estructura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const totalPaginas = Math.ceil(estructuras.length / porPagina);
  const estructurasEnPagina = estructuras.slice((pagina - 1) * porPagina, pagina * porPagina);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [estructuraEditando, setEstructuraEditando] = useState<Estructura | null>(null);
  const [formulario, setFormulario] = useState<FormEstructura>(ESTRUCTURA_VACIA);

  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [estructuraABorrar, setEstructuraABorrar] = useState<Estructura | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const { invalidar, refrescar } = useConfiguracion();

  const cargar = async () => {
    try {
      setCargando(true);
      const datos = await api.get<{ estructuras: Estructura[] }>('/api/config');
      setEstructuras(datos.estructuras ?? []);
    } catch (err) {
      toast.error('No se pudo cargar las estructuras.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirEdicion = (estructura: Estructura | null) => {
    if (estructura) {
      setEstructuraEditando(estructura);
      setFormulario({ nombre: estructura.nombre, precio: estructura.precio });
    } else {
      setEstructuraEditando(null);
      setFormulario(ESTRUCTURA_VACIA);
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEstructuraEditando(null);
    setFormulario(ESTRUCTURA_VACIA);
  };

  const guardar = async () => {
    if (!formulario.nombre.trim()) {
      toast.error('El nombre de la estructura es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      if (estructuraEditando) {
        await api.put(`/api/config/estructuras/${estructuraEditando.id}`, formulario);
        toast.success(`Estructura "${formulario.nombre}" actualizada.`);
      } else {
        await api.post('/api/config/estructuras', {
          ...formulario,
          activo: true,
          orden: estructuras.length,
        });
        toast.success(`Estructura "${formulario.nombre}" creada.`);
      }
      invalidar();
      await refrescar();
      cerrarModal();
      await cargar();
    } catch (err) {
      toast.error('Error al guardar la estructura. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrar = (estructura: Estructura) => {
    setEstructuraABorrar(estructura);
    setConfirmBorrar(true);
  };

  const borrar = async () => {
    if (!estructuraABorrar) return;
    setBorrando(true);
    try {
      await api.del(`/api/config/estructuras/${estructuraABorrar.id}`);
      toast.success(`Estructura "${estructuraABorrar.nombre}" eliminada.`);
      invalidar();
      await refrescar();
      setEstructuras((prev) => prev.filter((e) => e.id !== estructuraABorrar.id));
      if (estructurasEnPagina.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      }
    } catch (err) {
      toast.error('Error al eliminar la estructura.');
    } finally {
      setBorrando(false);
      setConfirmBorrar(false);
      setEstructuraABorrar(null);
    }
  };

  const columnas: ColumnaTabla<Estructura>[] = [
    { clave: 'nombre', encabezado: 'Nombre', ordenable: true, anchoMin: '200px' },
    { clave: 'precio', encabezado: 'Precio (MXN)', ordenable: true },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (estructura) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => abrirEdicion(estructura)}
            className="p-1.5 text-[#00388d] hover:bg-blue-100 rounded transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Icono icon={Edit2} size={16} />
          </button>
          <button
            type="button"
            onClick={() => confirmarBorrar(estructura)}
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
            <h2 className="text-2xl font-bold text-[#00388d]">Estructuras de instalación</h2>
            <p className="text-xs text-gray-500 mt-1">{estructuras.length} estructura(s) registrada(s)</p>
          </div>
          <button
            type="button"
            onClick={() => abrirEdicion(null)}
            className="bg-[#f7931e] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-500 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Icono icon={Plus} size={16} />
            Agregar estructura
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : estructuras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">No hay estructuras registradas</p>
            <button
              type="button"
              onClick={() => abrirEdicion(null)}
              className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer"
            >
              Crear la primera estructura
            </button>
          </div>
        ) : (
          <>
            <DataTable<Estructura>
              columnas={columnas}
              filas={estructurasEnPagina}
              claveFila={(e) => e.id}
              vacio="No hay estructuras en esta página"
            />
            <Pagination
              paginaActual={pagina}
              totalPaginas={totalPaginas}
              onCambiar={setPagina}
              totalRegistros={estructuras.length}
            />
          </>
        )}
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={estructuraEditando ? 'Editar estructura' : 'Nueva estructura'}
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
            <p className="text-xs text-gray-400 mt-1">Nombre o descripción de la estructura de instalación</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Precio (MXN)</label>
            <input
              type="number"
              value={formulario.precio}
              onChange={(e) => setFormulario({ ...formulario, precio: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Costo total de la estructura en pesos mexicanos</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        abierto={confirmBorrar}
        onCerrar={() => {
          setConfirmBorrar(false);
          setEstructuraABorrar(null);
        }}
        onConfirmar={borrar}
        titulo="Eliminar estructura"
        mensaje={`¿Estás seguro de que deseas eliminar la estructura "${estructuraABorrar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        peligroso={true}
      />
    </div>
  );
}
