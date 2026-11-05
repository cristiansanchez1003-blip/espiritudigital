#!/usr/bin/env python3
"""Genera enlaces de referidos para la landing de tiendas online.

Recibe nombres por argumento o desde un archivo (uno por línea), crea para cada uno
un código con el primer nombre y 4 caracteres al azar ('María José Pérez' -> 'maria-k7q2'),
imprime los enlaces y escribe un CSV con las columnas de la pestaña "Referidos" de la
planilla, listo para importar.

El código viaja en la URL: llega a Google Analytics, a Clarity y al mensaje de WhatsApp.
Por eso no lleva el nombre completo. La planilla traduce el código al nombre del referidor.

Ejemplos:
    python3 scripts/generar_enlaces_referidos.py "María José Pérez" "Sebastián Muñoz"
    python3 scripts/generar_enlaces_referidos.py --archivo nombres.txt
    python3 scripts/generar_enlaces_referidos.py --archivo nombres.txt --existentes referidos.csv

Para cargar el CSV en la planilla: pestaña Referidos > Archivo > Importar > Subir >
"Anexar a la hoja actual", con "Convertir texto en números, fechas y fórmulas"
desmarcado. Sin dependencias: Python 3.8 o superior.
"""

import argparse
import csv
import datetime
import re
import secrets
import sys
import unicodedata
from pathlib import Path

BASE = "https://espiritudigital.cl/tiendas-online"
# Mismo orden que la pestaña "Referidos" de docs/apps-script.gs.
COLUMNAS = ["fecha", "referidor", "slug", "enlace", "referido", "estado", "recompensa_entregada", "notas"]
LARGO_NOMBRE = 20
# Sin 0/o ni 1/l/i, para que el código se pueda dictar sin errores.
ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"


def limpiar_nombre(nombre: str) -> str:
    """Una línea, sin caracteres de control, y sin =, +, - o @ al inicio (no es una fórmula)."""
    texto = "".join(" " if unicodedata.category(c).startswith("C") else c for c in nombre)
    texto = re.sub(r"\s+", " ", texto).strip()
    return re.sub(r"^[=+\-@\s]+", "", texto)


def primer_nombre(nombre: str) -> str:
    """'María José Pérez' -> 'maria'. Minúsculas, sin tildes, solo a-z y 0-9."""
    sin_tildes = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode("ascii")
    partes = re.findall(r"[a-z0-9]+", sin_tildes.lower())
    return partes[0][:LARGO_NOMBRE] if partes else ""


def slug_de(nombre: str, usados: set) -> str:
    """'María José Pérez' -> 'maria-k7q2', distinto de todos los ya usados. '' si no hay letras."""
    base = primer_nombre(nombre)
    if not base:
        return ""
    while True:
        candidato = f"{base}-{''.join(secrets.choice(ALFABETO) for _ in range(4))}"
        if candidato not in usados:
            usados.add(candidato)
            return candidato


def leer_existentes(ruta: Path) -> set:
    """Slugs ya usados, desde un CSV exportado de la pestaña Referidos (columna 'slug')."""
    usados = set()
    with ruta.open(newline="", encoding="utf-8-sig") as archivo:
        for fila in csv.DictReader(archivo):
            valor = (fila.get("slug") or "").strip().lower()
            if valor:
                usados.add(valor)
    return usados


def leer_nombres(argumentos: list, archivo: Path) -> list:
    nombres = list(argumentos)
    if archivo:
        with archivo.open(encoding="utf-8-sig") as entrada:
            nombres += [linea for linea in entrada.read().splitlines() if linea.strip() and not linea.lstrip().startswith("#")]
    return nombres


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera enlaces de referidos y un CSV para la pestaña Referidos.")
    parser.add_argument("nombres", nargs="*", help="Nombres de los referidores")
    parser.add_argument("--archivo", type=Path, help="Archivo de texto con un nombre por línea")
    parser.add_argument("--existentes", type=Path, help="CSV de la pestaña Referidos, para no repetir slugs")
    parser.add_argument("--salida", type=Path, help="Ruta del CSV (por defecto, referidos-AAAAMMDD.csv)")
    parser.add_argument("--encabezado", action="store_true", help="Incluir la fila de encabezados en el CSV")
    parser.add_argument("--base", default=BASE, help=argparse.SUPPRESS)
    args = parser.parse_args()

    nombres = leer_nombres(args.nombres, args.archivo)
    if not nombres:
        parser.error("indica al menos un nombre, o un archivo con --archivo")

    usados = leer_existentes(args.existentes) if args.existentes else set()
    hoy = datetime.date.today().isoformat()
    filas, avisos = [], []
    for original in nombres:
        nombre = limpiar_nombre(original)
        slug = slug_de(nombre, usados)
        if not slug:
            avisos.append(f"Se omitió {original!r}: no deja letras ni números para el enlace.")
            continue
        enlace = f"{args.base}?ref={slug}"
        filas.append({"fecha": hoy, "referidor": nombre, "slug": slug, "enlace": enlace,
                      "referido": "", "estado": "enlace", "recompensa_entregada": "", "notas": ""})

    if not filas:
        print("No se generó ningún enlace.", file=sys.stderr)
        for aviso in avisos:
            print(f"  {aviso}", file=sys.stderr)
        return 1

    salida = args.salida or Path(f"referidos-{hoy.replace('-', '')}.csv")
    with salida.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
        if args.encabezado:
            escritor.writeheader()
        escritor.writerows(filas)

    ancho = max(len(f["referidor"]) for f in filas)
    print("Enlaces de referidos:\n")
    for fila in filas:
        print(f"  {fila['referidor']:<{ancho}}  {fila['enlace']}")
    for aviso in avisos:
        print(f"\nAviso: {aviso}")
    print(f"\nCSV para la pestaña Referidos: {salida}")
    print("Columnas: " + ", ".join(COLUMNAS) + ("" if args.encabezado else " (sin fila de encabezados)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
