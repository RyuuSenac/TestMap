# Lumio

Prévia funcional de uma plataforma de acompanhamento de transporte escolar. Interface em português, responsiva, preparada para publicar na **Vercel** com Next.js.

## Rodar localmente

Requisitos: Node.js 22 ou 24 e npm. O projeto foi validado com Node 24.

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Next.js. Para testar a versão de produção:

```bash
npm run build
npm run start
```

Não são necessárias chaves de API, contas em serviços de mapas ou banco de dados.

## Publicar na Vercel

1. Envie estes arquivos para `RyuuSenac/TestMap`, no GitHub.
2. Na Vercel, use **Add New → Project** e importe o repositório.
3. Selecione **Next.js**, a raiz do repositório e Node.js 24 (ou 22). `vercel.json` já define instalação e build.
4. Faça o deploy. Não há variáveis obrigatórias. A Vercel define `VERCEL_URL` automaticamente.
5. Abra a URL que a Vercel gerar. A página pública está em **`/ao-vivo`**. Compartilhe essa URL completa em outros dispositivos.

A página pública é uma simulação. Não é o GPS real do motorista. Nenhum domínio ou deploy foi criado automaticamente por este projeto.

## O que experimentar

- Clique no avatar **CD** para entrar com um nome/apelido. Este acesso é demonstrativo, sem senha.
- O painel começa com duas crianças fictícias. Em **Crianças**, cadastre outras, remova cadastros ou restaure os exemplos (com confirmação).
- Cada criança tem nome, idade opcional, turno, endereço de embarque e escola com endereço próprio. É possível cadastrar várias escolas.
- Use **Buscar CEP** para preencher o endereço com ViaCEP. Complete número e cidade se necessário. Clique em **Localizar** e selecione o resultado para confirmar as coordenadas. ViaCEP não fornece coordenadas.
- Em **Planejar rota**, defina a saída por endereço ou **Usar minha posição atual**. O GPS requer HTTPS (ou localhost) e a permissão do navegador.
- **Calcular minha rota** consulta OSRM com saída, todos os embarques na ordem do cadastro e as escolas distintas ao final. Não há otimização da ordem nem dados de trânsito. Distância e duração são estimativas do provedor.
- **Simular trajeto** anima a van na rota calculada, apenas no seu navegador, acelerada em ciclos de quatro minutos. Essa animação não representa o tempo real estimado pelo OSRM.
- Abra **Rota pública ao vivo** em dois dispositivos: a van fictícia estará no mesmo trecho do percurso. Esta página nunca usa os nomes nem os endereços cadastrados no painel.

## Como funciona a demonstração compartilhada

`/api/demo` retorna o horário do servidor com cache desabilitado. Os clientes estimam a diferença de relógio pela ida e volta da requisição, sincronizam novamente a cada 30 segundos e calculam a mesma posição a partir de ciclos de quatro minutos.

O trajeto público é fixo e ilustrativo em São Paulo, com saída, dois embarques e uma escola fictícia. Não depende da API de rotas e não exige banco, WebSocket nem um processo permanente na Vercel. O movimento é atualizado a cada segundo; a precisão depende da latência e do relógio do servidor. Se a sincronização falhar, a interface informa que está usando o relógio local.

Esta solução atende à apresentação compartilhada de uma simulação. Para um motorista iniciar uma viagem arbitrária e transmitir GPS real a vários responsáveis, a próxima etapa exige autenticação, autorização e armazenamento compartilhado/realtime (por exemplo, Supabase).

## Serviços gratuitos pesquisados e utilizados

