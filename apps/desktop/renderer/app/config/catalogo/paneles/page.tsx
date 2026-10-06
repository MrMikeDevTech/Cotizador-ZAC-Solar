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

interface Panel {
  id: string;
  clave: string;
  nombre: string;
  watts: number;
  factorBifacial: number;
  precioUnitario: number;
}

interface FormPanel extends Omit<Panel, 'id' | 'clave'> {}

const PANEL_VACIO: FormPanel = {
  nombre: 'Nuevo panel',
  watts: 600,
  factorBifacial: 1,
  precioUnitario: 4400,
};

export default function ConfigPaneles() {
  const [paneles, setPaneles] = useState<Panel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const totalPaginas = Math.ceil(paneles.length / porPagina);
  const panelesEnPagina = paneles.slice((pagina - 1) * porPagina, pagina * porPagina);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [panelEditando, setPanelEditando] = useState<Panel | null>(null);
  const [formulario, setFormulario] = useState<FormPanel>(PANEL_VACIO);

  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [panelABorrar, setPanelABorrar] = useState<Panel | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const { invalidar, refrescar } = useConfiguracion();

  const cargar = async () => {
    try {
      setCargando(true);
      const datos = await api.get<{ paneles: Panel[] }>('/api/config');
      setPaneles(datos.paneles ?? []);
    } catch (err) {
      toast.error('No se pudo cargar los paneles.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirEdicion = (panel: Panel | null) => {
    if (panel) {
      setPanelEditando(panel);
      setFormulario({ nombre: panel.nombre, watts: panel.watts, factorBifacial: panel.factorBifacial, precioUnitario: panel.precioUnitario });
    } else {
      setPanelEditando(null);
      setFormulario(PANEL_VACIO);
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPanelEditando(null);
    setFormulario(PANEL_VACIO);
  };

  const guardar = async () => {
    if (!formulario.nombre.trim()) {
      toast.error('El nombre del panel es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      if (panelEditando) {
        await api.put(`/api/config/paneles/${panelEditando.id}`, formulario);
        toast.success(`Panel "${formulario.nombre}" actualizado.`);
      } else {
        await api.post('/api/config/paneles', {
          clave: `panel_${Date.now()}`,
          ...formulario,
          activo: true,
          orden: paneles.length,
        });
        toast.success(`Panel "${formulario.nombre}" creado.`);
      }
      invalidar();
      await refrescar();
      cerrarModal();
      await cargar();
    } catch (err) {
      toast.error('Error al guardar el panel. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrar = (panel: Panel) => {
    setPanelABorrar(panel);
    setConfirmBorrar(true);
  };

  const borrar = async () => {
    if (!panelABorrar) return;
    setBorrando(true);
    try {
      await api.del(`/api/config/paneles/${panelABorrar.id}`);
      toast.success(`Panel "${panelABorrar.nombre}" eliminado.`);
      invalidar();
      await refrescar();
      setPaneles((prev) => prev.filter((p) => p.id !== panelABorrar.id));
      if (panelesEnPagina.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      }
    } catch (err) {
      toast.error('Error al eliminar el panel.');
    } finally {
      setBorrando(false);
      setConfirmBorrar(false);
      setPanelABorrar(null);
    }
  };

  const columnas: ColumnaTabla<Panel>[] = [
    { clave: 'nombre', encabezado: 'Nombre', ordenable: true, anchoMin: '200px' },
    { clave: 'watts', encabezado: 'Potencia (W)', ordenable: true },
    { clave: 'factorBifacial', encabezado: 'Factor Bifacial', ordenable: true },
    { clave: 'precioUnitario', encabezado: 'Precio Unitario (MXN)', ordenable: true },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (panel) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => abrirEdicion(panel)}
            className="p-1.5 text-[#00388d] hover:bg-blue-100 rounded transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Icono icon={Edit2} size={16} />
          </button>
          <button
            type="button"
            onClick={() => confirmarBorrar(panel)}
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
            <h2 className="text-2xl font-bold text-[#00388d]">Paneles solares</h2>
            <p className="text-xs text-gray-500 mt-1">{paneles.length} panel(es) registrado(s)</p>
          </div>
          <button
            type="button"
            onClick={() => abrirEdicion(null)}
            className="bg-[#f7931e] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-500 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Icono icon={Plus} size={16} />
            Agregar panel
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : paneles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">No hay paneles registrados</p>
            <button
              type="button"
              onClick={() => abrirEdicion(null)}
              className="text-xs text-[#00388d] font-semibold hover:underline cursor-pointer"
            >
              Crear el primer panel
            </button>
          </div>
        ) : (
          <>
            <DataTable<Panel>
              columnas={columnas}
              filas={panelesEnPagina}
              claveFila={(p) => p.id}
              vacio="No hay paneles en esta página"
            />
            <Pagination paginaActual={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} totalRegistros={paneles.length} />
          </>
        )}
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={panelEditando ? 'Editar panel' : 'Nuevo panel'}
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
            <p className="text-xs text-gray-400 mt-1">Nombre comercial del panel solar</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Potencia nominal (watts)</label>
            <input
              type="number"
              value={formulario.watts}
              onChange={(e) => setFormulario({ ...formulario, watts: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Potencia que genera el panel en condiciones estándar (STC)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Factor bifacial</label>
            <input
              type="number"
              step="0.01"
              value={formulario.factorBifacial}
              onChange={(e) => setFormulario({ ...formulario, factorBifacial: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Multiplicador de ganancia por la cara trasera (1.0 si no es bifacial, 1.10 para +10%)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Precio unitario (MXN)</label>
            <input
              type="number"
              value={formulario.precioUnitario}
              onChange={(e) => setFormulario({ ...formulario, precioUnitario: Number(e.target.value) })}
              className="w-full border-b border-gray-300 py-2 text-sm focus:outline-none focus:border-[#00388d]"
            />
            <p className="text-xs text-gray-400 mt-1">Costo por pieza en pesos mexicanos</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        abierto={confirmBorrar}
        onCerrar={() => {
          setConfirmBorrar(false);
          setPanelABorrar(null);
        }}
        onConfirmar={borrar}
        titulo="Eliminar panel"
        mensaje={`¿Estás seguro de que deseas eliminar el panel "${panelABorrar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        peligroso={true}
      />
    </div>
  );
}
