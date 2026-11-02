# Datos de idioma de Tesseract

`spa.traineddata` es el modelo de español de Tesseract (variante rápida, `tessdata_fast`
distribuida por `tesseract.js-data`), licencia Apache 2.0. Se incluye en el repositorio para
que la lectura OCR de recibos CFE funcione **100 % sin conexión**.

Lo usa `src/servicios/extraerTextoRecibo.ts`. Se puede apuntar a otra carpeta con la
variable de entorno `TESSDATA_DIR`.
