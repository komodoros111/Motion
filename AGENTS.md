# Instruções para agentes de IA

Leia este arquivo antes de alterar o projeto. Siga também `docs/FORMAT.md` para qualquer mudança em `.nvmb`.

## Objetivo e limites

Motion Studio AI é um editor local independente de motion graphics. Preserve a separação entre editor visual, edição hexadecimal e codecs. Não acrescente envio de projetos a serviços remotos sem pedido explícito. Não trate formatos binários desconhecidos como se fossem `.nvmb`.

## Arquitetura

- Aplicação sem framework: JavaScript ES modules em `src/app.js`, HTML em `index.html` e CSS em `src/styles.css`.
- `src/motion-format.js` é o módulo de formato e validação; mantenha UI fora dele.
- `server.mjs` serve arquivos estáticos usando apenas módulos nativos do Node.
- O projeto não tem dependências de runtime. Se isso mudar, atualize README e scripts.
- Dados de projeto são JSON versionados pelo campo `version`; mantenha compatibilidade explícita ao mudar esquema.

## Modelo de motion

O documento possui `version`, `name`, `duration`, `fps`, `width`, `height`, `tracks` e `layers`. Uma track tem `id`, `property`, `layerId` e `keyframes`; cada keyframe tem `id`, `time`, `value` e `ease`. Propriedades atuais: `x`, `y`, `rotation`, `scale`, `opacity`. Respeite limites, IDs estáveis e ordenação temporal. Ao adicionar propriedades, atualize preview, UI, validação e briefing.

## Formato binário

`.nvmb` tem cabeçalho NVMB v1, comprimento explícito e CRC32 do JSON UTF-8. Não altere endianness, layout, checksum ou limites sem atualizar versão, codec, documentação e tratamento de arquivos. Preserve os bytes de cabeçalho quando reparar checksum. Rejeite payloads acima do limite documentado. Veja `docs/FORMAT.md`.

## Editor hexadecimal

- Nunca sobrescreva o arquivo de origem. Importe em memória e exporte sempre um novo arquivo.
- Mantenha busca, offsets e edição restritos aos limites do buffer.
- Edite e valide uma cópia temporária antes de trocar estado.
- Mudanças em bytes podem corromper arquivos; apresente erro claro e não alegue que formatos desconhecidos foram validados.
- CRC correto não garante que o JSON ou motion seja válido: valide todas as camadas.

## Interface e acessibilidade

- Mantenha controles de teclado e foco visível.
- Botões têm nomes claros e estados acessíveis; inputs precisam de label.
- Teste layout estreito e largo ao ajustar CSS. Evite prender a interface a uma resolução única.
- Respeite `prefers-reduced-motion` ao introduzir animações.

## Fluxo para mudanças

1. Identifique o módulo dono da responsabilidade.
2. Faça a menor mudança coerente e atualize documentação quando comportamento ou formato mudar.
3. Execute `npm run check` para validar sintaxe. Não remova silenciosamente funcionalidades de edição/importação/exportação.
4. Relate limitações e formatos ainda não suportados com precisão.
