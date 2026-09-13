import { z } from 'zod';

export const datosEmpresarialesSchema = z.object({
  rfc: z.string().default(''),
  cargo: z.string().default(''),
  razonSocial: z.string().default(''),
  actividadComercial: z.string().default(''),
});

export const datosContactoSchema = z.object({
  contactoExistenteId: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellidoPaterno: z.string().default(''),
  apellidoMaterno: z.string().default(''),
  telefono: z.string().default(''),
  celular: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  estado: z.string().default(''),
  localidad: z.string().default(''),
  fuenteContacto: z.string().default(''),
  estatus: z.string().default(''),
  notas: z.string().default(''),
  mostrarEmpresariales: z.boolean().default(false),
  empresariales: datosEmpresarialesSchema,
});

export type DatosContactoInput = z.infer<typeof datosContactoSchema>;
