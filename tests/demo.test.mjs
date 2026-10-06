import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationAt,DEMO_PATH,DEMO_DURATION,validPoint,validChild,cleanCep } from '../lib/demo.mjs';
test('a posição depende do horário compartilhado, nunca da hora de entrada na página',()=>{
  assert.deepEqual(simulationAt(1234567),simulationAt(1234567));
  assert.deepEqual(simulationAt(1234567),simulationAt(1234567+DEMO_DURATION));
  assert.deepEqual(simulationAt(0).position,DEMO_PATH[0]);
  assert.deepEqual(simulationAt(DEMO_DURATION).position,DEMO_PATH[0]);
});
test('a van interpola o trajeto e mantém progresso válido em qualquer ciclo',()=>{
  for(let time=-200000;time<500000;time+=1357){
    const sim=simulationAt(time);
    assert.ok(sim.progress>=0&&sim.progress<1);
    assert.ok(sim.remaining>0&&sim.remaining<=240);
    assert.ok(validPoint({lat:sim.position[0],lng:sim.position[1]}));
  }
  const halfway=simulationAt(DEMO_DURATION/2,[[0,0],[10,20]]);
  assert.deepEqual(halfway.position,[5,10]);
});
test('rejeita pontos e cadastros inválidos restaurados do navegador',()=>{
  assert.ok(!validPoint({lat:91,lng:0}));
  assert.ok(!validPoint({lat:0,lng:Infinity}));
  assert.ok(!validPoint({lat:'-23',lng:0}));
  assert.ok(!validChild({id:'bad',name:'   ',shift:'Manhã'}));
  assert.ok(validChild({id:'ok',name:'Exemplo',shift:'Manhã',home:{lat:0,lng:0},school:{lat:1,lng:1}}));
  assert.equal(cleanCep('01311-000'), '01311000');
});
