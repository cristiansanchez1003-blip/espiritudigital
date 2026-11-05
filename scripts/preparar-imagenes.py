#!/usr/bin/env python3
"""Copia las capturas reales a assets/tiendas-online/img/ en los tamaños que usa la landing.

Uso:  python3 scripts/preparar-imagenes.py [carpeta_origen]
      (por defecto ../assets, la carpeta compartida donde se producen las capturas)

Requiere Pillow. No es parte de la build: se corre solo cuando cambian las capturas.
Las capturas son de los sitios reales en producción; aquí solo se redimensionan.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent / "assets"
DESTINO = RAIZ / "assets" / "tiendas-online" / "img"

# (archivo de origen en web/, nombre de salida, anchos)
TRABAJOS = [
    ("portada-imprenta-express@2x.webp", "portada-imprenta-express", [720, 1200]),
    ("imprenta-express-categoria-computador.webp", "caso-imprenta-express-computador", [720, 1440]),
    ("imprenta-express-celular.webp", "caso-imprenta-express-celular", [390, 780]),
    ("vitrales-del-cajon-catalogo-computador.webp", "caso-vitrales-del-cajon-computador", [720, 1440]),
    ("vitrales-del-cajon-celular.webp", "caso-vitrales-del-cajon-celular", [390, 780]),
    ("mielu-computador.webp", "caso-mielu-computador", [720, 1440]),
    ("mielu-celular.webp", "caso-mielu-celular", [390, 780]),
]


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    for origen, salida, anchos in TRABAJOS:
        ruta = ORIGEN / "web" / origen
        if not ruta.exists():
            print(f"falta {ruta}")
            continue
        imagen = Image.open(ruta)
        for ancho in anchos:
            alto = round(imagen.height * ancho / imagen.width)
            copia = imagen if imagen.width == ancho else imagen.resize((ancho, alto), Image.LANCZOS)
            destino = DESTINO / f"{salida}-{ancho}.webp"
            copia.save(destino, "WEBP", quality=80, method=6)
            print(f"{destino.relative_to(RAIZ)}  {ancho}x{alto}  {destino.stat().st_size // 1024} KB")
    og = ORIGEN / "og" / "og-tiendas-online.jpg"
    if og.exists():
        shutil.copyfile(og, DESTINO / "og-tiendas-online.jpg")
        print(f"assets/tiendas-online/img/og-tiendas-online.jpg  {(DESTINO / 'og-tiendas-online.jpg').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