| Recurso | Serviço | Uso e limites |
| --- | --- | --- |
| Mapa | [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) | Tiles carregados diretamente no navegador com atribuição visível. Sem download em lote, prefetch ou modo offline. Serviço comunitário sem garantia de disponibilidade. |
| CEP | [ViaCEP](https://viacep.com.br/) | Consulta explícita de CEP brasileiro, sem chave. Não informa coordenadas e pode não detalhar a rua em CEPs gerais. |
| Coordenadas | [Photon / Komoot](https://github.com/komoot/photon#demo-server) | Busca explícita, até cinco resultados no Brasil, sem autocomplete. Servidor de demonstração: uso razoável, sem SLA; excesso pode ser bloqueado. O backend espaça consultas e mantém cache limitado em memória por instância. |
| Rotas | [OSRM](https://project-osrm.org/) | Perfil driving, geometria, distância e tempo estimados; sem trânsito em tempo real. Servidor público destinado à demonstração. [Política de uso](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy). |

Também foi avaliado o [Nominatim](https://operations.osmfoundation.org/policies/nominatim/), usado pelo projeto de referência. Seu servidor público exige no máximo uma requisição por segundo **para o aplicativo inteiro**, cache e proíbe autocomplete. Não foi incluído no aplicativo: um limitador em memória por função da Vercel não garante esse limite entre várias instâncias.

**Esta prévia é para demonstrações de baixo volume.** Antes de abrir para tráfego amplo, substitua os servidores públicos por instâncias próprias ou provedores adequados e adicione cache/controle de tráfego compartilhados. Endereços pesquisados e pontos de rotas são enviados aos respectivos provedores; não use dados pessoais reais nesta versão.

As fontes são servidas junto com o aplicativo, sem dependência de Google Fonts. Endereços de falhas dos provedores não são confundidos com uma rota calculada: o aplicativo mantém os cadastros e informa o erro. A simulação pública permanece utilizável mesmo sem mapa base.

## Persistência, acesso e privacidade

- Nome do acesso, crianças e saída ficam em `localStorage` na chave `lumio-preview-v1`.
- Cadastros persistem ao recarregar, mas não são sincronizados entre navegadores/dispositivos. Limpar os dados do site remove os cadastros.
- O acesso com nome **não é autenticação**. Qualquer pessoa com acesso ao navegador pode consultar seus dados locais. Sair encerra apenas o nome demonstrativo; não apaga os cadastros.
- Não cadastre crianças reais, documentos ou endereços pessoais. A interface exige confirmação do uso de dados fictícios.
- A página pública usa somente paradas genéricas e uma posição fictícia. Ela não solicita GPS nem lê os cadastros locais.
- Não estão implementados: contas seguras, permissões por vínculo, banco, GPS compartilhado real, contratos, cobrança, notificações push ou conformidade completa com LGPD.

## Verificação

```bash
npm test
npm run build
npm run test:e2e
```

Os testes de navegador usam Chromium em `/usr/bin/chromium`. Em outra máquina, instale Chromium e defina `CHROMIUM_PATH=/caminho/do/chromium`, ou adapte a configuração do Playwright para o navegador instalado.

- Testes unitários: ciclos e interpolação da simulação, coordenadas e validação de cadastros restaurados.
- Testes de navegador: acesso demonstrativo, ViaCEP, múltiplos cadastros, persistência, remoção, rota privada, sincronização entre duas sessões, privacidade da página pública, GPS e layout mobile, erros preservando dados.
- Os testes de fluxo simulam respostas externas para serem repetíveis. Não representam garantia de disponibilidade dos serviços públicos. As consultas reais são verificadas separadamente durante a implementação.

## Estrutura

```text
app/                 Páginas, estilos e APIs serverless do Next.js
  ao-vivo/           Página pública de simulação
  api/demo/          Horário compartilhado e descrição da demo
  api/geocode/       Busca de coordenadas via Photon
  api/route/         Cálculo do percurso via OSRM
components/          Painel, mapa Leaflet, endereços e modais
lib/demo.mjs         Trajeto fictício e cálculo da posição
public/              Ícone do projeto
tests/               Testes unitários e de navegador
```

Referências: documento de planejamento Lumio fornecido pelo usuário e [Willliamonb/Teste-gps](https://github.com/Willliamonb/Teste-gps), consultado como exemplo de Leaflet, GPS e rotas OSRM. Esta implementação acrescenta cadastro local, ViaCEP, seleção confirmada de coordenadas, rotas com escolas e demonstração sincronizada compatível com funções serverless.
