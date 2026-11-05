# Motion Studio AI

Editor local para criar e revisar motions com uma timeline visual e apoio de modelos de IA. O projeto combina preview ao vivo, keyframes editáveis, exportação JSON, contêiner binário próprio e um editor hexadecimal genérico. Todo o trabalho fica no navegador até você exportar ou compartilhar um arquivo.

> **Estado atual:** editor 2D de um elemento tipográfico estilizado, animado por posição X/Y, rotação, escala e opacidade. O briefing para IA é assistido por copiar/colar; nenhuma IA ou serviço remoto é chamado pelo app.

## Começar

Requer Node.js 20+. Não há dependências de runtime para instalar.

```powershell
git clone https://github.com/komodoros111/Motion.git Motion
cd Motion
npm run dev
```

Abra <http://127.0.0.1:4173>. O servidor local escuta somente em loopback.

## Fluxo recomendado com IA

1. Abra o Motion Studio e ajuste texto, cores, duração e FPS.
2. Selecione a aba **IA**, escolha um exemplo ou descreva o movimento com tempo, direção, intensidade e easing.
3. Clique em **Copiar briefing + projeto** e cole em uma IA capaz de editar JSON.
4. Peça para ela ler `AI-INSTRUCTIONS.md` e [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md). Para alterações de código no repositório, a IA deve ler também `AGENTS.md`.
5. Salve a resposta como `.motion.json`, abra pelo botão **Abrir** e confira a animação no preview.
6. Exporte `.nvmb` quando precisar do contêiner binário nativo.

O guia contém um prompt inicial copiável, o esquema exato e critérios de validação. Ele orienta qualquer modelo; não exige uma API ou fornecedor específico.

## Recursos

- Preview 2D com texto e cores configuráveis, fundo de canvas e controles de reprodução.
- Timeline com tracks de X, Y, rotação, escala e opacidade.
- Seleção, criação, edição e exclusão de keyframes; arraste com snap ao frame.
- Interpolação linear, ease-in, ease-out e ease-in-out.
- Salvamento automático local no navegador e importação/exportação de projeto JSON.
- Exportação e validação do formato `.nvmb` com tamanho e CRC-32.
- Editor hexadecimal de arquivos locais com busca, navegação de offsets, edição de bytes e exportação sempre como cópia.
- Briefing que inclui o pedido escrito, as regras do esquema e o projeto aberto.
- Layout adaptável, atalhos de teclado, foco visível e suporte a `prefers-reduced-motion`.

## Atalhos

| Tecla | Ação |
|---|---|
| `Space` | Reproduzir ou pausar |
| `K` | Criar keyframe na track selecionada |
| `←` / `→` | Avançar ou voltar um frame |
| `Delete` | Excluir keyframe selecionado |

## Formatos

- `.motion.json`: documento legível e editável por IA.
- `.nvmb`: cabeçalho NVMB versão 1, comprimento explícito, checksum CRC-32 e payload JSON UTF-8.
- Outros binários: bytes brutos no Hex Studio. O app não tenta adivinhar estruturas de formatos desconhecidos.

Leia a especificação em [`docs/FORMAT.md`](docs/FORMAT.md) antes de criar ferramentas de compatibilidade.

## Organização

```text
assets/             Marca da aplicação
docs/               Formato binário e fluxo com IA
examples/            Motion de exemplo
src/app.js           Interface, timeline e preview
src/motion-format.js Validação e codec NVMB
src/styles.css       Interface responsiva
AGENTS.md            Guia de trabalho para agentes de código
AI-INSTRUCTIONS.md   Contrato para agentes que editam motions
```

## Desenvolver

```powershell
npm run check
```

Use JavaScript ES modules e APIs nativas; se introduzir dependências, explique o motivo e atualize este guia. Preserve projetos anteriores ou inclua migração explícita ao alterar o esquema. Não faça commit de mídia pessoal, `.nvmb` de usuário, credenciais ou arquivos `.env`.

## Limitações conhecidas

O preview atual mostra um único elemento estilizado. Não renderiza vídeo, áudio, texto multi-camada, máscaras, partículas, paths vetoriais ou efeitos de composição. O editor binário é de uso geral para inspeção bruta, mas só decodifica NVMB. CRC detecta corrupção acidental; não autentica o arquivo.

O exemplo `examples/next-level-promo.motion.json` demonstra a divulgação do servidor Next Level com entrada, overshoot curto, acomodação e chamada para ação. Há uma cópia NVMB em `examples/next-level-promo.nvmb` e a descrição do ritmo em [`examples/NEXT-LEVEL.md`](examples/NEXT-LEVEL.md). No editor, use **Exemplo Next Level**; o projeto aberto fica disponível pelo botão **Restaurar anterior**.

## Segurança dos arquivos

O editor hexadecimal importa os bytes para memória e exporta outra cópia; não sobrescreve o original. Ainda assim, uma edição inválida pode inutilizar a cópia. Teste a validação NVMB e o projeto JSON antes de usar o resultado.
