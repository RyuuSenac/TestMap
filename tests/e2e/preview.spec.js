import { test,expect } from '@playwright/test';
async function mockAddresses(page) {
  await page.route('https://viacep.com.br/**',route=>route.fulfill({json:{logradouro:'Avenida Paulista',bairro:'Bela Vista',localidade:'São Paulo',uf:'SP'}}));
  await page.route('**/api/geocode?*',route=>route.fulfill({json:[{address:'Avenida Paulista, 900, São Paulo',lat:-23.5674,lng:-46.6504}]}));
}
test('cadastro, ViaCEP, dois passageiros novos, persistência, exclusão e rota privada',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await mockAddresses(page);
  await page.route('**/api/route',route=>route.fulfill({json:{path:[[-23.5712,-46.6441],[-23.5674,-46.6504],[-23.5623,-46.6598]],distance:2500,duration:600}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Meu acesso demonstrativo'}).click();
  await page.getByLabel('Como podemos chamar você?').fill('Pessoa de teste');
  await page.getByRole('button',{name:'Entrar na prévia'}).click();
  for(const name of ['Marina Teste','Pedro Teste']){
    await page.getByRole('button',{name:'Cadastrar criança',exact:true}).first().click();
    const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Nome da criança').fill(name);
    await dialog.getByLabel('Idade',{exact:true}).fill('8');
    await dialog.getByLabel('CEP — Endereço de embarque',{exact:true}).fill('01311000');
    await dialog.getByLabel('Número — Endereço de embarque',{exact:true}).fill('900');
    await dialog.getByRole('button',{name:'Buscar CEP',exact:true}).first().click();
    await expect(dialog.getByLabel('Endereço — Endereço de embarque',{exact:true})).toHaveValue(/Avenida Paulista/);
    await dialog.getByRole('button',{name:'Localizar',exact:true}).first().click();
    await dialog.getByRole('button',{name:'Avenida Paulista, 900, São Paulo'}).click();
    await dialog.getByLabel('Nome da escola').fill('Escola de teste');
    await dialog.getByLabel('Endereço — Endereço da escola',{exact:true}).fill('Avenida Paulista, 900, São Paulo');
    await dialog.getByRole('button',{name:'Localizar',exact:true}).last().click();
    await dialog.getByRole('button',{name:'Avenida Paulista, 900, São Paulo'}).click();
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button',{name:'Cadastrar criança',exact:true}).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.reload();
  await page.getByRole('button',{name:'Crianças',exact:false}).filter({has:page.locator('.nav-count')}).click();
  await expect(page.getByRole('heading',{name:'Marina Teste',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Pedro Teste',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Planejar rota',exact:true}).click();
  await page.getByRole('button',{name:'Calcular minha rota',exact:true}).click();
  await expect(page.getByText('2.5 km',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Simular trajeto'}).click();
  await expect(page.getByRole('button',{name:'Reiniciar prévia'})).toBeVisible();
  await page.getByRole('button',{name:'Crianças',exact:false}).filter({has:page.locator('.nav-count')}).click();
  await page.getByRole('button',{name:'Remover Marina Teste'}).click();
  await page.getByRole('button',{name:'Remover criança',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Marina Teste',exact:true})).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('página pública sincroniza duas sessões e não publica cadastros locais',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext();
  const p=await a.newPage(),q=await b.newPage();
  await p.goto('/');
  await p.evaluate(()=>localStorage.setItem('lumio-preview-v1',JSON.stringify({user:'Nome privado',children:[{id:'private',name:'CRIANÇA PRIVADA',shift:'Manhã',home:{lat:0,lng:0,address:'ENDEREÇO PRIVADO'},school:{lat:0,lng:0,address:'ESCOLA PRIVADA'}}]})));
  await p.goto('/ao-vivo'); await q.goto('/ao-vivo');
  await expect(p.getByText('Sincronizado',{exact:true})).toBeVisible();
  await expect(q.getByText('Sincronizado',{exact:true})).toBeVisible();
  const first=Number((await p.locator('.journey-progress strong').innerText()).replace('%',''));
  const second=Number((await q.locator('.journey-progress strong').innerText()).replace('%',''));
  expect(Math.min(Math.abs(first-second),100-Math.abs(first-second))).toBeLessThanOrEqual(2);
  await expect(p.getByText('CRIANÇA PRIVADA')).toHaveCount(0);
  await expect(p.getByText('ENDEREÇO PRIVADO')).toHaveCount(0);
  await expect(p.locator('.van-pin')).toBeVisible();
  await a.close(); await b.close();
});
test('mobile, GPS de saída e falha da rota preservam cadastros',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:-23.55,longitude:-46.63},permissions:['geolocation']});
  const page=await context.newPage();
  await page.goto('/');
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('button',{name:'Planejar rota',exact:true}).click();
  await page.getByRole('button',{name:'Usar minha posição atual'}).click();
  await expect(page.getByLabel('Endereço — Ponto de partida',{exact:true})).toHaveValue(/-23.55000/);
  await page.route('**/api/route',route=>route.fulfill({status:503,json:{error:'Serviço indisponível no teste.'}}));
  await page.getByRole('button',{name:'Calcular minha rota'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Serviço indisponível no teste.'})).toBeVisible();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lumio-preview-v1')));
  expect(saved.children).toHaveLength(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/lumio-mobile.png',fullPage:true});
  await context.close();
});
test('produção serve páginas, horário e valida entradas das APIs',async({request})=>{
  const demo=await request.get('/api/demo');expect(demo.status()).toBe(200);
  const data=await demo.json();expect(data.simulated).toBe(true);expect(data.path.length).toBeGreaterThan(10);
  expect(Math.abs(data.serverTime-Date.now())).toBeLessThan(5000);
  expect(demo.headers()['cache-control']).toBe('no-store');
  expect((await request.get('/api/geocode?q=ab')).status()).toBe(400);
  expect((await request.post('/api/route',{data:{points:[{lat:95,lng:0},{lat:0,lng:0}]}})).status()).toBe(400);
  expect((await request.post('/api/route',{data:'invalid'})).status()).toBe(400);
});
