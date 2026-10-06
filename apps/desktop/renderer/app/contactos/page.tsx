'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSesion } from '../../lib/SesionContext';
import { api, ApiError } from '../../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Contacto, ColumnaOrden, DireccionOrden, ContactoFormData } from './types';
import { REGISTROS_POR_PAGINA, FORM_INICIAL } from './constants';
import { nombreCompleto, ubicacionContacto } from './utils';
import { ContactosFiltros, ContactosTabla, ModalContacto } from './components';
import { Pagination } from '../components/Pagination';

export default function ContactosPage() {
  const { usuario } = useSesion();
  const usuarioActivo = usuario?.nombre ?? '';

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  // Estado para Ordenamiento (cliente, sobre lo que ya devolvió la API)
  const [criterioOrden, setCriterioOrden] = useState<ColumnaOrden | null>(null);
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>('asc');

  // Estado para Modal y Edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [contactoEditando, setContactoEditando] = useState<Contacto | null>(null);
  const [form, setForm] = useState<ContactoFormData>(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  // Estado para el diálogo de confirmación de borrado
  const [contactoAEliminar, setContactoAEliminar] = useState<Contacto | null>(null);

  const cargarContactos = useCallback(async (q: string) => {
    setCargando(true);
    try {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const datos = await api.get<Contacto[]>(`/api/contactos${query}`);
      setContactos(datos);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudieron cargar los contactos.';
      toast.error(mensaje);
      setContactos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial + antirrebote de ~300ms cada vez que cambia la búsqueda.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarContactos(busqueda);
      setPaginaActual(1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda, cargarContactos]);

  const resetForm = () => {
    setForm(FORM_INICIAL);
    setContactoEditando(null);
  };

  const handleAbrirNuevo = () => {
    resetForm();
    setMostrarModal(true);
  };

  const handleAbrirEditar = (c: Contacto) => {
    setContactoEditando(c);
    setForm({
      nombre: c.nombre,
      apellidoPaterno: c.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno,
      telefono: c.telefono,
      celular: c.celular,
      email: c.email,
      estado: c.estado,
      localidad: c.localidad,
      fuenteContacto: c.fuenteContacto,
      estatus: c.estatus,
      notas: c.notas,
    });
    setMostrarModal(true);
  };

  const handleChangeForm = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'estado') {
      setForm((prev) => ({ ...prev, estado: value, localidad: '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Función con ciclo de 3 estados: Ascendente -> Descendente -> Sin orden (Original)
  const handleOrdenar = (columna: ColumnaOrden) => {
    if (criterioOrden !== columna) {
      setCriterioOrden(columna);
      setDireccionOrden('asc');
    } else if (direccionOrden === 'asc') {
      setDireccionOrden('desc');
    } else {
      setCriterioOrden(null);
      setDireccionOrden('asc');
    }
  };

  // Ordenamiento sobre los contactos ya devueltos por el backend (máx. 50, ya filtrados por `q`)
  const contactosOrdenados = useMemo(() => {
    if (!criterioOrden) return contactos;

    const obtenerValor = (c: Contacto): string | number => {
      switch (criterioOrden) {
        case 'nombre':
          return nombreCompleto(c).toLowerCase();
        case 'ubicacion':
          return ubicacionContacto(c).toLowerCase();
        case 'fecha':
          return new Date(c.createdAt).getTime();
        default:
          return (c[criterioOrden] || '').toString().toLowerCase();
      }
    };

    return [...contactos].sort((a, b) => {
      const valA = obtenerValor(a);
      const valB = obtenerValor(b);
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direccionOrden === 'asc' ? valA - valB : valB - valA;
      }
      const comparacion = String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base' });
      return direccionOrden === 'asc' ? comparacion : -comparacion;
    });
  }, [contactos, criterioOrden, direccionOrden]);

  // Paginación en cliente sobre el máximo de 50 registros que entrega la API
  const totalPaginas = Math.max(Math.ceil(contactosOrdenados.length / REGISTROS_POR_PAGINA), 1);
  const paginaValida = Math.min(paginaActual, totalPaginas);

  const contactosPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * REGISTROS_POR_PAGINA;
    return contactosOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [contactosOrdenados, paginaValida]);

  const guardarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || guardando) return;

    setGuardando(true);
    try {
      const payload = {
        ...form,
        mostrarEmpresariales: false,
        empresariales: { rfc: '', cargo: '', razonSocial: '', actividadComercial: '' },
      };

      if (contactoEditando) {
        await api.put(`/api/contactos/${contactoEditando.id}`, payload);
        toast.success('Contacto actualizado correctamente.');
      } else {
        await api.post('/api/contactos', payload);
        toast.success('Contacto creado correctamente.');
      }

      setMostrarModal(false);
      resetForm();
      await cargarContactos(busqueda);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo guardar el contacto.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!contactoAEliminar) return;
    try {
      await api.del(`/api/contactos/${contactoAEliminar.id}`);
      toast.success(`Contacto "${nombreCompleto(contactoAEliminar)}" eliminado.`);
      setContactoAEliminar(null);
      await cargarContactos(busqueda);
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No se pudo eliminar el contacto.';
      toast.error(mensaje);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white px-2">Contactos</h1>

      {/* Tarjeta contenedora blanca */}
      <div className="bg-white rounded-3xl p-8 shadow-xl space-y-6">
        <ContactosFiltros
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          cargando={cargando}
          criterioOrden={criterioOrden}
          onRestablecerOrden={() => setCriterioOrden(null)}
          onNuevoContacto={handleAbrirNuevo}
        />

        <ContactosTabla
          contactos={contactosPaginados}
          criterioOrden={criterioOrden}
          direccionOrden={direccionOrden}
          onOrdenar={handleOrdenar}
          onEditar={handleAbrirEditar}
          onEliminar={setContactoAEliminar}
        />

        <Pagination
          paginaActual={paginaValida}
          totalPaginas={totalPaginas}
          totalRegistros={contactosOrdenados.length}
          onCambiar={setPaginaActual}
        />
      </div>

      {/* MODAL NUEVO / EDITAR CONTACTO */}
      <ModalContacto
        abierto={mostrarModal}
        esEdicion={Boolean(contactoEditando)}
        usuarioActivo={usuarioActivo}
        form={form}
        guardando={guardando}
        onChange={handleChangeForm}
        onSubmit={guardarContacto}
        onCerrar={() => {
          if (guardando) return;
          resetForm();
          setMostrarModal(false);
        }}
      />

      {/* CONFIRMACIÓN DE BORRADO */}
      <ConfirmDialog
        abierto={Boolean(contactoAEliminar)}
        onCerrar={() => setContactoAEliminar(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar contacto"
        mensaje={
          contactoAEliminar
            ? `¿Estás seguro de que deseas eliminar a "${nombreCompleto(contactoAEliminar)}"? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  );
}
