'use client';

import { useState, useMemo } from 'react';
import { useUser } from '../context/usercontext';
import { Contacto, ColumnaOrden, DireccionOrden, ContactoFormData } from './types';
import { REGISTROS_POR_PAGINA, contactosIniciales, FORM_INICIAL } from './constants';
import {
  ContactosFiltros,
  ContactosTabla,
  ContactosPaginacion,
  ModalContacto,
} from './components';

export default function ContactosPage() {
  const { usuarioActivo } = useUser();

  const [contactos, setContactos] = useState<Contacto[]>(contactosIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [paginaActual, setPaginaActual] = useState(1);

  // Estado para Ordenamiento
  const [criterioOrden, setCriterioOrden] = useState<ColumnaOrden | null>(null);
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>('asc');

  // Estado para Modal y Edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [contactoEditarId, setContactoEditarId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactoFormData>(FORM_INICIAL);

  const resetForm = () => {
    setForm(FORM_INICIAL);
    setContactoEditarId(null);
  };

  const handleAbrirNuevo = () => {
    resetForm();
    setMostrarModal(true);
  };

  const handleAbrirEditar = (c: Contacto) => {
    setContactoEditarId(c.id);
    setForm({
      nombre: c.nombreOriginal || c.nombre,
      apellidoPaterno: c.apellidoPaterno || '',
      apellidoMaterno: c.apellidoMaterno || '',
      telefono: c.telefono || '',
      celular: c.celular || '',
      email: c.email || '',
      estado: c.estado || '',
      localidad: c.localidad || '',
      fuenteContacto: c.fuenteContacto || '',
      estatus: c.estatus || '',
      notas: c.notas || '',
    });
    setMostrarModal(true);
  };

  const eliminarContacto = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a "${nombre}"?`)) {
      setContactos((prev) => prev.filter((c) => c.id !== id));
    }
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

  // 1. Filtrado de contactos
  const contactosFiltrados = useMemo(() => {
    return contactos.filter((c) => {
      const texto = busqueda.toLowerCase();
      const coincideTexto =
        c.nombre.toLowerCase().includes(texto) ||
        c.codigo.toLowerCase().includes(texto) ||
        c.ubicacion.toLowerCase().includes(texto) ||
        c.notas.toLowerCase().includes(texto);

      if (vendedorFiltro === 'Mis contactos') {
        return coincideTexto && c.autor === usuarioActivo;
      }

      return coincideTexto;
    });
  }, [contactos, busqueda, vendedorFiltro, usuarioActivo]);

  // 2. Ordenamiento de contactos
  const contactosOrdenados = useMemo(() => {
    if (!criterioOrden) return contactosFiltrados;

    return [...contactosFiltrados].sort((a, b) => {
      const valA = a[criterioOrden] || '';
      const valB = b[criterioOrden] || '';

      if (criterioOrden === 'fecha') {
        const [diaA, mesA, anioA] = valA.split('/').map(Number);
        const [diaB, mesB, anioB] = valB.split('/').map(Number);
        const fechaA = new Date(anioA, mesA - 1, diaA).getTime();
        const fechaB = new Date(anioB, mesB - 1, diaB).getTime();
        return direccionOrden === 'asc' ? fechaA - fechaB : fechaB - fechaA;
      }

      const comparacion = valA.localeCompare(valB, 'es', { sensitivity: 'base' });
      return direccionOrden === 'asc' ? comparacion : -comparacion;
    });
  }, [contactosFiltrados, criterioOrden, direccionOrden]);

  // 3. Cálculos de Paginación
  const totalPaginas = Math.ceil(contactosOrdenados.length / REGISTROS_POR_PAGINA) || 1;
  const paginaValida = Math.min(paginaActual, totalPaginas);

  const contactosPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * REGISTROS_POR_PAGINA;
    return contactosOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [contactosOrdenados, paginaValida]);

  const guardarContacto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    const nombreCompleto = `${form.nombre} ${form.apellidoPaterno} ${form.apellidoMaterno}`.trim();

    if (contactoEditarId) {
      setContactos((prev) =>
        prev.map((c) => {
          if (c.id === contactoEditarId) {
            return {
              ...c,
              nombre: nombreCompleto,
              nombreOriginal: form.nombre,
              apellidoPaterno: form.apellidoPaterno,
              apellidoMaterno: form.apellidoMaterno,
              telefono: form.telefono,
              celular: form.celular,
              email: form.email,
              estado: form.estado,
              localidad: form.localidad,
              fuenteContacto: form.fuenteContacto,
              ubicacion:
                form.localidad && form.estado
                  ? `${form.localidad}, ${form.estado}`
                  : form.estado || c.ubicacion,
              estatus: form.estatus || c.estatus,
              notas: form.notas || '-',
            };
          }
          return c;
        })
      );
    } else {
      const nuevo: Contacto = {
        id: Date.now().toString(),
        codigo: `ZAC-00${contactos.length + 1}`,
        nombre: nombreCompleto,
        nombreOriginal: form.nombre,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno,
        telefono: form.telefono,
        celular: form.celular,
        email: form.email,
        estado: form.estado,
        localidad: form.localidad,
        fuenteContacto: form.fuenteContacto,
        ubicacion:
          form.localidad && form.estado
            ? `${form.localidad}, ${form.estado}`
            : form.estado || 'Sin especificar',
        estatus: form.estatus || 'Primer contacto',
        fecha: new Date().toLocaleDateString('es-MX'),
        notas: form.notas || '-',
        autor: usuarioActivo,
      };
      setContactos([nuevo, ...contactos]);
    }

    resetForm();
    setMostrarModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white px-2">Contactos</h1>

      {/* Tarjeta contenedora blanca */}
      <div className="bg-white rounded-3xl p-8 shadow-xl space-y-6">
        <ContactosFiltros
          busqueda={busqueda}
          onBusquedaChange={(val) => {
            setBusqueda(val);
            setPaginaActual(1);
          }}
          vendedorFiltro={vendedorFiltro}
          onVendedorFiltroChange={(val) => {
            setVendedorFiltro(val);
            setPaginaActual(1);
          }}
          usuarioActivo={usuarioActivo}
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
          onEliminar={eliminarContacto}
        />

        <ContactosPaginacion
          paginaActual={paginaValida}
          totalPaginas={totalPaginas}
          totalRegistros={contactosOrdenados.length}
          registrosPorPagina={REGISTROS_POR_PAGINA}
          onCambiarPagina={setPaginaActual}
        />
      </div>

      {/* MODAL NUEVO / EDITAR CONTACTO */}
      <ModalContacto
        isOpen={mostrarModal}
        esEdicion={Boolean(contactoEditarId)}
        usuarioActivo={usuarioActivo}
        form={form}
        onChange={handleChangeForm}
        onSubmit={guardarContacto}
        onCerrar={() => {
          resetForm();
          setMostrarModal(false);
        }}
      />
    </div>
  );
}