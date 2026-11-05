# Formato binário NVMB

`.nvmb` (Nirvy Motion Binary) é o contêiner binário nativo desta ferramenta. A versão 1 contém um JSON UTF-8. Os campos numéricos usam **little-endian**.

## Cabeçalho: 16 bytes

| Offset | Tamanho | Campo | Valor / interpretação |
|---:|---:|---|---|
| 0 | 4 | Magic | ASCII `NVMB` (`4E 56 4D 42`) |
| 4 | 2 | Versão | u16 LE, valor `1` |
| 6 | 2 | Tamanho do cabeçalho | u16 LE, valor `16` |
| 8 | 4 | Tamanho do payload | u32 LE em bytes |
| 12 | 4 | CRC-32 | u32 LE do payload, algoritmo CRC-32/ISO-HDLC |

O payload começa no offset 16 e ocupa exatamente o tamanho declarado. Arquivos truncados, com bytes excedentes, magic/versão inválidos ou payload acima de 16 MiB são rejeitados.

## CRC

CRC-32/ISO-HDLC: polinômio refletido `0xEDB88320`, valor inicial `0xFFFFFFFF`, xor final `0xFFFFFFFF`. O CRC cobre exclusivamente os bytes do payload. Exemplo de referência: CRC da sequência ASCII `123456789` é `0xCBF43926`.

## Payload JSON

Decodifique o payload como UTF-8 e parseie JSON. O documento deve ter `format: "nirvy.motion"`, `version: 1`, `name`, `durationMs`, `fps`, `canvas` e array `tracks`. O canvas contém `width`, `height`, `background`, além dos campos opcionais `label` e `objectColor`. A validação de aplicação exige propriedades conhecidas, IDs globais únicos, valores finitos e keyframes dentro da duração. Consulte `src/motion-format.js` para os limites executáveis.

## Segurança e compatibilidade

- CRC detecta corrupção acidental; não é assinatura nem prova de autenticidade.
- JSON válido e CRC válido ainda podem falhar na validação do esquema.
- O editor hexadecimal não decodifica outros contêineres. Para formatos não reconhecidos, só oferece edição bruta de cópia.
- Uma futura incompatibilidade estrutural exige nova versão do cabeçalho e estratégia explícita de migração.

## Limites do esquema v1

- `durationMs`: 100–120000; `fps`: 1–240; largura/altura do canvas: 1–8192.
- Propriedades animáveis: uma track por propriedade entre `x`, `y`, `rotation`, `scale` e `opacity`.
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`. O easing do keyframe de chegada governa a interpolação até ele.
- Máximo de 64 tracks e 10000 keyframes. IDs de tracks e keyframes devem ser não vazios e globalmente únicos.
- Keyframe deve ficar em `0..durationMs`. Opacidade: `0..1`; escala: `(0..100]`; posição: `-100000..100000`; rotação: `-360000..360000`.
- `canvas.label` opcional: texto de até 24 caracteres; `canvas.subtitle` opcional: texto de até 80 caracteres. Cores devem usar `#RRGGBB`.
- O preview escala X/Y do espaço do canvas para o tamanho visível e posiciona o elemento pelo centro. O renderer mostra somente um elemento estilizado.
