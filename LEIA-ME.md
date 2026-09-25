# Central UVERGS (painel do site)

Endereço: https://uvergs-kappa.vercel.app/admin/  (quando o domínio próprio entrar, fica dominio/admin/)

## O que dá para fazer
- **Eventos**: criar, editar, esconder ou apagar. Eventos futuros aparecem em "Próximos eventos",
  na contagem regressiva, no formulário de pré-inscrição e no gerador de ofício.
  Quando a data final passa, o evento vai sozinho para "Eventos realizados".
  Cada evento novo ganha página própria (programação, valores, fotos).
- **Notícias**: as 4 mais recentes aparecem na página inicial. Com texto, ganham página própria;
  com link externo, abrem o outro site.
- **Galeria e avisos**: fotos da seção "Como são os nossos eventos" e uma faixa amarela de recado no topo.

Cada "Publicar" atualiza o site em cerca de 1 minuto. Fotos grandes são reduzidas automaticamente.

## Configuração (uma vez só, feita pelo Will)
1. GitHub > Settings > Developer settings > OAuth Apps > New OAuth App
   - Application name: Central UVERGS
   - Homepage URL: https://uvergs-kappa.vercel.app
   - Authorization callback URL: https://uvergs-kappa.vercel.app/api/callback
   Gerar um "Client secret".
2. Vercel > projeto uvergs > Settings > Environment Variables: criar
   GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET com os valores do passo 1. Depois fazer Redeploy.
3. Quem vai usar a Central precisa de uma conta no GitHub, convidada no repositório
   site-uvergs-2027 (Settings > Collaborators > Add people). Só quem foi convidado consegue publicar.
4. Se trocar para domínio próprio: atualizar os dois endereços do passo 1.

## Para quem mexe no código
- `node cms/marcar.mjs .` coloca no index.html e em ferramentas/oficio.html as marcações `cms:` que o
  montador troca. Rode depois de regenerar o index.html. As marcações precisam continuar lá.
- `npm run build` (feito pela Vercel) gera o site em public/ a partir de conteudo/.
