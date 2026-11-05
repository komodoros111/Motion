# Motion Studio AI

Editor independente para criar e editar motion graphics com assistência de IA. O projeto oferece uma timeline visual e um editor hexadecimal genérico para inspecionar e alterar cópias de arquivos binários. Ele não envia projetos a um modelo: o botão **Briefing IA** prepara instruções e o JSON atual para você usar no assistente de sua escolha.

## Iniciar

Requer Node.js 20 ou mais recente. Não há dependências externas nem etapa de instalação.

```powershell
cd motion-ai-studio
npm run dev
```

Abra <http://localhost:4173>. O servidor escuta apenas em `127.0.0.1`.

## O que dá para fazer

- Editar keyframes de posição, rotação, escala e opacidade na timeline.
- Visualizar uma composição 2D, controlar tempo e reprodução.
- Importar e exportar projetos JSON e o formato binário documentado `.nvmb`.
- Abrir qualquer arquivo como bytes, buscar valores hexadecimais e exportar uma cópia editada.
- Validar e reparar o CRC-32 de um `.nvmb` depois de uma edição binária.
- Copiar um briefing para pedir alterações a uma IA, sem credenciais ou envio automático.

## Arquivos principais

- `src/app.js`: interface, timeline, preview, importação e exportação.
- `src/motion-format.js`: validação e codificação do formato `.nvmb`.
- `src/styles.css`: layout responsivo e estilos.
- `AGENTS.md` e `AI-INSTRUCTIONS.md`: orientação para agentes e modelos de IA.
- `docs/FORMAT.md`: especificação binária completa.

## Cuidados com arquivos binários

O editor hexadecimal trabalha com uma cópia em memória e exporta um arquivo separado. Ele não interpreta automaticamente formatos desconhecidos. Alterações arbitrárias podem invalidar a estrutura de um arquivo; `.nvmb` é o único formato binário compreendido pelo editor. Consulte [docs/FORMAT.md](docs/FORMAT.md).

## Verificação de sintaxe

```powershell
npm run check
```

Este projeto é uma ferramenta independente e não usa APIs privadas ou conteúdo de terceiros.
