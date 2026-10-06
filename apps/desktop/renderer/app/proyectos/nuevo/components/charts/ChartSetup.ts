import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

let isChartJSRegistered = false;

/**
 * Registro idempotente de los elementos de Chart.js usados en todo el
 * proyecto. `BarElement` se agregó para las gráficas de barras del dashboard
 * (proyectos por fase); si alguna gráfica nueva necesita otro elemento
 * (p. ej. `ArcElement` para una dona), agrégalo aquí en vez de registrarlo
 * por su cuenta en el componente.
 */
export function registerChartJS(): void {
  if (!isChartJSRegistered) {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend
    );
    isChartJSRegistered = true;
  }
}
