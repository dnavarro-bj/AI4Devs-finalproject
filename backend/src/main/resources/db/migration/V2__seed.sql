-- Datos semilla con TSIDs fijos y literales (ver design.md, decisión 2):
-- la base de datos no genera TSIDs (se generan en aplicación, ADR-003),
-- así que las seeds los llevan explícitos para que sean estables entre entornos.

INSERT INTO soil_mix (id, name, organic_percentage, mineral_percentage, ph_min, ph_max, description) VALUES
    (100001, 'Sustrato mineral de drenaje rápido', 20, 80, 5.5, 6.5, 'akadama, pómez, turba'),
    (100002, 'Sustrato equilibrado para cactáceas', 40, 60, 6.0, 7.0, 'turba, arena gruesa, perlita'),
    (100003, 'Sustrato orgánico para suculentas de hoja', 60, 40, 5.8, 6.8, 'compost, arena, perlita');

INSERT INTO species
    (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature, max_temperature,
     min_light_hours, max_light_hours, watering_guideline, soil_mix_id) VALUES
    (200001, 'Echinocactus grusonii', 'Asiento de suegra', 10, 30, 10, 35, 6, 10, 'cada 10-20 dias en crecimiento, casi nulo en invierno', 100001),
    (200002, 'Mammillaria elongata', 'Cactus dedo de dama', 15, 40, 12, 32, 5, 9, 'cada 7-14 dias en crecimiento', 100002),
    (200003, 'Echeveria elegans', 'Echeveria', 20, 50, 10, 28, 6, 8, 'cada 10-15 dias, dejar secar el sustrato entre riegos', 100003);

INSERT INTO location (id, name) VALUES
    (300001, 'Invernadero 1'),
    (300002, 'Bandeja A3'),
    (300003, 'Alfeizar salon');

INSERT INTO tag (id, name) VALUES
    (400001, 'globular'),
    (400002, 'pequeno'),
    (400003, 'sin espinas'),
    (400004, 'hibrido');
