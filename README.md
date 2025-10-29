# madno2 V1.1

# instalacion del docker con postgress y pg admin (cambiar puertos y paths si se necesita)

    docker-compose up -d --build

Podemos tener problemas de permisos. Se arreglan con los siguientes comandos

    sudo mkdir -p /mnt/data/srv/madno2/pgadmin
    sudo chown -R 5050:5050 /mnt/data/srv/madno2/pgadmin
    sudo chmod -R u+rwX,g+rwX /mnt/data/srv/madno2/pgadmin

Y arrancamos de nuenvo

    docker-compose stop pgadmin
    docker-compose up -d pgadmin

conexion a pgadmin

    http://192.168.1.200:9060/browser/

Nos vamos a la base de datos de postgres y el gestor de queries escribimos esot

    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS h3;


# Consulta para probar

    SELECT i, h3_get_num_cells(i)
    FROM generate_series(0, 15, 3) AS i;

    veremos una tabla con los valores

    SELECT h3_geo_to_h3(
            ST_Centroid(ST_Transform(geom, 4326)), 6)
        FROM osm.road_line
        WHERE osm_id = 289242317
    ;

## query para crear una tabla e insertar las de nivel 0

    CREATE TABLE h3.hex2
    (
        ix H3INDEX NOT NULL PRIMARY KEY,
        resolution INT2 NOT NULL,
        geom GEOMETRY (POLYGON, 4326) NOT NULL,
        CONSTRAINT ck_resolution CHECK (resolution >= 0 AND resolution <= 15)
    );
    CREATE INDEX gix_h3_hex ON h3.hex2 USING GIST (geom);

    INSERT INTO h3.hex2 (ix, resolution, geom)
    SELECT
    ix,
    0::int2 AS resolution,
    ST_SetSRID(h3_cell_to_boundary(ix)::geometry, 4326) AS geom
    FROM h3_get_res_0_cells() AS ix
    ON CONFLICT (ix) DO NOTHING;

## query para sacar los hexagonos de Europa a nivel 3

    -- elige la resolución (0–15)
    WITH params(res) AS (VALUES (6)),

    -- Europa aprox (ajusta si quieres)
    aoi AS (
    SELECT ST_MakeEnvelope(-31, 27, 45, 72, 4326) AS geom
    ),

    r0 AS (
    SELECT cell
    FROM h3_get_res_0_cells() AS t(cell)
    ),

    cells AS (
    SELECT c AS cell
    FROM r0
    CROSS JOIN LATERAL h3_cell_to_children(r0.cell, (SELECT res FROM params)) AS t(c)
    ),

    geom_cells AS (
    SELECT
        cell,
        ST_CollectionExtract(
        ST_MakeValid(
            ST_SetSRID(h3_cell_to_boundary(cell)::geometry, 4326)
        ), 3
        ) AS geom
    FROM cells
    )

    SELECT
    g.cell AS ix,
    (SELECT res FROM params)::int2 AS resolution,
    g.geom
    FROM geom_cells AS g
    WHERE ST_Intersects(g.geom, (SELECT geom FROM aoi));


## querys interesantes

### cuenta el numero total de registros
SELECT COUNT(*) AS total_registros
FROM madno.h3_points;

### agrupa todos los indez y cuenta su número
SELECT 
    h3_index,
    COUNT(*) AS total_registros
FROM madno.h3_points
GROUP BY h3_index
ORDER BY total_registros DESC;

### saca todos los registros que están a una determinada hora
SELECT *
FROM madno.h3_points
WHERE h3_index = '89390ca0083ffff'
  AND EXTRACT(HOUR FROM dt) = 15;


## Temas de python
source .venv/bin/activate.      # para meterme en el entorno virtual
pip freeze > requirements.txt   # para grabar las dependencias
deactivate                      # para salir del entorno virtual
pip install -r requirements.txt # instala todo lo que esté en ese fichero


