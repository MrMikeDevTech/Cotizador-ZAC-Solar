export class ErrorApi extends Error {
  codigo: string;
  status: number;
  detalles?: unknown;

  constructor(codigo: string, mensaje: string, status: number = 400, detalles?: unknown) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
  }
}

export class NoEncontradoError extends ErrorApi {
  constructor(recurso: string) {
    super('NO_ENCONTRADO', `${recurso} no encontrado`, 404);
  }
}
