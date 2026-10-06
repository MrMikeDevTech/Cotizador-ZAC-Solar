import https from 'node:https';
import tls from 'node:tls';
import { parse } from 'node-html-parser';
import { CERTIFICADO_INTERMEDIO_CFE } from './certificado.ts';
import type { CfeClient, HiddenFields, TariffCode } from './types.ts';
import { USER_AGENT, YEAR_FIELD, pageUrl, tariffConfig } from './config.ts';

/**
 * Configura un Agent HTTPS con el certificado intermedio de CFE añadido al
 * almacén de confianza, para poder validar la cadena incompleta que sirve
 * app.cfe.mx.
 */
function createHttpsAgent(): https.Agent {
  return new https.Agent({
    ca: [...tls.rootCertificates, CERTIFICADO_INTERMEDIO_CFE],
    keepAlive: true,
  });
}

/**
 * Envuelve https.request en una promesa que acumula los chunks de respuesta
 * y devuelve el body completo.
 */
function httpsRequest(
  url: string,
  options: https.RequestOptions,
  body?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(
          new Error(`HTTP error ${res.statusCode} at ${url}`),
        );
        return;
      }

      res.setEncoding('utf-8');
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', reject);

    if (body) {
      const bodyBuffer = Buffer.from(body, 'utf-8');
      req.setHeader('Content-Length', Buffer.byteLength(bodyBuffer));
      req.write(bodyBuffer);
    }

    req.end();
  });
}

/**
 * Extrae todos los campos ocultos (`<input type="hidden">`) del HTML.
 * Devuelve un registro donde la clave es el atributo `name` y el valor es `value`.
 * Un input sin `name` se ignora; un `value` ausente se guarda como cadena vacía.
 */
function extractHiddenFields(html: string): HiddenFields {
  const root = parse(html);
  const hiddenInputs = root.querySelectorAll('input[type=hidden]');
  const fields: HiddenFields = {};

  for (const input of hiddenInputs) {
    const name = input.getAttribute('name');
    if (!name) continue;

    const value = input.getAttribute('value');
    fields[name] = value ?? '';
  }

  return fields;
}

/**
 * Construye el cuerpo del POST para ASP.NET WebForms.
 * Incluye todos los campos ocultos que vinieron del GET, más los parámetros
 * de evento y período que ASP.NET espera.
 */
function buildPostBody(
  hiddenFields: HiddenFields,
  tariffCode: TariffCode,
  year: number,
  month: number,
  summerStartMonth?: number,
): string {
  const config = tariffConfig(tariffCode);
  const params = new URLSearchParams();

  // Incluir todos los campos ocultos tal cual vinieron.
  for (const [name, value] of Object.entries(hiddenFields)) {
    params.append(name, value);
  }

  // A partir de aquí se usa `set` y no `append`: `__EVENTTARGET` y
  // `__EVENTARGUMENT` ya vienen entre los campos ocultos (vacíos), y repetirlos
  // dejaría la clave duplicada en el cuerpo. ASP.NET une los valores repetidos
  // con coma, lo que invalida el postback.
  params.set('__EVENTTARGET', config.monthField);
  params.set('__EVENTARGUMENT', '');

  // Período a consultar.
  params.set(YEAR_FIELD, year.toString());
  params.set(config.monthField, month.toString());

  // Mes de inicio de verano, solo si la tarifa lo tiene.
  if (config.summerStartField && summerStartMonth !== undefined) {
    params.set(config.summerStartField, summerStartMonth.toString());
  }

  return params.toString();
}

/**
 * Implementación de la interfaz CfeClient.
 * Gestiona las peticiones HTTP (GET y POST) contra el sitio de tarifas de CFE.
 */
class CfeClientImpl implements CfeClient {
  private agent: https.Agent;

  constructor() {
    this.agent = createHttpsAgent();
  }

  async loadPage(tariffCode: TariffCode): Promise<{ html: string; hidden: HiddenFields }> {
    const url = pageUrl(tariffCode);

    const options: https.RequestOptions = {
      method: 'GET',
      agent: this.agent,
      headers: {
        'User-Agent': USER_AGENT,
      },
    };

    const html = await httpsRequest(url, options);
    const hidden = extractHiddenFields(html);

    return { html, hidden };
  }

  async submitPeriod(input: {
    tariffCode: TariffCode;
    hidden: HiddenFields;
    year: number;
    month: number;
    summerStartMonth?: number;
  }): Promise<string> {
    const url = pageUrl(input.tariffCode);
    const body = buildPostBody(
      input.hidden,
      input.tariffCode,
      input.year,
      input.month,
      input.summerStartMonth,
    );

    const options: https.RequestOptions = {
      method: 'POST',
      agent: this.agent,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    return httpsRequest(url, options, body);
  }
}

/**
 * Crea una instancia del cliente HTTP de CFE.
 * Esta función implementa la interfaz declarada en types.ts.
 */
export function createCfeClient(): CfeClient {
  return new CfeClientImpl();
}
