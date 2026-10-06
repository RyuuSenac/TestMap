import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCep, validChild, validPoint } from '../lib/demo.mjs';

test('aceita coordenadas válidas e rejeita coordenadas inválidas', () => {
  assert.ok(validPoint({ lat: -23.5505, lng: -46.6333 }));
  assert.ok(validPoint({ lat: 0, lng: 0 }));
  assert.ok(!validPoint({ lat: 91, lng: 0 }));
  assert.ok(!validPoint({ lat: 0, lng: 181 }));
  assert.ok(!validPoint({ lat: '-23', lng: -46 }));
});

test('normaliza CEP para oito dígitos', () => {
  assert.equal(cleanCep('01311-000'), '01311000');
  assert.equal(cleanCep('abc 12345-678 xyz'), '12345678');
});

test('mantém validação de cadastros locais', () => {
  assert.ok(!validChild({ id: 'bad', name: '   ', shift: 'Manhã' }));
  assert.ok(validChild({
    id: 'ok',
    name: 'Exemplo',
    shift: 'Manhã',
    home: { lat: -23.55, lng: -46.63 },
    school: { lat: -23.56, lng: -46.64 }
  }));
});
