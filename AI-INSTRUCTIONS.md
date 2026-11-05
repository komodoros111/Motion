# Briefing para uma IA editar motions

Use estas instruções ao pedir a um assistente para criar ou alterar um motion deste repositório. Anexe o JSON do projeto exportado pelo Motion Studio.

## Regras

1. Trate o JSON como projeto autoral. Mantenha `version` e campos existentes, salvo pedido explícito.
2. Preserve IDs de camadas, tracks e keyframes que não precisarem ser removidos. IDs novos devem ser únicos.
3. Use apenas as propriedades `x`, `y`, `rotation`, `scale`, `opacity` já suportadas. Valores são números; `scale` deve ser positivo e `opacity` deve ficar entre 0 e 1.
4. Cada keyframe deve estar em `0 <= timeMs <= durationMs`, com `easing` entre `linear`, `easeIn`, `easeOut` e `easeInOut`. Ordene keyframes pelo tempo.
5. O documento usa `format: "nirvy.motion"`, `version: 1`, duração `durationMs` em ms, `canvas: { width, height, background }` e arrays `tracks`. Tracks têm `id`, `property`, `label` e `keyframes`; keyframes têm `id`, `timeMs`, `value`, `easing`. Não há array `layers` nesta versão. Não remova campos desconhecidos.
6. Não edite bytes `.nvmb` diretamente se o JSON puder ser editado. Para binary patch, descreva offset, bytes antigos, novos e motivo; nunca assuma layout desconhecido.
7. Não introduza URLs remotas de mídia, segredos, tokens ou código executável no documento.

## Resposta esperada

Explique em uma frase a intenção, liste as alterações e devolva o documento JSON completo em bloco `json`. Se faltar informação, escolha uma alteração visual conservadora e identifique a suposição. O usuário pode importar o JSON no editor e exportar como `.nvmb`.

## Exemplo de pedido

“Faça a camada principal entrar da esquerda nos primeiros 0,8 s, desacelerar suavemente, girar 8 graus e desaparecer no último segundo. Preserve a duração, as outras camadas e os IDs não afetados. Devolva o JSON completo.”
