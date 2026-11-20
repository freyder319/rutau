import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planificar, turnosDelDia, franjasLibres } from '../src/services/planner.js';
import { semaforoEntrega } from '../src/services/semaforo.js';
import { leerICS, separarMateria } from '../src/services/ics.js';

const prefs = { horaInicioDia: '06:00', horaFinDia: '23:00', maxHorasDia: 3, descansoPostTurnoMin: 30 };
// Lunes 23 de noviembre de 2026, 7:00 a. m. (hora Colombia)
const ahora = new Date(2026, 10, 23, 7, 0);
const oficina = [1, 2, 3, 4, 5].map((d) => ({ tipo: 'trabajo', dia_semana: d, hora_inicio: '08:00', hora_fin: '17:00', semana: null }));

const solapa = (a, b) => a.inicio < b.fin && b.inicio < a.fin;

test('no ubica bloques durante el turno de trabajo ni en el descanso posterior', () => {
  const entregas = [{ id: 1, fecha_limite: new Date(2026, 10, 27, 23, 59), horas_estimadas: 8 }];
  const r = planificar({ ahora, prefs, turnos: oficina, entregas });
  assert.ok(r.bloques.length > 0);
  for (const b of r.bloques) {
    const dia = b.inicio.getDay();
    if (dia >= 1 && dia <= 5) {
      const turno = { inicio: new Date(b.inicio).setHours(8, 0, 0, 0), fin: new Date(b.inicio).setHours(17, 30, 0, 0) };
      assert.equal(solapa({ inicio: +b.inicio, fin: +b.fin }, turno), false, `bloque ${b.inicio} choca con el turno`);
    }
  }
  assert.equal(r.porEntrega[1].faltantes, 0);
});

test('respeta el máximo de horas de estudio por día', () => {
  const entregas = [
    { id: 1, fecha_limite: new Date(2026, 10, 29, 23, 59), horas_estimadas: 8 },
    { id: 2, fecha_limite: new Date(2026, 10, 29, 23, 59), horas_estimadas: 8 },
  ];
  const r = planificar({ ahora, prefs, turnos: oficina, entregas });
  const porDia = {};
  for (const b of r.bloques) {
    const k = b.inicio.toDateString();
    porDia[k] = (porDia[k] || 0) + (b.fin - b.inicio) / 3600000;
  }
  for (const h of Object.values(porDia)) assert.ok(h <= 3, `día con ${h} h`);
});

test('prioriza lo que vence primero', () => {
  const entregas = [
    { id: 'tarde', fecha_limite: new Date(2026, 10, 30, 23, 59), horas_estimadas: 2 },
    { id: 'pronto', fecha_limite: new Date(2026, 10, 24, 23, 59), horas_estimadas: 2 },
  ];
  const r = planificar({ ahora, prefs, turnos: oficina, entregas });
  const primero = r.bloques.sort((a, b) => a.inicio - b.inicio)[0];
  assert.equal(primero.entrega_id, 'pronto');
});

test('reporta horas sin ubicar cuando el tiempo no alcanza (semáforo rojo)', () => {
  const entregas = [{ id: 1, fecha_limite: new Date(2026, 10, 24, 23, 59), horas_estimadas: 8 }];
  const r = planificar({ ahora, prefs, turnos: oficina, entregas });
  assert.ok(r.porEntrega[1].faltantes > 0);
  const s = semaforoEntrega({ entrega: { estado: 'pendiente', fecha_limite: entregas[0].fecha_limite }, bloques: [],
    faltantes: r.porEntrega[1].faltantes, horasRestantes: 8, ahora });
  assert.equal(s.color, 'rojo');
});

test('los turnos de una semana específica reemplazan el horario habitual (turno rotativo)', () => {
  const rotativo = [...oficina, { tipo: 'trabajo', dia_semana: 1, hora_inicio: '14:00', hora_fin: '22:00', semana: '2026-11-23' }];
  const lunes = new Date(2026, 10, 23);
  const t = turnosDelDia(rotativo, lunes);
  assert.equal(t.length, 1);
  assert.equal(t[0].hora_inicio, '14:00');
  const siguienteLunes = new Date(2026, 10, 30);
  assert.equal(turnosDelDia(rotativo, siguienteLunes)[0].hora_inicio, '08:00');
});

test('los turnos nocturnos bloquean la madrugada del día siguiente', () => {
  const noche = [{ tipo: 'trabajo', dia_semana: 1, hora_inicio: '22:00', hora_fin: '06:00', semana: null }];
  const slots = franjasLibres({ desde: new Date(2026, 10, 24, 0, 0), hasta: new Date(2026, 10, 24, 23, 0), turnos: noche,
    prefs: { ...prefs, descansoPostTurnoMin: 60 } });
  assert.ok(slots[0].inicio >= new Date(2026, 10, 24, 7, 0));
});

test('semáforo amarillo cuando hay bloques atrasados pero aún alcanza', () => {
  const s = semaforoEntrega({
    entrega: { estado: 'pendiente', fecha_limite: new Date(2026, 10, 28) },
    bloques: [{ estado: 'no_cumplido', fin: new Date(2026, 10, 22) }],
    faltantes: 0, horasRestantes: 3, ahora,
  });
  assert.equal(s.color, 'amarillo');
});

test('lee un calendario .ics de Canvas y separa la materia', () => {
  assert.deepEqual(separarMateria('Taller 2 [Cálculo I]'), { titulo: 'Taller 2', materia: 'Cálculo I' });
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Canvas//ES',
    'BEGIN:VEVENT', 'UID:event-assignment-1', 'DTSTART:20261126T045900Z', 'DTEND:20261126T045900Z',
    'SUMMARY:Proyecto final [Emprendimiento de Base Tecnológica]', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:event-assignment-2', 'DTSTART;VALUE=DATE:20261130', 'SUMMARY:Foro semana 6 [Inglés II]', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const items = leerICS(ics, ahora);
  assert.equal(items.length, 2);
  assert.equal(items[0].materia, 'Emprendimiento de Base Tecnológica');
  assert.equal(items[0].esfuerzo, 'grande');
  assert.equal(items[1].esfuerzo, 'pequena');
  assert.equal(new Date(items[1].fecha_limite).getHours(), 23);
});
