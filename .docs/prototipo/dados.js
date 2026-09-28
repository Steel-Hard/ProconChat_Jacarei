// ProconChat Jacareí · constantes e dados de exemplo do protótipo
var TODAY = '2026-09-28';
var PERMS = [
  { k: 'verAg', n: 'Ver agendamentos', d: 'Consultar a lista, o calendário e o detalhe dos agendamentos.' },
  { k: 'gerAg', n: 'Gerenciar agendamentos', d: 'Assumir, atribuir, marcar como atendido, cancelar e registrar observações internas.' },
  { k: 'conteudo', n: 'Gerenciar conteúdo do chatbot', d: 'Editar categorias e perguntas e ativar ou desativar itens.' },
  { k: 'horarios', n: 'Configurar atendimento presencial', d: 'Definir grade semanal, duração, vagas, janela de agendamento, datas bloqueadas, dados da unidade e lembrete.' },
  { k: 'documentos', n: 'Configurar documentos para atendimento presencial', d: 'Editar as listas de documentos pedidos ao titular e ao representante.' },
  { k: 'sessoes', n: 'Ver sessões', d: 'Consultar, somente leitura, os passos percorridos nas conversas do chatbot.' },
  { k: 'relatorios', n: 'Ver relatórios', d: 'Acessar indicadores de uso e exportar relatórios em PDF, Excel ou CSV.' },
  { k: 'usuarios', n: 'Gerenciar usuários', d: 'Criar contas, ativar ou desativar e editar permissões.' }
];
var ALLP = PERMS.map(p => p.k);
var SCR = {
  dashboard: { t: 'Dashboard', g: 'Operação', p: null },
  agendamentos: { t: 'Agendamentos', g: 'Operação', p: 'verAg' },
  relatorios: { t: 'Relatórios', g: 'Operação', p: 'relatorios' },
  conteudo: { t: 'Conteúdo do chatbot', g: 'Chatbot', p: 'conteudo' },
  sessoes: { t: 'Sessões', g: 'Chatbot', p: 'sessoes' },
  horarios: { t: 'Horários de atendimento', g: 'Configurações', p: 'horarios' },
  documentos: { t: 'Documentos para atendimento', g: 'Configurações', p: 'documentos' },
  usuarios: { t: 'Usuários', g: 'Configurações', p: 'usuarios' },
  whatsapp: { t: 'WhatsApp', g: 'Configurações', p: 'root' },
  detalhe: { t: 'Detalhe do agendamento', g: 'Operação', p: 'verAg' }
};
var NAV = [['Operação', ['dashboard', 'agendamentos', 'relatorios']], ['Chatbot', ['conteudo', 'sessoes']], ['Configurações', ['horarios', 'documentos', 'usuarios', 'whatsapp']]];
var NAVLBL = { dashboard: 'Dashboard', agendamentos: 'Agendamentos', relatorios: 'Relatórios', conteudo: 'Conteúdo', sessoes: 'Sessões', horarios: 'Horários de atendimento', documentos: 'Documentos', usuarios: 'Usuários', whatsapp: 'WhatsApp' };
var NOW = '2026-09-28 10:15';
var MOTIVOS = [
  { k: 'fechada', l: 'Unidade fechada nesta data', f: 'a unidade estará fechada nesta data' },
  { k: 'pedido', l: 'A pedido do cidadão', f: 'cancelamento solicitado por você' },
  { k: 'duplicado', l: 'Agendamento duplicado', f: 'foi identificado outro agendamento em seu nome' },
  { k: 'outro', l: 'Outro motivo', f: 'não será possível realizar o atendimento neste horário' }
];
var ST = {
  nao_compareceu: { l: 'Não compareceu', bg: '#FBE6DC', fg: '#8A3A12', bd: '#EDB9A0' },
  pendente: { l: 'Pendente', bg: '#FCEFD6', fg: '#7A4F00', bd: '#E9C98A' },
  confirmado: { l: 'Confirmado', bg: '#E6E2F6', fg: '#3A3072', bd: '#BDB3E6' },
  atendido: { l: 'Atendido', bg: '#DFF1E6', fg: '#1B6138', bd: '#A9D6BA' },
  cancelado: { l: 'Cancelado', bg: '#EDECF1', fg: '#55516A', bd: '#CFCDD8' }
};
var DESF = {
  resolv: { l: 'Resolvida sem agendamento', c: '#3F8F63', bg: '#DFF1E6', fg: '#1B6138' },
  ag: { l: 'Terminou em agendamento', c: '#483D8B', bg: '#E6E2F6', fg: '#3A3072' },
  fora: { l: 'Fora do escopo do PROCON', c: '#8A84AB', bg: '#EDECF1', fg: '#55516A' },
  semHor: { l: 'Sem horário disponível na janela', c: '#C0392B', bg: '#FAE3E0', fg: '#8E2C22' },
  naoQuis: { l: 'Não quis agendar', c: '#D99A1E', bg: '#FCEFD6', fg: '#7A4F00' },
  remc: { l: 'Remarcou ou cancelou agendamento existente', c: '#6FA8A0', bg: '#DDF0EE', fg: '#1F5E57' },
  aband: { l: 'Abandonada', c: '#C98A7E', bg: '#F6E6E2', fg: '#7C3A2E' },
  andam: { l: 'Em andamento', c: '#5B8DC9', bg: '#DDEBF8', fg: '#1D5288' }
};
var DESF_ORDER = ['resolv', 'ag', 'fora', 'semHor', 'naoQuis', 'remc', 'aband', 'andam'];
var ETAPAS = ['categorias', 'perguntas', 'resposta', 'resolvida', 'comparecer', 'horario'];
var ETAPA_PAROU = { categorias: 'Parou na lista de categorias', perguntas: 'Parou na lista de perguntas', resposta: 'Parou aguardando a resposta', resolvida: "Parou na pergunta 'A dúvida foi resolvida?'", comparecer: 'Parou em quem vai comparecer', horario: 'Parou na escolha do horário' };
var ETAPA_ATUAL = { categorias: 'Na lista de categorias', perguntas: 'Na lista de perguntas', resposta: 'Aguardando a resposta', resolvida: "Na pergunta 'A dúvida foi resolvida?'", comparecer: 'Em quem vai comparecer', horario: 'Na escolha do horário' };
var SS = DESF;
var CATS = [
  { id: 'c1', nome: 'Cobrança/Desconto Indevido', ativa: true },
  { id: 'c2', nome: 'Contrato', ativa: true },
  { id: 'c3', nome: 'Direito de Arrependimento (7 dias)', ativa: true },
  { id: 'c4', nome: 'Vício/Defeito de Produto ou Serviço', ativa: true },
  { id: 'c5', nome: 'Garantias', ativa: true },
  { id: 'c6', nome: 'Cumprimento de Oferta/Preço', ativa: true },
  { id: 'c7', nome: 'Outros/Procedimentos Gerais', ativa: true }
];
var Q = (id, cat, texto, resposta, base, docs, presencial, nota, fora, ativa) => ({ id, cat, texto, resposta, base, docs, presencial, nota: nota || '', fora: !!fora, ativa: ativa !== false });
var QS = [
  Q('q1', 'c1', 'Fui cobrado por um serviço que não contratei. O que fazer?', 'Você não é obrigado a pagar por serviço que não solicitou. Entre em contato com a empresa, peça o cancelamento da cobrança e anote o número de protocolo. Se não houver solução, o PROCON pode intermediar.', 'CDC, art. 39, III e parágrafo único', ['Fatura ou boleto com a cobrança', 'Protocolos de contato com a empresa'], true, 'Casos sem solução direta com a empresa precisam de análise de documentos no atendimento presencial.'),
  Q('q2', 'c1', 'Recebi cobrança de valor que já paguei. Tenho direito à devolução em dobro?', 'Quem paga quantia indevida tem direito à devolução em dobro do valor pago a mais, com correção monetária e juros, salvo engano justificável da empresa.', 'CDC, art. 42, parágrafo único', ['Comprovante do pagamento original', 'Comprovante da cobrança em duplicidade'], false),
  Q('q3', 'c1', 'O desconto anunciado não foi aplicado na minha fatura.', 'A empresa deve cumprir as condições anunciadas. Solicite a correção da fatura e guarde o anúncio ou a proposta com o desconto.', 'CDC, arts. 30 e 35', ['Anúncio ou proposta com o desconto', 'Fatura sem o desconto'], false),
  Q('q4', 'c2', 'Posso cancelar um contrato com fidelidade?', 'Sim. A multa por quebra de fidelidade deve ser proporcional ao tempo restante do contrato. Se a empresa descumpriu o contrato, a multa pode não ser devida.', 'CDC, art. 51, IV; Resolução Anatel nº 632/2014', ['Contrato assinado', 'Faturas recentes'], true, 'Cálculo de multa proporcional exige análise do contrato.'),
  Q('q5', 'c2', 'A empresa alterou o contrato sem me avisar.', 'Alterações unilaterais que prejudiquem o consumidor são consideradas abusivas. Solicite por escrito o restabelecimento das condições originais.', 'CDC, art. 51, XIII', ['Contrato original', 'Comunicação da alteração, se houver'], true, 'Necessário comparar as versões do contrato.'),
  Q('q6', 'c2', 'Tenho um problema com contrato de aluguel entre particulares.', 'Contratos de locação entre particulares não configuram relação de consumo e não são atendidos pelo PROCON. Procure a Defensoria Pública ou um advogado.', 'Lei nº 8.245/1991 (Lei do Inquilinato)', [], false, '', true),
  Q('q7', 'c3', 'Comprei pela internet e me arrependi. Qual é o prazo?', 'Em compras fora do estabelecimento comercial, você pode desistir em até 7 dias a partir do recebimento do produto, com devolução integral dos valores pagos, inclusive frete.', 'CDC, art. 49', ['Comprovante da compra', 'Data de entrega do produto'], false),
  Q('q8', 'c3', 'A loja física é obrigada a aceitar troca por arrependimento?', 'Não. O direito de arrependimento vale para compras fora da loja. Na loja física, a troca sem defeito depende da política do estabelecimento.', 'CDC, art. 49', [], false),
  Q('q9', 'c4', 'O produto apresentou defeito dentro de 30 dias.', 'O fornecedor tem até 30 dias para resolver o defeito. Se não resolver, você pode escolher a troca, a devolução do valor ou o abatimento do preço.', 'CDC, art. 18, § 1º', ['Nota fiscal', 'Ordem de serviço da assistência técnica'], true, 'Quando o prazo de 30 dias já passou sem solução.'),
  Q('q10', 'c4', 'O serviço prestado ficou mal feito. O que posso exigir?', 'Você pode exigir a reexecução do serviço sem custo, a devolução do valor pago ou o abatimento proporcional do preço.', 'CDC, art. 20', ['Contrato ou orçamento do serviço', 'Fotos do resultado'], true, 'Avaliação depende de documentos e registros do serviço.'),
  Q('q11', 'c4', 'A assistência técnica passou de 30 dias sem consertar.', 'Passado o prazo de 30 dias, você pode exigir a substituição do produto, a restituição do valor pago ou o abatimento do preço.', 'CDC, art. 18, § 1º', ['Nota fiscal', 'Ordem de serviço com a data de entrada'], true, 'Encaminhamento de reclamação formal contra o fornecedor.'),
  Q('q12', 'c5', 'Qual é a diferença entre garantia legal e contratual?', 'A garantia legal é obrigatória: 30 dias para produtos não duráveis e 90 dias para duráveis. A garantia contratual é oferecida pelo fabricante e se soma à legal.', 'CDC, arts. 26 e 50', ['Nota fiscal', 'Termo de garantia'], false),
  Q('q13', 'c5', 'A loja se recusa a cumprir a garantia estendida.', 'A garantia estendida é um seguro contratado à parte. Verifique as condições da apólice e registre reclamação na seguradora.', 'CDC, art. 50; Resolução CNSP nº 296/2013', ['Apólice ou certificado da garantia estendida'], false, '', false, false),
  Q('q14', 'c6', 'O preço na prateleira é diferente do cobrado no caixa.', 'Quando houver divergência de preços, o consumidor paga o menor valor anunciado.', 'Lei nº 10.962/2004, art. 5º; Decreto nº 5.903/2006', ['Foto da etiqueta ou prateleira', 'Cupom fiscal'], false),
  Q('q15', 'c6', 'A empresa não cumpriu a oferta anunciada.', 'Toda oferta anunciada obriga o fornecedor. Você pode exigir o cumprimento forçado, aceitar produto equivalente ou desistir com devolução do valor.', 'CDC, arts. 30 e 35', ['Anúncio ou print da oferta', 'Comprovante da compra ou do pedido'], true, 'Quando a empresa se recusa a cumprir a oferta.'),
  Q('q16', 'c7', 'Como registrar uma reclamação formal no PROCON?', 'A reclamação formal é aberta no atendimento presencial, com os documentos da compra ou contratação. O chatbot pode agendar um horário para você.', 'Decreto nº 2.181/1997', ['Documentos da compra ou contratação', 'Protocolos de contato com a empresa'], true, 'Abertura de reclamação formal é sempre presencial.'),
  Q('q17', 'c7', 'Quais documentos preciso para abrir uma reclamação?', 'Leve documento de identificação com foto, CPF, comprovante de endereço e os documentos que comprovem a relação com a empresa.', 'Decreto nº 2.181/1997', ['Comprovante de endereço'], false),
  Q('q18', 'c7', 'Qual é o horário e o endereço do PROCON Jacareí?', 'O atendimento presencial funciona de segunda a sexta, das 8h30 às 11h30 e das 13h30 às 16h30, somente com agendamento.', '—', [], false)
];
var A = (id, nome, cpf, q, data, hora, rep, resp, status, sess, sd, sh, ai, notas) => ({ id, nome, cpf, q, data, hora, rep, resp, status, sess, sd, sh, ai, notas: notas || [] });
var APPTS = [
  A('A3F9C21B', 'Maria Aparecida Souza', '***.456.789-**', 'q1', '2026-09-28', '09:00', false, null, 'pendente', 'S-7K2P9Q', '2026-09-25', '14:12', true),
  A('7D2E0B4F', 'José Carlos Pereira', '***.112.340-**', 'q9', '2026-09-28', '09:30', true, null, 'pendente', 'S-4H8D1M', '2026-09-26', '10:41', false),
  A('C81A5E93', 'Ana Beatriz Lima', '***.908.221-**', 'q4', '2026-09-28', '10:00', false, 'Mariana Couto', 'confirmado', 'S-2W6R8T', '2026-09-24', '19:05', true, [{ autor: 'Mariana Couto', q: '26/09/2026 10:02', t: 'Conferir cláusula de multa por fidelidade antes do atendimento.' }]),
  A('5B9F3D10', 'Antônio Ferreira Gomes', '***.371.559-**', 'q11', '2026-09-28', '13:30', true, 'Ricardo Nogueira', 'confirmado', 'S-9P3L5Z', '2026-09-23', '08:47', false, [{ autor: 'Ricardo Nogueira', q: '24/09/2026 15:20', t: 'Titular idoso. Filha comparecerá com procuração.' }]),
  A('E4C7A2D8', 'Luciana Martins', '***.664.018-**', 'q14', '2026-09-28', '08:30', false, 'Paula Siqueira', 'atendido', 'S-1N5B7V', '2026-09-22', '12:30', false),
  A('92F1B6C4', 'Roberto Almeida', '***.285.903-**', 'q2', '2026-09-28', '14:00', false, null, 'cancelado', 'S-6C2X4K', '2026-09-24', '21:18', true),
  A('1A6D8E2F', 'Fernanda Ribeiro', '***.730.482-**', 'q7', '2026-09-29', '08:30', false, null, 'pendente', 'S-3J9F2A', '2026-09-27', '09:55', false),
  A('B3E5C9A7', 'Paulo Henrique Dias', '***.519.677-**', 'q15', '2026-09-29', '10:30', false, 'Mariana Couto', 'confirmado', 'S-8T1Q6E', '2026-09-25', '17:33', true),
  A('6F0A4B2E', 'Sebastiana Rodrigues', '***.042.816-**', 'q5', '2026-09-30', '09:00', true, null, 'pendente', 'S-5M7G3R', '2026-09-27', '15:02', false),
  A('D7C2E8F1', 'Marcos Vinícius Rocha', '***.893.145-**', 'q10', '2026-09-30', '14:30', false, 'Ricardo Nogueira', 'confirmado', 'S-0Y4U8I', '2026-09-26', '11:14', false),
  A('4E8B1A6C', 'Cláudia Nascimento', '***.357.960-**', 'q16', '2026-10-01', '11:00', false, 'Paula Siqueira', 'confirmado', 'S-2E5W9O', '2026-09-26', '16:40', false),
  A('8C3F7D5A', 'Juliana Castro', '***.604.238-**', 'q12', '2026-09-25', '13:30', false, 'Mariana Couto', 'atendido', 'S-7R2T6Y', '2026-09-21', '10:08', true),
  A('2B7E9C4D', 'Rafael Moreira', '***.178.402-**', 'q3', '2026-09-24', '15:00', false, 'Ricardo Nogueira', 'atendido', 'S-4A8S1D', '2026-09-20', '13:22', false),
  A('F5A1D3B8', 'Tereza Cristina Barbosa', '***.921.574-**', 'q13', '2026-09-24', '09:30', true, null, 'cancelado', 'S-9F3G7H', '2026-09-19', '20:51', false),
  A('C4D1E7A0', 'Benedito Aparecido Silva', '***.803.617-**', 'q16', '2026-09-25', '10:30', true, null, 'pendente', 'S-3V7B1N', '2026-09-22', '16:45', false),
  A('AB12CD34', 'Vanessa Lopes', '***.245.890-**', 'q10', '2026-09-25', '14:00', false, 'Paula Siqueira', 'nao_compareceu', 'S-8N2M4B', '2026-09-21', '09:37', false),
  A('9D4F2A61', 'Carlos Eduardo Mendes', '***.517.034-**', 'q4', '2026-09-28', '11:00', false, 'Helena Prado', 'confirmado', 'S-5T8Y2U', '2026-09-25', '13:05', true),
  A('3E7B5C92', 'Rosângela Teixeira', '***.662.109-**', 'q9', '2026-09-29', '14:00', true, 'Helena Prado', 'confirmado', 'S-1Q4W7E', '2026-09-26', '08:20', false),
  A('F2B8D6E4', 'Márcia Guimarães', '***.390.726-**', 'q15', '2026-09-28', '09:00', false, 'Helena Prado', 'confirmado', 'S-2K7J4H', '2026-09-24', '11:48', false),
  A('E6A3C1F9', 'Otávio Brandão', '***.158.463-**', 'q5', '2026-09-25', '15:30', false, 'Ricardo Nogueira', 'confirmado', 'S-6G1F3D', '2026-09-22', '14:10', true),
  A('7A1C3E5B', 'Adriana Farias', '***.318.044-**', 'q9', '2026-10-01', '08:30', false, 'Paula Siqueira', 'confirmado', 'S-A1B2C3', '2026-09-26', '10:02', false),
  A('8B2D4F6A', 'Wagner Lima', '***.590.271-**', 'q1', '2026-10-01', '13:30', false, null, 'pendente', 'S-B2C3D4', '2026-09-27', '20:11', true),
  { ...A('5C8E1D7B', 'Sueli Aparecida Campos', '***.274.615-**', 'q11', '2026-10-01', '10:00', false, null, 'pendente', 'S-4P6L2K', '2026-09-23', '17:05', false), remarc: { de: '2026-09-29 13:30', resp: 'Mariana Couto', q: '27/09/2026 às 19:12' } },
  A('9C3E5A7B', 'Irene Batista', '***.771.382-**', 'q15', '2026-10-02', '09:00', true, 'Ricardo Nogueira', 'confirmado', 'S-C3D4E5', '2026-09-26', '14:40', false),
  A('A4F6B8C0', 'Mateus Oliveira', '***.206.519-**', 'q4', '2026-10-02', '14:30', false, null, 'pendente', 'S-D4E5F6', '2026-09-27', '11:23', false),
  A('B5A7C9D1', 'Célia Monteiro', '***.845.630-**', 'q11', '2026-10-05', '08:30', false, 'Mariana Couto', 'confirmado', 'S-E5F6G7', '2026-09-27', '09:48', true),
  A('C6B8D0E2', 'Renato Assis', '***.132.907-**', 'q10', '2026-10-05', '10:30', false, null, 'pendente', 'S-F6G7H8', '2026-09-28', '07:55', false),
  A('D7C9E1F3', 'Priscila Nunes', '***.467.218-**', 'q16', '2026-10-06', '09:30', false, 'Paula Siqueira', 'confirmado', 'S-G7H8J9', '2026-09-27', '16:30', false),
  A('E8D0F2A4', 'Joaquim Ferraz', '***.653.184-**', 'q5', '2026-10-06', '13:30', true, null, 'pendente', 'S-H8J9K0', '2026-09-28', '08:12', false),
  A('F9E1A3B5', 'Lúcia Moreira Dantas', '***.920.476-**', 'q2', '2026-10-07', '11:00', false, 'Ricardo Nogueira', 'confirmado', 'S-J9K0L1', '2026-09-27', '13:17', true),
  A('0A2B4C6D', 'Everton Ramos', '***.381.652-**', 'q9', '2026-10-08', '15:00', false, null, 'pendente', 'S-K0L1M2', '2026-09-28', '09:31', false),
  A('1B3C5D7E', 'Simone Arantes', '***.744.093-**', 'q14', '2026-10-09', '10:00', false, 'Mariana Couto', 'confirmado', 'S-L1M2N3', '2026-09-28', '08:44', false),
  A('0E9C6A2F', 'Gustavo Pires', '***.486.031-**', 'q17', '2026-10-02', '15:30', false, null, 'pendente', 'S-6K1L4Z', '2026-09-27', '18:26', true)
];
var S_ = (cod, data, hora, desf, cat, q, o) => ({ cod, data, hora, desf, cat, q, ...(o || {}) });
var EXTRA_SESS = [
  S_('S-Q8W3E1', '2026-09-28', '08:05', 'andam', 'c3', null, { etapa: 'perguntas' }),
  S_('S-M4N7B2', '2026-09-28', '08:41', 'andam', 'c4', 'q9', { etapa: 'resposta', ai: true }),
  S_('S-T6Y1U9', '2026-09-28', '08:52', 'andam', null, null, { etapa: 'categorias' }),
  S_('S-W7E4R2', '2026-09-28', '09:58', 'andam', 'c1', 'q2', { etapa: 'resolvida', ai: true, tel: 'T-92F1B6C4' }),
  S_('S-Z2X5C8', '2026-09-27', '19:20', 'resolv', 'c3', 'q7'),
  S_('S-H9J3K6', '2026-09-27', '16:03', 'resolv', 'c6', 'q14', { ai: true }),
  S_('S-G2H5J8', '2026-09-27', '12:10', 'aband', 'c4', 'q10', { etapa: 'resposta' }),
  S_('S-P4Q7R1', '2026-09-26', '10:05', 'resolv', 'c1', 'q3', { ai: true, aiFail: true }),
  S_('S-N3M6B9', '2026-09-26', '17:22', 'naoQuis', 'c1', 'q2', { ai: true, tel: 'T-A3F9C21B' }),
  S_('S-L1P0O4', '2026-09-26', '10:12', 'aband', 'c2', null, { etapa: 'perguntas' }),
  S_('S-R7T2Y5', '2026-09-25', '21:40', 'aband', 'c1', 'q1', { etapa: 'horario', ai: true }),
  S_('S-V3B8N1', '2026-09-25', '11:02', 'resolv', 'c7', 'q18'),
  S_('S-J5K8L2', '2026-09-24', '15:40', 'semHor', 'c2', 'q4', { ai: true, tel: 'T-C81A5E93' }),
  S_('S-D5F6G7', '2026-09-24', '07:48', 'aband', null, null, { etapa: 'categorias' }),
  S_('S-K8L9M0', '2026-09-23', '14:37', 'resolv', 'c5', 'q12', { ai: true, tel: 'T-A3F9C21B' }),
  S_('S-E2R3T4', '2026-09-22', '09:15', 'fora', 'c2', 'q6'),
  S_('S-C9V2B5', '2026-09-21', '20:02', 'aband', 'c6', 'q14', { etapa: 'resolvida', ai: true }),
  S_('S-X4Z7Q1', '2026-09-20', '11:30', 'aband', 'c7', 'q16', { etapa: 'comparecer' }),
  S_('S-Y8U3I6', '2026-09-19', '16:48', 'semHor', 'c4', 'q11', { tel: 'T-5B9F3D10' }),
  S_('S-B6N2M8', '2026-09-02', '10:30', 'resolv', 'c4', 'q12'),
  S_('S-F1G4H7', '2026-08-28', '09:12', 'fora', 'c2', 'q6', { tel: 'T-A3F9C21B' })
];
var USERS = [
  { id: 'u0', nome: 'Helena Prado', email: 'helena.prado@jacarei.sp.gov.br', root: true, ativo: true, perms: ALLP, lastAcc: '28/09/2026 às 08:42', permMod: { por: 'Equipe técnica', em: '02/03/2026' } },
  { id: 'u1', nome: 'Mariana Couto', email: 'mariana.couto@jacarei.sp.gov.br', ativo: true, perms: ['verAg', 'gerAg', 'conteudo', 'horarios', 'documentos', 'sessoes', 'relatorios'], lastAcc: '27/09/2026 às 17:05', permMod: { por: 'Helena Prado', em: '14/08/2026' } },
  { id: 'u2', nome: 'Ricardo Nogueira', email: 'ricardo.nogueira@jacarei.sp.gov.br', ativo: true, perms: ['verAg', 'gerAg', 'sessoes'], lastAcc: '28/09/2026 às 09:10', permMod: { por: 'Helena Prado', em: '03/06/2026' } },
  { id: 'u3', nome: 'Paula Siqueira', email: 'paula.siqueira@jacarei.sp.gov.br', ativo: true, perms: ['verAg', 'gerAg', 'conteudo', 'sessoes', 'relatorios', 'usuarios'], lastAcc: '26/09/2026 às 14:31', permMod: { por: 'Helena Prado', em: '21/09/2026' } },
  { id: 'u4', nome: 'Lucas Andrade', email: 'lucas.andrade@jacarei.sp.gov.br', ativo: true, perms: ['verAg', 'sessoes'], lastAcc: '28/09/2026 às 10:02', permMod: { por: 'Paula Siqueira', em: '22/09/2026' } },
  { id: 'u5', nome: 'Denise Moura', email: 'denise.moura@jacarei.sp.gov.br', ativo: false, perms: ['verAg', 'gerAg'], lastAcc: null, permMod: { por: 'Helena Prado', em: '30/07/2026' } }
];
var WD = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
var WDS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
var dt = s => new Date(s + 'T12:00:00');
var isoOf = x => x.toISOString().slice(0, 10);
var addDays = (s, n) => { const x = dt(s); x.setDate(x.getDate() + n); return isoOf(x); };
var br = s => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
var brs = s => s.slice(8, 10) + '/' + s.slice(5, 7);
var toMin = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
var fromMin = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
var ini = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
var rnd = i => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
var stop = e => e && e.stopPropagation();
var DOCS_TIT0 = ['RG ou outro documento oficial com foto', 'CPF', 'Comprovante de endereço', 'Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)'];
var DOCS_REP0 = ['RG e CPF do titular (cópia)', 'RG ou outro documento oficial com foto do representante', 'Autorização assinada pelo titular ou procuração', 'Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)'];
var DOCS_OLD = {
  F5A1D3B8: ['RG e CPF do titular (cópia)', 'RG do representante', 'Procuração com firma reconhecida', 'Nota fiscal ou contrato'],
  '2B7E9C4D': ['RG ou outro documento oficial com foto', 'CPF', 'Nota fiscal ou contrato']
};
var CPF_FIX = { A3F9C21B: '12345678909', '7D2E0B4F': '38711234052', C81A5E93: '26190822115' };
var cpfFull = a => CPF_FIX[a.id] || (String(100 + parseInt(a.id.slice(0, 4), 16) % 900) + a.cpf.replace(/\D/g, '') + String(parseInt(a.id.slice(4), 16) % 100).padStart(2, '0'));
var norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
var CATDESC = {
  c1: 'Cobranças de serviços não contratados, valores pagos em duplicidade e descontos não aplicados.',
  c2: 'Cancelamento, fidelidade, multas e alterações de contrato.',
  c3: 'Desistência de compras feitas fora do estabelecimento comercial.',
  c4: 'Produtos com defeito e serviços mal executados.',
  c5: 'Garantia legal, contratual e estendida.',
  c6: 'Divergência de preços e ofertas anunciadas não cumpridas.',
  c7: 'Reclamação formal, documentos e informações sobre o atendimento do PROCON.'
};
var CAT_CURTO = { c1: 'Cobrança indevida', c2: 'Contratos', c3: 'Arrependimento 7 dias', c4: 'Vício ou defeito', c5: 'Garantias', c6: 'Oferta e preço', c7: 'Outros e procedimentos' };
var Q_CURTO = { q1: 'Serviço não contratado', q2: 'Cobrança já paga', q3: 'Desconto não aplicado', q4: 'Cancelar com fidelidade', q5: 'Contrato alterado', q6: 'Aluguel entre pessoas', q7: 'Compra pela internet', q8: 'Troca na loja física', q9: 'Defeito em até 30 dias', q10: 'Serviço mal feito', q11: 'Conserto passou 30 dias', q12: 'Tipos de garantia', q13: 'Garantia estendida', q14: 'Preço diferente no caixa', q15: 'Oferta não cumprida', q16: 'Abrir reclamação', q17: 'Documentos necessários', q18: 'Horário e endereço' };
var Q_DESC = { q1: 'Cobrança por algo que você não pediu', q2: 'Valor cobrado duas vezes', q4: 'Multa ao cancelar antes do prazo', q7: 'Desistir em até 7 dias após receber', q9: 'Prazo para o fornecedor resolver', q14: 'Etiqueta diferente do valor cobrado', q16: 'Como abrir uma reclamação formal' };
var MOD_POR = ['Mariana Couto', 'Paula Siqueira', 'Helena Prado'];
var modFor = (id, i) => ({ por: MOD_POR[i % 3], em: br(addDays('2026-09-25', -((i * 7) % 40))) });
var HCFG = ['dias', 'duracao', 'vagas', 'janela', 'antecedencia', 'alertaEspera', 'bloqueios', 'endereco', 'enderecoCompl', 'lembreteOn', 'lembreteHoras'];
var pickCfg = s => { const o = {}; HCFG.forEach(k => o[k] = s[k]); return o; };
window.PCJ_DADOS_OK = true;
