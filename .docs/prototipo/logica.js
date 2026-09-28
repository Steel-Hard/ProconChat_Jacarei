// ProconChat Jacareí · lógica do painel (métodos do componente)
window.PCJBase = class PCJBase {
  initialState() { return {
    logged: true, role: 'root', screen: 'agendamentos', selId: null, backTo: 'agendamentos',
    appts: APPTS.map(a => {
      const hist = [{ t: 'Criado pelo chatbot como Pendente', q: br(a.sd) + ' às ' + a.sh }];
      if (a.remarc) {
        hist.push({ t: 'Assumido por ' + a.remarc.resp + ' · Confirmado', q: br(addDays(a.sd, 1)) + ' às 09:12' });
        hist.push({ t: 'Remarcado pelo cidadão no chatbot: de ' + br(a.remarc.de.slice(0, 10)) + ' às ' + a.remarc.de.slice(11) + ' para ' + br(a.data) + ' às ' + a.hora, q: a.remarc.q });
        hist.push({ t: 'Voltou a Pendente sem responsável após a remarcação (antes: ' + a.remarc.resp + ')', q: a.remarc.q });
      }
      if (a.resp) hist.push({ t: 'Assumido por ' + a.resp + ' · Confirmado', q: br(addDays(a.sd, 1)) + ' às 09:12' });

      if (a.status === 'atendido') hist.push({ t: 'Marcado como atendido por ' + a.resp, q: br(a.data) + ' às ' + fromMin(toMin(a.hora) + 35) });
      if (a.status === 'nao_compareceu') hist.push({ t: 'Marcado como não compareceu por ' + a.resp, q: br(a.data) + ' às ' + fromMin(toMin(a.hora) + 40) });
      if (a.status === 'cancelado') hist.push({ t: 'Cancelado pelo cidadão no chatbot', q: br(addDays(a.data, -1)) + ' às 18:40' });
      return { ...a, hist, cpfNum: cpfFull(a), docsSent: DOCS_OLD[a.id] || (a.rep ? DOCS_REP0 : DOCS_TIT0), docsQSent: (QS.find(q => q.id === a.q) || { docs: [] }).docs.slice() };
    }),
    view: 'lista', fStatus: 'todos', fPeriodo: 'proximos', fResp: 'todos', weekOff: 0, page: 0, sortKey: null, sortDir: 'asc', cancelMotivo: '', cancelObs: '', lembreteOn: true, lembreteHoras: 24, endereco: 'Rua Exemplo, 123 – Centro, Jacareí-SP', enderecoCompl: 'Térreo, ao lado da recepção',
    modal: null, assignTo: '', noteDraft: '', toast: null,
    loginEmail: '', loginPass: '', loginErr: '',
    cats: CATS.map((c, i) => ({ ...c, desc: CATDESC[c.id], curto: CAT_CURTO[c.id] || '', mod: modFor(c.id, i + 2) })), qs: QS.map((q, i) => ({ ...q, curto: Q_CURTO[q.id] || '', descCurta: Q_DESC[q.id] || '', ai: !q.fora && q.id !== 'q18', mod: modFor(q.id, i) })), qBusca: '', previewQ: false, selCat: 'c1', editQ: null, newDocQ: '',
    sessDesf: 'todos', sessPer: '30d', sessIni: '2026-09-01', sessFim: '2026-09-28', sessCat: 'todos', sessBusca: '', sessPage: 0, selSess: null,
    repPeriodo: '30d', repIni: '2026-09-01', repFim: '2026-09-26', expMenu: false, expFmt: null, expGen: false,
    dias: [1, 2, 3, 4, 5, 6, 0].map(d => ({ dow: d, on: d >= 1 && d <= 5, faixas: d >= 1 && d <= 5 ? [['08:30', '11:30'], ['13:30', '16:30']] : [] })),
    duracao: 30, vagas: 2, janela: 30, antecedencia: 1, alertaEspera: 7, esperaLonga: false,
    bloqueios: [
      { data: '2026-10-12', desc: 'Nossa Senhora Aparecida (feriado nacional)' },
      { data: '2026-10-28', desc: 'Dia do Servidor Público (ponto facultativo)' },
      { data: '2026-11-02', desc: 'Finados (feriado nacional)' },
      { data: '2026-11-20', desc: 'Dia da Consciência Negra (feriado nacional)' }
    ],
    newBlqData: '2026-09-30', newBlqDesc: 'Ponto facultativo (exemplo)', newBlqTipo: 'dia', newBlqIni: '13:30', newBlqFim: '16:30', prevMes: 0, prevDia: null, hd: null, confl: null, horMod: { por: 'Mariana Couto', em: '15/09/2026' },
    docsTit: ['RG ou outro documento oficial com foto', 'CPF', 'Comprovante de endereço', 'Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)'],
    docsRep: ['RG e CPF do titular (cópia)', 'RG ou outro documento oficial com foto do representante', 'Autorização assinada pelo titular ou procuração', 'Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)'],
    newDocTit: '', newDocRep: '', dd: null, docEdit: null, docsMod: { por: 'Mariana Couto', em: '10/09/2026' }, docPvG: 'tit', docPvQ: 'q9',
    users: USERS, selUser: 'u4', newUser: null, ud: null, uModal: null,
    vw: typeof window !== 'undefined' ? window.innerWidth : 1440, drawer: false, tip: null, emptyData: false, cpfCheck: '', cpfResult: null, busca: '', agendaCheia: false, falhas: false, userMenu: false, modalPwd: null, pwd: { atual: '', nova: '', conf: '' }, catEdit: null,
    wTokBad: false, wHookOld: false, wLimite: false, wQualBaixa: false, wPaused: false, wzd: null, wzTest: null, wzRej: false, wzPauseAsk: false, wzTplLoad: false,
    wz: { mod: { por: 'Helena Prado', em: '12/08/2026' },
      cfg: { phoneId: '109876543210987', wabaId: '204512398765432', token: { last4: 'a91F', novo: null }, secret: { last4: '3c7E', novo: null } },
      hist: [{ t: 'Token de acesso e App Secret substituídos', por: 'Helena Prado', q: '12/08/2026 às 16:40' }, { t: 'ID do número de telefone e ID da conta WhatsApp Business alterados', por: 'Helena Prado', q: '12/08/2026 às 16:32' }] },
    wzTpl: [{ k: 'lembrete', n: 'Lembrete do atendimento', id: 'lembrete_atendimento', st: 'aprovado', efeito: 'lembretes' }, { k: 'cancel', n: 'Aviso de cancelamento', id: 'aviso_cancelamento', st: 'analise', efeito: 'avisos de cancelamento' }]
  }; }

  componentDidMount() {
    this._rs = () => this.setState({ vw: window.innerWidth, drawer: window.innerWidth >= 1200 ? false : this.state.drawer }); window.addEventListener('resize', this._rs);
    try { const s = JSON.parse(localStorage.getItem('pcj-proto') || '{}'); if (s.screen) this.setState({ logged: s.logged !== false, role: s.role || 'root', screen: s.screen, selId: s.selId || null, view: s.view || 'lista' }, () => { if (!this.allowed(this.state.screen)) this.go(this.firstAllowed()); }); } catch (e) {}
  }
  componentWillUnmount() { window.removeEventListener('resize', this._rs); }
  componentDidUpdate() {
    const { logged, role, screen, selId, view } = this.state;
    try { localStorage.setItem('pcj-proto', JSON.stringify({ logged, role, screen, selId, view })); } catch (e) {}
  }
  flash(msg) { this.setState({ toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: null }), 2600); }
  me() { const r = this.state.role; const id = r === 'root' ? 'u0' : r === 'gestor' ? 'u3' : 'u4'; return this.state.users.find(u => u.id === id); }
  perms() { const m = this.me(); return m.root ? ALLP : m.perms; }
  allowed(scr) { if (scr === 'dashboard') { const P = this.perms(); return this.state.role === 'root' || ['verAg', 'sessoes', 'relatorios'].some(k => P.includes(k)); } const p = SCR[scr].p; if (!p) return true; if (p === 'root') return this.state.role === 'root'; return this.perms().includes(p); }
  go(scr) { this.setState({ screen: scr, modal: null, selSess: null, editQ: null, userMenu: false, drawer: false, page: 0 }); window.scrollTo(0, 0); }
  q(id) { return this.state.qs.find(x => x.id === id); }
  cat(id) { return this.state.cats.find(x => x.id === id); }
  nowTxt() { const d = new Date(); return '28/09/2026 às ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  updAppt(id, fn, msg) { this.setState(s => ({ appts: s.appts.map(a => a.id === id ? fn(a) : a), modal: null })); if (msg) this.flash(msg); }
  assumir(id) { const n = this.me().nome; this.updAppt(id, a => ({ ...a, resp: n, status: 'confirmado', hist: [...a.hist, { t: 'Assumido por ' + n + ' · Confirmado', q: this.nowTxt() }] }), 'Agendamento ' + id + ' assumido por você.'); }
  atribuir(id, nome) { const me = this.me().nome; this.updAppt(id, a => ({ ...a, resp: nome, status: 'confirmado', hist: [...a.hist, { t: 'Atribuído a ' + nome + ' por ' + me + ' · Confirmado', q: this.nowTxt() }] }), 'Agendamento atribuído a ' + nome + '.'); }
  openAppt(id, from) { this.setState({ selId: id, screen: 'detalhe', backTo: from || this.state.screen, noteDraft: '', cpfCheck: '', cpfResult: null }); window.scrollTo(0, 0); }
  registrar(id, status) {
    const n = this.me().nome; const now = this.nowTxt();
    this.updAppt(id, a => {
      const hist = [...a.hist]; let resp = a.resp;
      if (!a.resp) { hist.push({ t: 'Assumido por ' + n + ' · Confirmado', q: now }); resp = n; }
      hist.push({ t: (status === 'atendido' ? 'Marcado como atendido por ' : 'Marcado como não compareceu por ') + n, q: now });
      return { ...a, status, resp, preReg: { resp: a.resp }, hist };
    }, id + (status === 'atendido' ? ' marcado como atendido.' : ' marcado como não compareceu.'));
  }
  corrigir(id) {
    const n = this.me().nome;
    this.updAppt(id, a => { const hadResp = a.preReg ? !!a.preReg.resp : !!a.resp; const st = hadResp ? 'confirmado' : 'pendente';
      return { ...a, status: st, resp: hadResp ? a.resp : null, preReg: null, hist: [...a.hist, { t: 'Registro corrigido por ' + n + ' · volta a ' + (hadResp ? 'Confirmado' : 'Pendente'), q: this.nowTxt() }] }; }, 'Registro corrigido.');
  }

  sessions() {
    const A = this.state.appts;
    const fromAppts = A.map(a => ({ cod: a.sess, data: a.sd, hora: a.sh, desf: 'ag', cat: this.q(a.q).cat, q: a.q, ai: a.ai, ag: a, tel: 'T-' + a.id }));
    const rets = [];
    A.forEach((a, i) => {
      const code = 'S-R' + a.id.slice(0, 5);
      if (a.remarc) { const m = /(\d\d)\/(\d\d)\/(\d{4}) às (\d\d:\d\d)/.exec(a.remarc.q); rets.push({ cod: code, data: m[3] + '-' + m[2] + '-' + m[1], hora: m[4], desf: 'remc', ret: { id: a.id, acao: 'remarcou', de: br(a.remarc.de.slice(0, 10)) + ' às ' + a.remarc.de.slice(11), para: br(a.data) + ' às ' + a.hora }, tel: 'T-' + a.id }); }
      const c = a.hist.find(x => x.t === 'Cancelado pelo cidadão no chatbot');
      if (c) { const m = /(\d\d)\/(\d\d)\/(\d{4}) às (\d\d:\d\d)/.exec(c.q); rets.push({ cod: code, data: m[3] + '-' + m[2] + '-' + m[1], hora: m[4], desf: 'remc', ret: { id: a.id, acao: 'cancelou' }, tel: 'T-' + a.id }); }
    });
    return [...EXTRA_SESS, ...fromAppts, ...rets].map(s => ({ ...s, tel: s.tel || 'T-' + s.cod })).sort((x, y) => (y.data + y.hora).localeCompare(x.data + x.hora));
  }
  timeline(s) {
    const t = []; let m = toMin(s.hora); const canAg = this.perms().includes('verAg');
    const add = (titulo, det, o) => { t.push({ titulo, det, hora: fromMin(m % 1440), ai: false, dot: '#483D8B', ring: '#E6E2F6', link: '', ...(o || {}) }); m += 1 + (t.length % 3); };
    const link = id => canAg ? { link: 'Abrir agendamento ' + id, openLink: () => { this.setState({ selSess: null }); this.openAppt(id, 'sessoes'); } } : {};
    const q = s.q ? this.q(s.q) : null; const c = s.cat ? this.cat(s.cat) : null;
    const end = (titulo, det, k) => add(titulo, det, { dot: DESF[k].c, ring: DESF[k].bg });
    add('Início da conversa', 'Cidadão iniciou o atendimento pelo WhatsApp e recebeu o aviso de que as orientações não têm caráter jurídico vinculante.');
    if (s.desf === 'remc') {
      const r = s.ret;
      add('Consultou o agendamento ' + r.id, 'Conversa de retorno para um agendamento existente.', link(r.id));
      if (r.acao === 'remarcou') end('Remarcou de ' + r.de + ' para ' + r.para, 'Mesmo protocolo. Se estava Confirmado, voltou a Pendente sem responsável.', 'remc');
      else end('Cancelou o agendamento', 'O horário voltou a ficar disponível no chatbot.', 'remc');
      return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 }));
    }
    const stop = s.desf === 'aband' || s.desf === 'andam' ? ETAPAS.indexOf(s.etapa) : 99;
    const finish = () => {
      if (s.desf === 'aband') end(ETAPA_PAROU[s.etapa], 'Sem interação por mais de 30 minutos nesta etapa.', 'aband');
      if (s.desf === 'andam') end('Aguardando o cidadão', 'Etapa atual: ' + ETAPA_ATUAL[s.etapa] + '.', 'andam');
      return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 }));
    };
    if (stop <= 0) return finish();
    if (c) add('Categoria escolhida', c.nome);
    if (stop <= 1) return finish();
    if (q) add('Pergunta escolhida', q.texto);
    if (stop <= 2) return finish();
    if (q) add('Resposta entregue', q.fora ? 'Informado que o assunto está fora do escopo do PROCON, com orientação de encaminhamento.' : 'Resposta do FAQ oficial · Base legal: ' + q.base + (s.ai && !s.aiFail ? ' · Texto complementar gerado para contextualizar a resposta.' : ''), { ai: !!s.ai && !s.aiFail && !(q && q.fora) });
    if (s.aiFail) add('Complemento por IA indisponível · enviado apenas o texto oficial', 'O cidadão recebeu a orientação normalmente.', { dot: '#8A869C', ring: '#EDECF1' });
    if (s.desf === 'fora') { end('Conversa encerrada', 'Encaminhado a outro órgão. Nenhum agendamento oferecido.', 'fora'); return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 })); }
    const pres = q && q.presencial;
    if (pres && s.etapa === 'resolvida' && (s.desf === 'aband' || s.desf === 'andam')) { s = { ...s, etapa: 'comparecer' }; }
    if (pres) add('A pergunta exige atendimento presencial', 'Agendamento oferecido sem perguntar se a dúvida foi resolvida.');
    else { if (stop <= 3) return finish(); add('A dúvida foi resolvida?', 'Resposta do cidadão: ' + (s.desf === 'resolv' ? 'Sim' : 'Não')); }
    if (s.desf === 'resolv') { end('Conversa encerrada', 'Dúvida resolvida sem agendamento.', 'resolv'); return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 })); }
    add('Agendamento oferecido', pres ? 'Motivo: a pergunta exige atendimento presencial.' : 'Motivo: o cidadão respondeu que a dúvida não foi resolvida.');
    if (s.desf === 'semHor') { end('Não havia horário disponível na janela de agendamento', 'O cidadão foi informado de que não há horários disponíveis no momento.', 'semHor'); return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 })); }
    if (s.desf === 'naoQuis') { end('O cidadão preferiu não agendar', 'Conversa encerrada sem agendamento.', 'naoQuis'); return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 })); }
    if (ETAPAS.indexOf(s.etapa) <= 4 && (s.desf === 'aband' || s.desf === 'andam')) return finish();
    add('Escolheu quem vai comparecer', s.ag ? (s.ag.rep ? 'Representante, em nome do titular' : 'Titular') : 'Titular');
    if (ETAPAS.indexOf(s.etapa) <= 5 && (s.desf === 'aband' || s.desf === 'andam')) return finish();
    if (s.ag) {
      add('Informado de que receberá avisos sobre o agendamento neste número (lembrete e cancelamento)', 'Mensagens de modelo fixo enviadas pelo WhatsApp.');
      end('Agendamento criado', 'Protocolo ' + s.ag.id + ' · ' + br(s.ag.data) + ' às ' + s.ag.hora + (s.ag.rep ? ' · Comparece por representante' : ' · Titular comparece'), 'ag');
      Object.assign(t[t.length - 1], link(s.ag.id));
    }
    return t.map((x, i) => ({ ...x, notLast: i < t.length - 1 }));
  }
  etapaTxt(s) { return ETAPA_ATUAL[s.etapa] || ''; }
  sessRange() {
    const S = this.state; const n = { '7d': 7, '30d': 30, '90d': 90 }[S.sessPer];
    if (n) return [addDays(TODAY, -(n - 1)), TODAY];
    if (S.sessPer === 'mes') return [TODAY.slice(0, 8) + '01', TODAY];
    if (S.sessPer === 'mesAnt') { const d = dt(TODAY.slice(0, 8) + '01'); d.setDate(0); const e = isoOf(d); return [e.slice(0, 8) + '01', e]; }
    let a = S.sessIni || addDays(TODAY, -30), b = S.sessFim || TODAY; if (b > TODAY) b = TODAY; if (a > b) [a, b] = [b, a]; return [a, b];
  }

  slotsFor(dow, cfg) {
    const C = cfg || this.state; const d = C.dias.find(x => x.dow === dow); if (!d || !d.on) return [];
    const out = []; const dur = +C.duracao || 30;
    d.faixas.forEach(([a, b]) => { if (!a || !b) return; for (let t = toMin(a); t + dur <= toMin(b); t += dur) out.push(fromMin(t)); });
    return out;
  }

  slotsOnDate(d, cfg) {
    const C = cfg || this.state; const B = C.bloqueios || this.state.bloqueios; const dur = +C.duracao || 30;
    if (B.some(b => b.data === d && !b.ini)) return [];
    const parts = B.filter(b => b.data === d && b.ini);
    return this.slotsFor(dt(d).getDay(), C).filter(h => !parts.some(p => toMin(h) < toMin(p.fim) && toMin(h) + dur > toMin(p.ini)));
  }
  conflicts(C) {
    const out = []; const dur = +C.duracao || 30; const bySlot = {};
    this.state.appts.filter(a => (a.status === 'pendente' || a.status === 'confirmado') && (a.data + ' ' + a.hora) >= NOW && !a.foraGrade).forEach(a => {
      const full = C.bloqueios.find(b => b.data === a.data && !b.ini);
      const part = C.bloqueios.find(b => b.data === a.data && b.ini && toMin(a.hora) < toMin(b.fim) && toMin(a.hora) + dur > toMin(b.ini));
      const dia = C.dias.find(x => x.dow === dt(a.data).getDay()); let motivo = '', tipo = 'outro';
      if (full) { motivo = 'Data bloqueada: ' + full.desc; tipo = 'fechada'; }
      else if (part) { motivo = 'Período bloqueado (' + part.ini + '–' + part.fim + '): ' + part.desc; tipo = 'fechada'; }
      else if (!dia || !dia.on || !dia.faixas.length) motivo = 'Dia sem atendimento na nova grade';
      else if (!this.slotsFor(dt(a.data).getDay(), C).includes(a.hora)) { const inF = dia.faixas.some(([i, f]) => i && f && toMin(a.hora) >= toMin(i) && toMin(a.hora) < toMin(f)); motivo = inF ? 'Horário deixou de existir com atendimentos de ' + dur + ' minutos' : 'Faixa de horário removida ou alterada'; }
      if (motivo) out.push({ a, motivo, tipo }); else (bySlot[a.data + ' ' + a.hora] = bySlot[a.data + ' ' + a.hora] || []).push(a);
    });
    Object.values(bySlot).forEach(list => { if (list.length > C.vagas) [...list].sort((x, y) => (x.sd + x.sh).localeCompare(y.sd + y.sh)).slice(C.vagas).forEach(a => out.push({ a, motivo: 'Vagas reduzidas para ' + C.vagas + '; este horário tem ' + list.length + ' agendamentos', tipo: 'outro' })); });
    return out.sort((x, y) => (x.a.data + x.a.hora).localeCompare(y.a.data + y.a.hora));
  }
  resolveConfl(mode) {
    const S = this.state; const K = S.confl; if (!K) return; const me = this.me().nome; const now = this.nowTxt(); const fail = S.wTokBad || S.falhas;
    const ids = {}; K.list.forEach(x => ids[x.a.id] = x);
    const appts = S.appts.map(a => { const x = ids[a.id]; if (!x) return a;
      if (mode === 'keep') return { ...a, foraGrade: true, hist: [...a.hist, { t: 'Mantido fora da grade atual após alteração de horários por ' + me + ' · ' + x.motivo, q: now }] };
      const mot = x.tipo === 'fechada' ? 'Unidade fechada nesta data' : 'Outro motivo';
      return { ...a, status: 'cancelado', hist: [...a.hist, { t: 'Cancelado no painel por ' + me + ' · Motivo: ' + mot, q: now }, { t: 'Observação interna: ' + x.motivo, q: now }, fail ? { t: 'Falha ao avisar o cidadão pelo WhatsApp', q: now, bad: true, retry: true } : { t: 'Cidadão avisado pelo WhatsApp', q: now }] }; });
    this.setState({ ...K.patch, ...(K.source === 'save' ? { hd: null } : {}), appts, confl: null, horMod: { por: me, em: br(TODAY) }, ...(K.source === 'bloq' ? { newBlqData: '', newBlqDesc: '' } : {}) });
    this.flash(mode === 'keep' ? 'Alteração salva. ' + K.list.length + ' agendamentos mantidos com o selo "Fora da grade atual".' : 'Alteração salva. ' + K.list.length + ' agendamentos cancelados' + (fail ? '; houve falha ao avisar os cidadãos.' : ' e cidadãos avisados pelo WhatsApp.'));
  }
  vm(a) {
    const q = this.q(a.q); const c = this.cat(q.cat); const s = ST[a.status]; const p = this.perms();
    const act = a.status === 'pendente' || a.status === 'confirmado'; const past = (a.data + ' ' + a.hora) < NOW;
    return {
      ...a, noRep: !a.rep, dataBr: br(a.data), dataCurta: brs(a.data), dia: WDS[dt(a.data).getDay()], diaLongo: WD[dt(a.data).getDay()],
      cat: c.nome, perg: q.texto, repLabel: a.rep ? 'Comparece por representante' : 'Titular comparece',
      respTxt: a.resp || 'Sem responsável', respFg: a.resp ? '#1F1B33' : '#8A5A00', respStyle: a.resp ? 'normal' : 'italic',
      stL: s.l, stBg: s.bg, stFg: s.fg, chipBd: s.bd, strike: a.status === 'cancelado' ? 'line-through' : 'none',
      nomeCurto: a.nome.split(' ')[0] + ' ' + a.nome.split(' ').slice(-1)[0],
      criadoTxt: br(a.sd) + ' às ' + a.sh,
      canAssumir: p.includes('gerAg') && a.status === 'pendente',
      showAssumir: p.includes('gerAg') && a.status === 'pendente',
      showAtribuir: p.includes('gerAg') && act,
      showAtendido: p.includes('gerAg') && act && a.data <= TODAY,
      atendidoWait: p.includes('gerAg') && act && a.data > TODAY,
      showCancelar: p.includes('gerAg') && act && !past,
      pastNoCancel: p.includes('gerAg') && act && past,
      showCorrigir: p.includes('gerAg') && (a.status === 'atendido' || a.status === 'nao_compareceu'),
      foraGrade: !!a.foraGrade && act,
      motivo: q.presencial ? 'A pergunta exige atendimento presencial' : 'O cidadão respondeu que a dúvida não foi resolvida',
      remarcTxt: a.remarc ? 'De ' + br(a.remarc.de.slice(0, 10)) + ' às ' + a.remarc.de.slice(11) + ' · remarcado pelo cidadão em ' + a.remarc.q : '',
      showNaoComp: p.includes('gerAg') && act && past,
      readOnly: !p.includes('gerAg') && act,
      finalTxt: a.status === 'nao_compareceu' ? 'O cidadão não compareceu ao atendimento.' : a.status === 'atendido' ? 'Atendimento concluído.' : a.status === 'cancelado' ? 'Agendamento cancelado. O horário foi liberado no chatbot.' : '',
      open: () => this.openAppt(a.id),
      assumir: e => { stop(e); this.assumir(a.id); }
    };
  }

  renderVals() {
    const S = this.state; const fe = this.props.forceEmpty; const empty = S.emptyData || fe === true || fe === 'true'; this._empty = empty;
    const me = this.me(); const P = this.perms(); const can = {}; ALLP.forEach(k => can[k] = P.includes(k));
    const isRoot = S.role === 'root';
    const scr = S.screen;
    const appts = empty ? [] : S.appts;
    const pendSemAll = appts.filter(a => a.status === 'pendente' && !a.resp).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));

    const navGroups = NAV.map(([label, keys]) => ({
      label, items: keys.filter(k => this.allowed(k)).map(k => {
        const act = scr === k || (k === 'agendamentos' && scr === 'detalhe');
        return { label: NAVLBL[k], go: () => this.go(k), bg: act ? '#3B3272' : 'transparent', fg: act ? '#fff' : '#C9C4E0', badge: k === 'agendamentos' && pendSemAll.length ? String(pendSemAll.length) : '' };
      })
    })).filter(g => g.items.length);

    // Agendamentos
    const weekStart = addDays(TODAY, 7 * S.weekOff);
    const inPeriod = a => {
      const f = S.fPeriodo;
      if (f === 'hoje') return a.data === TODAY;
      if (f === 'semana') return a.data >= TODAY && a.data <= addDays(TODAY, 6);
      if (f === 'proximos') return a.data >= TODAY;
      if (f === 'passados') return a.data < TODAY;
      return true;
    };
    const inResp = a => S.fResp === 'todos' ? true : S.fResp === 'sem' ? !a.resp : S.fResp === 'eu' ? a.resp === me.nome : a.resp === S.fResp;
    const base = appts.filter(a => inResp(a) && (S.view === 'cal' || inPeriod(a)));
    const aguardF = a => a.status === 'confirmado' && (a.data + ' ' + a.hora) < NOW;
    const aguardBase = appts.filter(a => inResp(a) && aguardF(a));
    const statusChips = [['todos', 'Todos'], ['pendente', 'Pendentes'], ['confirmado', 'Confirmados'], ['atendido', 'Atendidos'], ['nao_compareceu', 'Não compareceu'], ['cancelado', 'Cancelados']].map(([k, l]) => {
      const on = S.fStatus === k;
      return { l, n: String(k === 'todos' ? base.length : base.filter(a => a.status === k).length), pick: () => this.setState({ fStatus: k, page: 0, sortKey: null }), bg: on ? '#483D8B' : '#fff', fg: on ? '#fff' : '#3B3654', bd: on ? '#483D8B' : '#E4E1EE' };
    });
    { const on = S.fStatus === 'aguardando'; statusChips.push({ l: 'Aguardando registro', n: String(aguardBase.length), pick: () => this.setState({ fStatus: 'aguardando', page: 0, sortKey: null }), bg: on ? '#7A4F00' : '#FFF8E8', fg: on ? '#fff' : '#7A4F00', bd: on ? '#7A4F00' : '#E9C98A' }); }
    const term = S.busca.trim(); const searching = !!term;
    const digits = term.replace(/\D/g, ''); const numeric = /^[\d.\-\s]+$/.test(term);
    const protoTerm = term.toUpperCase().replace(/\s/g, '');
    const match = a => (digits.length === 11 && numeric && a.cpfNum === digits) || (protoTerm.length >= 2 && a.id.startsWith(protoTerm)) || (!numeric && term.length >= 2 && norm(a.nome).includes(norm(term)));
    const filtered = (searching ? appts.filter(match) : S.fStatus === 'aguardando' ? aguardBase : base.filter(a => S.fStatus === 'todos' || a.status === S.fStatus));
    const dtk = a => a.data + ' ' + a.hora;
    const defMode = searching ? 'mixed' : S.fStatus !== 'todos' ? (['atendido', 'nao_compareceu', 'cancelado'].includes(S.fStatus) ? 'desc' : 'asc')
      : S.fPeriodo === 'passados' ? 'desc' : S.fPeriodo === 'todos' ? 'mixed' : 'asc';
    const ST_ORD = { pendente: 0, confirmado: 1, atendido: 2, nao_compareceu: 3, cancelado: 4 };
    const byDate = (x, y) => dtk(x).localeCompare(dtk(y));
    if (S.sortKey) {
      const dir = S.sortDir === 'desc' ? -1 : 1;
      const keyCmp = { nome: (x, y) => x.nome.localeCompare(y.nome, 'pt-BR'), data: byDate, resp: (x, y) => (x.resp || '').localeCompare(y.resp || '', 'pt-BR'), status: (x, y) => ST_ORD[x.status] - ST_ORD[y.status] }[S.sortKey];
      filtered.sort((x, y) => keyCmp(x, y) * dir || byDate(x, y));
    } else if (defMode === 'mixed') {
      filtered.sort((x, y) => { const fx = dtk(x) >= NOW, fy = dtk(y) >= NOW; if (fx !== fy) return fx ? -1 : 1; return fx ? byDate(x, y) : byDate(y, x); });
    } else filtered.sort((x, y) => defMode === 'desc' ? byDate(y, x) : byDate(x, y));
    const sortHead = {}; ['nome', 'data', 'resp', 'status'].forEach(k => { const on = S.sortKey === k; sortHead[k] = { arrow: on ? (S.sortDir === 'asc' ? '▲' : '▼') : '', fg: on ? '#2E2757' : '#6B6780',
      click: () => this.setState(s => s.sortKey === k ? { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc', page: 0 } : { sortKey: k, sortDir: 'asc', page: 0 }) }; });
    const sortNote = S.sortKey ? '' : defMode === 'mixed' ? 'Ordem padrão: próximos primeiro (mais próximo no topo), depois os passados (mais recente primeiro).' : defMode === 'desc' ? 'Ordem padrão: mais recente primeiro.' : 'Ordem padrão: mais próximo primeiro.';
    const cpfPartial = searching && numeric && digits.length >= 4 && digits.length < 11;
    const buscaHint = !searching ? 'Na recepção: busque pelo nome do titular, pelo protocolo recebido no WhatsApp ou pelo CPF completo (11 dígitos). Enter abre o resultado quando houver só um.'
      : (filtered.length + (filtered.length === 1 ? ' resultado' : ' resultados') + ' em todos os períodos, status e responsáveis' + (filtered.length === 1 ? ' · Enter para abrir' : '') + (cpfPartial ? ' · Para buscar por CPF, digite os 11 dígitos.' : ''));
    const staffNames = S.users.filter(u => u.perms.includes('gerAg') || u.root).map(u => u.nome);
    const respOpts = [{ v: 'todos', l: 'Todos' }, { v: 'sem', l: 'Sem responsável' }, { v: 'eu', l: 'Atribuídos a mim' }, ...staffNames.map(n => ({ v: n, l: n }))];

    const blq = {}; S.bloqueios.forEach(b => { blq[b.data] = b.ini ? (blq[b.data] ? blq[b.data] + ', ' : '') + b.ini + '–' + b.fim : b.desc; });
    const blqFull = {}; S.bloqueios.filter(b => !b.ini).forEach(b => blqFull[b.data] = b.desc);
    const activeDows = [1, 2, 3, 4, 5, 6, 0].filter(d => this.slotsFor(d).length);
    const weekDates = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));
    const calDates = weekDates.filter(d => activeDows.includes(dt(d).getDay()));
    const AGc = this.agendaInfo(appts); const nowTc = NOW.slice(11);
    const calDays = calDates.map(d => ({ label: WDS[dt(d).getDay()] + ' ' + brs(d), fg: d === TODAY ? '#483D8B' : '#1F1B33', blocked: !!blq[d], blockedTxt: blqFull[d] ? 'Bloqueado · ' + blqFull[d].split(' (')[0] : blq[d] ? 'Bloqueado ' + blq[d] : '' }));
    const times = [...new Set(activeDows.flatMap(d => this.slotsFor(d)))].sort();
    const calRows = times.map(h => ({
      hora: h, cells: calDates.map(d => {
        const open = this.slotsOnDate(d).includes(h);
        const offer = open && d >= AGc.start && d <= AGc.end && !(d === TODAY && h <= nowTc);
        const items = filtered.filter(a => a.data === d && a.hora === h).map(a => this.vm(a));
        const used = appts.filter(a => a.data === d && a.hora === h && (a.status === 'pendente' || a.status === 'confirmado')).length;
        const livres = Math.max(0, S.vagas - used);
        return { items, bg: open ? (offer ? '#fff' : '#FAFAFC') : 'repeating-linear-gradient(135deg,#F6F5FA 0 6px,#EFEDF5 6px 12px)', livresTxt: offer && livres ? livres + (livres > 1 ? ' vagas livres' : ' vaga livre') : '' };
      })
    }));
    const calN = Math.max(1, calDates.length);

    const selA = S.appts.find(a => a.id === S.selId) || S.appts[0];
    let sel = null;
    if (selA) {
      const v = this.vm(selA); const q = this.q(selA.q);
      sel = { ...v, docsGrupo: selA.rep ? 'Quando um representante comparece' : 'Quando o próprio titular comparece',
        docsBase: selA.docsSent.map(t => ({ t })),
        docsQ: (selA.docsQSent.length ? selA.docsQSent : ['Nenhum documento adicional para esta dúvida']).map(t => ({ t })),
        docsDiff: !!DOCS_OLD[selA.id],
        timeline: this.timeline({ cod: selA.sess, data: selA.sd, hora: selA.sh, desf: 'ag', cat: q.cat, q: selA.q, ai: selA.ai, ag: selA }).map(x => /^Abrir agendamento/.test(x.link) ? { ...x, link: '' } : x),
        noNotas: !selA.notas.length, hist: this.histWithReminder(selA).map(x => ({ ...x, fg: x.bad ? '#A3261B' : '#1F1B33', w: x.bad ? '700' : '400', bg: x.bad ? '#FDF1EF' : 'transparent', bd: x.bad ? '#EBC7C2' : 'transparent', pad: x.bad ? '9px 11px' : '0', showRetry: !!x.retry && can.gerAg, retry: () => this.retryAviso(selA.id, x._i) })).reverse() };
    }
    const assignOpts = S.users.filter(u => u.ativo && (u.root || u.perms.includes('gerAg')) && (!selA || u.nome !== selA.resp)).map(u => {
      const on = S.assignTo === u.nome;
      return { nome: u.nome, email: u.email, pick: () => this.setState({ assignTo: u.nome }), bg: on ? '#EEEBFA' : '#fff', bd: on ? '#483D8B' : '#E4E1EE' };
    });

    const sessAll = empty ? [] : this.sessions();
    const andamentoRaw = sessAll.filter(s => s.desf === 'andam');
    const andamento = andamentoRaw.map(s => ({ ...s, etapaTxt: 'Etapa atual: ' + this.etapaTxt(s), open: () => this.setState({ screen: 'sessoes', selSess: s.cod }) }));
    const hoje = appts.filter(a => a.data === TODAY).sort((x, y) => x.hora.localeCompare(y.hora)).map(a => this.vm(a));

    const c7 = this.stats().conv;
    const topCats7 = [['c1', .24], ['c4', .2], ['c2', .15], ['c3', .12], ['c6', .1]].map(([id, f]) => ({ nome: this.cat(id).nome, n: String(Math.round(c7 * f)), w: (c7 ? Math.round(f / .24 * 100) : 0) + '%' }));

    const isPast = a => (a.data + ' ' + a.hora) < NOW;
    const pendVencAll = pendSemAll.filter(isPast), pendProxAll = pendSemAll.filter(a => !isPast(a));
    const AG = this.agendaInfo(appts); const semLivre = !AG.next; const longa = !!AG.next && AG.next.dias > S.alertaEspera;
    const st7 = this.stats();
    const falhasN = S.falhas ? 14 : 0; const iaN = empty ? 0 : S.falhas ? 9 : 2;
    const health = [
      { l: 'Credenciais da Cloud API', v: S.wTokBad ? 'Inválidas ou expiradas' : 'Válidas', d: S.wTokBad ? 'O chatbot não consegue enviar nem responder mensagens.' : 'Token de acesso aceito pela Meta.', short: S.wTokBad ? 'Credenciais inválidas' : 'Credenciais válidas', bad: S.wTokBad, head: 'O token de acesso da Cloud API está inválido ou expirado. O chatbot não está respondendo aos cidadãos.', tip: 'Situação do token de acesso cadastrado na tela WhatsApp. Se estiver inválido ou expirado, a Meta recusa todas as mensagens do chatbot.' },
      { l: 'Webhook · último evento', v: S.wHookOld ? 'Há mais de 24 horas' : 'Há 3 minutos', d: S.wHookOld ? 'Último evento em 27/09/2026 às 08:03.' : 'Último evento em 28/09/2026 às 10:12.', short: S.wHookOld ? 'Webhook sem eventos há mais de 24h' : 'Webhook recebendo eventos', bad: S.wHookOld, head: 'O webhook não recebe eventos da Meta há mais de 24 horas. Mensagens dos cidadãos podem não estar chegando ao chatbot.', tip: 'Momento em que a Meta enviou o último evento (mensagem recebida ou confirmação de entrega). Mais de 24 horas sem eventos costuma indicar webhook desconfigurado.' },
      { l: 'Qualidade do número', v: S.wQualBaixa ? 'Baixa' : 'Alta', d: S.wQualBaixa ? 'A Meta pode limitar o envio de mensagens.' : 'Poucos bloqueios ou denúncias.', short: 'Qualidade ' + (S.wQualBaixa ? 'baixa' : 'alta'), bad: S.wQualBaixa, head: 'A qualidade do número na Meta está baixa. O envio de lembretes e avisos pode ser limitado.', tip: 'Classificação da Meta com base em bloqueios e denúncias de usuários nos últimos 7 dias. Com qualidade baixa, a Meta pode limitar a quantidade de mensagens enviadas.' },
      { l: 'Limite de envios da Meta', v: S.wLimite ? '872 de 1.000 (87%)' : '214 de 1.000 (21%)', d: S.wLimite ? 'Perto do limite diário. Lembretes e avisos podem deixar de ser enviados.' : 'Conversas iniciadas pela empresa nas últimas 24h.', short: S.wLimite ? 'Perto do limite de envios' : 'Envios dentro do limite', bad: S.wLimite, head: 'O número está perto do limite diário de envios da Meta. Lembretes e avisos podem deixar de ser enviados.', tip: 'Quantidade de conversas iniciadas pela empresa (lembretes e avisos de cancelamento) nas últimas 24 horas, comparada ao limite diário definido pela Meta para o número. Fica em alerta acima de 80%.' },
      { l: 'Respostas automáticas', v: S.wPaused ? 'Pausadas' : 'Ativas', d: S.wPaused ? 'O chatbot não responde aos cidadãos.' : 'O chatbot responde normalmente.', short: S.wPaused ? 'Chatbot pausado' : 'Respostas ativas', bad: S.wPaused, head: 'As respostas automáticas estão pausadas. O chatbot não está respondendo aos cidadãos.', tip: 'Indica se um administrador pausou o chatbot na tela WhatsApp. Enquanto pausado, mensagens recebidas ficam sem resposta.' },
      { l: 'Falhas de entrega · últimas 24h', v: falhasN + (falhasN === 1 ? ' mensagem' : ' mensagens'), d: 'Mensagens do chatbot que não chegaram ao cidadão.', short: falhasN + ' falhas de entrega (24h)', bad: falhasN > 0, head: 'Há mensagens do chatbot que não foram entregues aos cidadãos nas últimas 24 horas.', tip: 'Mensagens enviadas pelo chatbot que a Meta informou como não entregues ao cidadão nas últimas 24 horas.' },
      { l: 'Respostas sem IA · últimas 24h', v: iaN + ' respostas', d: 'A IA falhou e o chatbot usou só o texto oficial.', short: iaN + ' respostas só com texto oficial (24h)', bad: false, tip: 'Respostas em que a geração do texto complementar por IA falhou e o chatbot enviou só o texto oficial do conteúdo. O cidadão recebeu a orientação normalmente.' }
    ].map((x, i) => ({ ...x, fg: x.bad ? '#8E2C22' : '#1F1B33', dot: x.bad ? '#C0392B' : '#2E8B57', tip: this.tipFor('h' + i, x.tip) }));
    const healthHead = ([0, 4, 1, 3, 2, 5].map(i => health[i]).find(x => x.bad) || {}).head || '';
    const antTxt = S.antecedencia === 0 ? 'zero dias (mesmo dia)' : S.antecedencia === 1 ? '1 dia útil' : S.antecedencia + ' dias úteis';
    const tips = {
      pend: this.tipFor('pend', 'Agendamentos criados pelo chatbot que ainda não têm um funcionário responsável. Ao assumir ou atribuir, o agendamento passa a Confirmado.'),
      venc: this.tipFor('venc', 'Pendentes cujo horário já passou sem que ninguém assumisse. O cidadão pode ter comparecido sem ser atendido pelo responsável previsto.'),
      aguard: this.tipFor('aguard', 'Agendamentos confirmados cujo horário já passou e que ainda não foram marcados como Atendido ou Não compareceu.'),
      resolv: this.tipFor('resolv', 'Percentual das conversas dos últimos 7 dias em que o cidadão respondeu no chatbot que a dúvida foi resolvida, sem precisar de atendimento presencial. Mesma definição usada em Relatórios.'),
      prox: this.tipFor('prox', 'Primeiro horário que o chatbot pode oferecer hoje a um cidadão, respeitando a antecedência mínima de ' + antTxt + ' e a janela de ' + S.janela + ' dias. Fica em alerta quando a espera passa de ' + S.alertaEspera + ' dias.'),
      oc: this.tipFor('oc', 'Vagas já reservadas (pendentes e confirmadas) sobre o total de vagas da janela de agendamento. Datas bloqueadas não entram na conta.'),
      meus: this.tipFor('meus', 'Seus agendamentos de hoje e amanhã, incluindo os que aguardam registro de atendimento.'),
      hoje: this.tipFor('hoje', 'Todos os agendamentos do dia, de qualquer responsável e status.'),
      cats: this.tipFor('cats', 'Quantidade de conversas distintas que escolheram cada categoria nos últimos 7 dias. Um mesmo cidadão escolhendo a mesma categoria mais de uma vez na conversa conta uma vez só.'),
      naores: this.tipFor('naores', 'Perguntas do conteúdo em que mais cidadãos responderam que a dúvida não foi resolvida nos últimos 7 dias. Indica respostas que podem precisar de revisão.')
    };
    const healthBad = isRoot && health.some(x => x.bad);
    const aguardAll = appts.filter(a => a.status === 'confirmado' && isPast(a));
    const relTxt = a => a.data === TODAY ? 'hoje' : a.data === addDays(TODAY, -1) ? 'ontem' : WDS[dt(a.data).getDay()].toLowerCase() + ', ' + brs(a.data);
    const meusAguard = aguardAll.filter(a => a.resp === me.nome).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)).map(a => ({ ...this.vm(a), aguardTxt: 'Aguardando registro · era ' + relTxt(a) + ' às ' + a.hora, canReg: can.gerAg,
      marcarAtendido: e => { stop(e); this.registrar(a.id, 'atendido'); },
      marcarNaoComp: e => { stop(e); this.registrar(a.id, 'nao_compareceu'); } }));
    const meus = appts.filter(a => a.resp === me.nome && (a.data === TODAY || a.data === addDays(TODAY, 1)) && a.status !== 'cancelado' && !(a.status === 'confirmado' && isPast(a))).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)).map(a => ({ ...this.vm(a), diaRel: a.data === TODAY ? 'Hoje' : 'Amanhã' }));
    const naoResolv = [['q9', .03], ['q4', .022], ['q1', .016]].map(([id, f]) => [id, Math.round(c7 * f)]).filter(x => x[1] > 0).map(([id, n], i) => { const q = this.q(id); return { pos: String(i + 1), texto: q.texto, cat: this.cat(q.cat).nome, n: n + ' cidadãos responderam que não resolveu' }; });
    const pb = (l, on, toggle) => ({ l: (on ? '✓ ' : '') + l, toggle, bg: on ? '#7A4F00' : '#fff', fg: on ? '#fff' : '#7A4F00' });
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const nowH = +NOW.slice(11, 13);
    const dashVals = {
      tips,
      saudacao: nowH < 12 ? 'Bom dia' : nowH < 18 ? 'Boa tarde' : 'Boa noite',
      dataExtenso: WD[dt(TODAY).getDay()] + ', ' + (+TODAY.slice(8)) + ' de ' + MESES[+TODAY.slice(5, 7) - 1] + ' de ' + TODAY.slice(0, 4) + ' · ' + NOW.slice(11),
      hojeCurta: brs(TODAY),
      protoBtns: [pb('Token expirado', S.wTokBad, () => this.setState(s => ({ wTokBad: !s.wTokBad }))), pb('Webhook sem eventos', S.wHookOld, () => this.setState(s => ({ wHookOld: !s.wHookOld }))), pb('Qualidade baixa', S.wQualBaixa, () => this.setState(s => ({ wQualBaixa: !s.wQualBaixa }))), pb('Perto do limite de envios', S.wLimite, () => this.setState(s => ({ wLimite: !s.wLimite }))), pb('Agenda lotada', S.agendaCheia, () => this.setState(s => ({ agendaCheia: !s.agendaCheia, esperaLonga: false }))), pb('Espera longa', S.esperaLonga, () => this.setState(s => ({ esperaLonga: !s.esperaLonga, agendaCheia: false }))), pb('Falhas de entrega', S.falhas, () => this.setState(s => ({ falhas: !s.falhas })))],
      healthBad, healthOk: isRoot && !healthBad, healthHead, health, goWhatsapp: () => this.go('whatsapp'),
      agendaAlert: can.verAg && semLivre, agendaAlertTxt: 'Sem horários livres nos próximos ' + S.janela + ' dias. O chatbot não está conseguindo agendar.', goHorarios: () => this.go('horarios'),
      pendVenc: pendVencAll.map(a => this.vm(a)), hasVencidos: pendVencAll.length > 0, vencCount: String(pendVencAll.length), proxEmpty: pendVencAll.length > 0 && !pendProxAll.length,
      goSessoesAtivas: () => { this.setState({ sessDesf: 'andam', sessPer: '7d', sessBusca: '', sessPage: 0 }); this.go('sessoes'); },
      resolvPct: String(st7.resolvPct).replace('.', ',') + '%', resolvW: st7.resolvPct + '%',
      resolvTxt: st7.resolvN + ' de ' + st7.conv + ' conversas em que o cidadão respondeu no chatbot que a dúvida foi resolvida, sem gerar agendamento. Mesma definição usada em Relatórios.',
      proxLivreTxt: AG.next ? WDS[dt(AG.next.d).getDay()] + ', ' + brs(AG.next.d) + ' · ' + AG.next.h : 'Nenhum horário livre',
      proxEmTxt: AG.next ? (AG.next.dias === 0 ? 'hoje' : AG.next.dias === 1 ? 'em 1 dia (amanhã)' : 'em ' + AG.next.dias + ' dias') : 'nos próximos ' + S.janela + ' dias',
      proxAviso: semLivre ? 'O chatbot está informando ao cidadão que não há horários disponíveis no momento.' : longa ? 'Espera acima do limite de ' + S.alertaEspera + ' dias configurado em Horários de atendimento.' : '',
      proxBg: semLivre ? '#FDF1EF' : longa ? '#FCF4E3' : '#fff', proxBd: semLivre ? '#EBC7C2' : longa ? '#E9C98A' : '#E4E1EE', proxEmFg: semLivre ? '#8E2C22' : longa ? '#7A4F00' : '#1B6138',
      ocJanelaTxt: 'Ocupação da janela (' + brs(AG.start) + ' a ' + brs(AG.end) + '): ' + AG.pct + '% · ' + AG.used + ' de ' + AG.total + ' vagas',
      ocTrack: semLivre ? '#F6DCD8' : longa ? '#F3E3BE' : '#EFEDF7', ocW: AG.pct + '%', ocColor: AG.pct >= 100 ? '#C0392B' : AG.pct >= 80 ? '#D99A1E' : '#7A6FC4',
      topCatsEmpty: !c7, naoResolvEmpty: !naoResolv.length, meus, meusAguard, hasMeus: meus.length > 0 || meusAguard.length > 0, meusVazio: !meus.length,
      showAguardEquipe: can.gerAg && aguardAll.length > 0, aguardEquipe: String(aguardAll.length) + (aguardAll.length === 1 ? ' confirmado aguardando registro' : ' confirmados aguardando registro') + ' na equipe',
      goAguardando: () => { this.setState({ view: 'lista', fStatus: 'aguardando', fPeriodo: 'todos', fResp: 'todos', busca: '' }); this.go('agendamentos'); }, naoResolv, goConteudoNR: () => { this.setState({ selCat: this.q('q9').cat }); this.go('conteudo'); }
    };
    const agEmpty = filtered.length === 0;

    return {
      ...(() => { const vw = S.vw; const docked = vw >= 1200; const px = vw >= 1200 ? 32 : 20; const mainW = Math.min(vw - (docked ? 248 : 0), 1680) - px * 2;
        return { notDocked: !docked, sbPos: docked ? 'sticky' : 'fixed', sbTf: docked || S.drawer ? 'none' : 'translateX(-100%)', sbShadow: !docked && S.drawer ? '0 0 40px rgba(20,16,40,.35)' : 'none',
          drawerShade: !docked && S.drawer, openDrawer: () => this.setState({ drawer: true }), closeDrawer: () => this.setState({ drawer: false }),
          padX: px + 'px', showEmail: mainW >= 900, wideTable: mainW >= 1120, compactTable: mainW < 1120,
          dashCols: mainW >= 1000 ? 'repeat(3,minmax(0,1fr))' : 'repeat(2,minmax(0,1fr))' }; })(),
      toggleEmpty: () => this.setState(s => ({ emptyData: !s.emptyData, selSess: null })), emptyLbl: empty ? '✓ Dados vazios' : 'Dados vazios', emptyBg: empty ? '#7A4F00' : '#fff', emptyFg: empty ? '#fff' : '#7A4F00',
      notLogged: !S.logged, logged: S.logged, can, isRoot,
      me: { ...me, ini: ini(me.nome), first: me.nome.split(' ')[0] },
      navGroups, crumbGroup: scr === 'detalhe' ? SCR[S.backTo in SCR && S.backTo !== 'detalhe' ? S.backTo : 'agendamentos'].g : SCR[scr].g, crumbTitle: SCR[scr].t,
      crumbMid: scr === 'detalhe' ? [(k => ({ l: SCR[k].t, go: () => this.go(k) }))(S.backTo in SCR && S.backTo !== 'detalhe' ? S.backTo : 'agendamentos')] : [],
      roleRootBg: isRoot ? '#483D8B' : 'transparent', roleRootFg: isRoot ? '#fff' : '#3B3654',
      roleLimBg: S.role === 'limited' ? '#483D8B' : 'transparent', roleLimFg: S.role === 'limited' ? '#fff' : '#3B3654',
      roleGesBg: S.role === 'gestor' ? '#483D8B' : 'transparent', roleGesFg: S.role === 'gestor' ? '#fff' : '#3B3654',
      asRoot: () => this.setRole('root'), asLimited: () => this.setRole('limited'), asGestor: () => this.setRole('gestor'),
      logout: () => this.setState({ logged: false, loginEmail: '', loginPass: '', loginErr: '' }),
      loginEmail: S.loginEmail, loginPass: S.loginPass, loginErr: S.loginErr,
      setLoginEmail: e => this.setState({ loginEmail: e.target.value }), setLoginPass: e => this.setState({ loginPass: e.target.value }),
      doLogin: e => { e.preventDefault(); if (!S.loginEmail || !S.loginPass) return this.setState({ loginErr: 'Informe e-mail e senha.' }); this.setState({ logged: true, loginErr: '' }); this.go(this.allowed('dashboard') ? 'dashboard' : this.firstAllowed()); },

      ...dashVals, isDashboard: scr === 'dashboard',
      pendSem: pendProxAll.slice(0, 4).map(a => this.vm(a)), pendSemCount: String(pendSemAll.length), pendSemEmpty: pendSemAll.length === 0,
      goPendentes: () => this.setState({ screen: 'agendamentos', view: 'lista', fStatus: 'pendente', fResp: 'sem', fPeriodo: 'todos' }),
      andamento, andamentoCount: String(andamento.length), andamentoEmpty: andamento.length === 0,
      hoje, hojeCount: String(hoje.length), hojeEmpty: hoje.length === 0, topCats7,

      isAgendamentos: scr === 'agendamentos', isLista: S.view === 'lista' || searching, isCal: S.view === 'cal' && !searching,
      busca: S.busca, searching, notSearching: !searching, buscaHint,
      setBusca: e => this.setState({ busca: e.target.value, page: 0, sortKey: null }),
      clearBusca: () => this.setState({ busca: '', page: 0, sortKey: null }),
      buscaKey: e => { if (e.key === 'Enter' && filtered.length === 1) this.openAppt(filtered[0].id, 'agendamentos'); if (e.key === 'Escape') this.setState({ busca: '' }); },
      viewLista: () => this.setState({ view: 'lista' }), viewCal: () => this.setState({ view: 'cal' }),
      vListaBg: S.view === 'lista' ? '#483D8B' : 'transparent', vListaFg: S.view === 'lista' ? '#fff' : '#3B3654',
      vCalBg: S.view === 'cal' ? '#483D8B' : 'transparent', vCalFg: S.view === 'cal' ? '#fff' : '#3B3654',
      statusChips, fPeriodo: S.fPeriodo, fResp: S.fResp, respOpts,
      setFPeriodo: e => this.setState({ fPeriodo: e.target.value, page: 0, sortKey: null }), setFResp: e => this.setState({ fResp: e.target.value, page: 0, sortKey: null }),
      ...(() => { const PER = 20; const pages = Math.max(1, Math.ceil(filtered.length / PER)); const pg = Math.min(S.page, pages - 1); const from = pg * PER;
        return { agList: filtered.slice(from, from + PER).map(a => this.vm(a)), hasPages: pages > 1, pagTxt: 'Página ' + (pg + 1) + ' de ' + pages,
          agCountTxt: filtered.length ? (from + 1) + '–' + Math.min(from + PER, filtered.length) + ' de ' + filtered.length + (filtered.length === 1 ? ' agendamento' : ' agendamentos') : '0 agendamentos',
          pagPrev: () => pg > 0 && this.setState({ page: pg - 1 }), pagNext: () => pg < pages - 1 && this.setState({ page: pg + 1 }), prevOp: pg > 0 ? '1' : '.4', nextOp: pg < pages - 1 ? '1' : '.4' }; })(),
      agEmpty, sortHead, sortNote, sortSel: S.sortKey ? S.sortKey + '_' + S.sortDir : 'default',
      setSortSel: e => { const v = e.target.value; if (v === 'default') this.setState({ sortKey: null, page: 0 }); else { const [k, d] = v.split('_'); this.setState({ sortKey: k, sortDir: d, page: 0 }); } },
      agEmptyTitle: searching ? 'Nenhum agendamento encontrado' : S.fStatus === 'pendente' ? 'Nenhum agendamento pendente' : 'Nenhum agendamento encontrado',
      agEmptyText: searching ? 'Nada corresponde a “' + term + '”. Confira a grafia do nome, o protocolo ou os 11 dígitos do CPF.' : empty ? 'O chatbot ainda não criou agendamentos.' : 'Nenhum resultado para os filtros de status, período e responsável selecionados.',
      clearFilters: () => this.setState({ fStatus: 'todos', fPeriodo: 'todos', fResp: 'todos', busca: '', page: 0, sortKey: null }),
      weekLabel: 'Semana de ' + brs(weekDates[0]) + ' a ' + br(weekDates[6]),
      calCols: '64px repeat(' + calN + ',minmax(110px,1fr))', calMinW: (64 + 110 * calN) + 'px',
      weekPrev: () => this.setState(s => ({ weekOff: s.weekOff - 1 })), weekNext: () => this.setState(s => ({ weekOff: s.weekOff + 1 })), weekToday: () => this.setState({ weekOff: 0 }),
      calDays, calRows, vagasTxt: S.vagas + ' vagas por horário · vagas livres só onde o chatbot pode oferecer (janela, antecedência, bloqueios)',

      isDetalhe: scr === 'detalhe' && !!sel, sel: sel || {},
      backLabel: { agendamentos: 'Agendamentos', dashboard: 'Dashboard', sessoes: 'Sessões' }[S.backTo] || 'Agendamentos',
      backFromDetail: () => this.go(S.backTo || 'agendamentos'),
      selAssumir: () => this.assumir(selA.id),
      selNaoComp: () => this.registrar(selA.id, 'nao_compareceu'),
      selAtendido: () => this.registrar(selA.id, 'atendido'),
      openAtribuir: () => this.setState({ modal: 'atribuir', assignTo: '' }), openCancelar: () => this.setState({ modal: 'cancelar', cancelMotivo: '', cancelObs: '' }),
      modalCancel: S.modal === 'cancelar', modalAtribuir: S.modal === 'atribuir',
      closeModal: () => this.setState({ modal: null }), stop,
      ...(() => {
        const mot = MOTIVOS.find(m => m.k === S.cancelMotivo);
        const msg = mot && selA ? 'Olá, ' + selA.nome.split(' ')[0] + '. Seu agendamento ' + selA.id + ' no PROCON Jacareí, marcado para ' + brs(selA.data) + ' às ' + selA.hora + ', foi cancelado. Motivo: ' + mot.f + '. Para agendar novamente, envie uma mensagem para este número.' : '';
        return {
          cancelMotivos: MOTIVOS.map(m => { const on = S.cancelMotivo === m.k; return { l: m.l, on, pick: () => this.setState({ cancelMotivo: m.k }), bg: on ? '#FDF1EF' : '#fff', bd: on ? '#A3261B' : '#E4E1EE' }; }),
          cancelMsg: msg, noCancelMsg: !msg, cancelObs: S.cancelObs, setCancelObs: e => this.setState({ cancelObs: e.target.value }), cancelOpacity: mot ? '1' : '.45',
          confirmCancel: () => {
            if (!mot) return;
            const now = this.nowTxt(); const obs = S.cancelObs.trim(); const fail = S.wTokBad || S.falhas;
            this.updAppt(selA.id, a => ({ ...a, status: 'cancelado', hist: [...a.hist,
              { t: 'Cancelado no painel por ' + me.nome + ' · Motivo: ' + mot.l, q: now },
              ...(obs ? [{ t: 'Observação interna: ' + obs, q: now }] : []),
              fail ? { t: 'Falha ao avisar o cidadão pelo WhatsApp', q: now, bad: true, retry: true } : { t: 'Cidadão avisado pelo WhatsApp', q: now }] }),
              fail ? 'Agendamento cancelado, mas o aviso ao cidadão falhou.' : 'Agendamento ' + selA.id + ' cancelado. Cidadão avisado pelo WhatsApp.');
          }
        };
      })(),
      selCorrigir: () => this.corrigir(selA.id), sessNoLink: !can.sessoes,
      cpfCheck: S.cpfCheck, setCpfCheck: e => this.setState({ cpfCheck: e.target.value.replace(/[^\d.\-\s]/g, '').slice(0, 14), cpfResult: null }),
      cpfOk: S.cpfResult === 'ok', cpfBad: S.cpfResult === 'bad', cpfBtnOp: S.cpfCheck.replace(/\D/g, '').length === 11 ? '1' : '.45',
      conferirCpf: () => { const d = S.cpfCheck.replace(/\D/g, ''); if (d.length !== 11) return; const ok = d === selA.cpfNum;
        this.setState(s => ({ cpfCheck: '', cpfResult: ok ? 'ok' : 'bad', appts: s.appts.map(a => a.id === selA.id ? { ...a, hist: [...a.hist, { t: 'CPF conferido por ' + me.nome + ' · ' + (ok ? 'confere' : 'não confere'), q: this.nowTxt() }] } : a) })); },
      openSessOrig: () => { const cod = selA.sess; this.go('sessoes'); this.setState({ sessDesf: 'todos', sessPer: '30d', sessBusca: '', selSess: cod }); },
      assignOpts, assignOpacity: S.assignTo ? '1' : '.45',
      confirmAtribuir: () => { if (S.assignTo) this.atribuir(selA.id, S.assignTo); },
      noteDraft: S.noteDraft, setNoteDraft: e => this.setState({ noteDraft: e.target.value }),
      addNota: () => { const t = S.noteDraft.trim(); if (!t) return; this.updAppt(selA.id, a => ({ ...a, notas: [...a.notas, { autor: me.nome, q: this.nowTxt(), t }] }), 'Observação salva.'); this.setState({ noteDraft: '' }); },
      toast: S.toast,
      ...this.moreVals(S, can, isRoot, empty, sessAll)
    };
  }
  agendaInfo(appts, cfg) {
    const S = this.state; const C = cfg ? { ...S, ...cfg } : S; const blq = {}; C.bloqueios.filter(b => !b.ini).forEach(b => blq[b.data] = b.desc);
    const nowT = NOW.slice(11); const isBiz = d => !blq[d] && this.slotsOnDate(d, C).length > 0;
    let start = TODAY; if (C.antecedencia > 0) { let n = 0, d = TODAY; while (n < C.antecedencia) { d = addDays(d, 1); if (isBiz(d)) n++; } start = d; }
    const end = addDays(TODAY, C.janela);
    const cutoff = S.agendaCheia ? addDays(end, 1) : S.esperaLonga ? addDays(TODAY, C.alertaEspera + 5) : null;
    const days = []; let total = 0, used = 0, next = null;
    for (let i = 0; i <= C.janela; i++) {
      const d = addDays(TODAY, i); let slots = this.slotsOnDate(d, C); let st = 'aberto';
      if (blq[d]) st = 'bloqueado'; else if (!slots.length) st = this.slotsFor(dt(d).getDay(), C).length ? 'bloqueado' : 'fechado'; else if (d < start) st = 'antecedencia';
      if (d === TODAY && st === 'aberto') { slots = slots.filter(x => x > nowT); if (!slots.length) st = 'encerrado'; }
      let cap = 0, u = 0;
      if (st === 'aberto') {
        cap = slots.length * C.vagas; const full = cutoff && d < cutoff;
        slots.forEach(x => { const c = full ? C.vagas : Math.min(C.vagas, appts.filter(a => a.data === d && a.hora === x && (a.status === 'pendente' || a.status === 'confirmado')).length); u += c; if (!next && c < C.vagas) next = { d, h: x, dias: i }; });
        total += cap; used += u;
      }
      days.push({ d, st, n: slots.length, cap, u, desc: blq[d] || (C.bloqueios.filter(b => b.data === d && b.ini).map(b => 'Período bloqueado ' + b.ini + '–' + b.fim).join(', ')) });
    }
    return { start, end, days, total, used, next, pct: total ? Math.round(used / total * 100) : 0 };
  }
  tipFor(key, text) {
    const S = this.state;
    return { text, open: S.tip === key, enter: () => this.setState({ tip: key }), leave: () => this.setState(s => s.tip === key ? { tip: null } : null), toggle: e => { stop(e); this.setState({ tip: key }); } };
  }
  histWithReminder(a) {
    const S = this.state; const base = a.hist.map((x, i) => ({ ...x, _i: i }));
    if (!S.lembreteOn) return base;
    const t = new Date(a.data + 'T' + a.hora + ':00'); t.setHours(t.getHours() - S.lembreteHoras);
    const pad = n => String(n).padStart(2, '0');
    const iso = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes());
    if (iso >= NOW || iso <= a.sd + ' ' + a.sh) return base;
    const parse = q => { const m = /(\d\d)\/(\d\d)\/(\d{4}) às (\d\d:\d\d)/.exec(q || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] + ' ' + m[4] : ''; };
    const cancel = base.find(x => /^Cancelado/.test(x.t)); if (cancel && parse(cancel.q) <= iso) return base;
    const rem = { t: 'Lembrete enviado pelo WhatsApp', q: br(iso.slice(0, 10)) + ' às ' + iso.slice(11) + ' · ' + S.lembreteHoras + 'h antes do atendimento', _i: -1 };
    let k = base.findIndex(x => parse(x.q) > iso); if (k < 0) k = base.length;
    return [...base.slice(0, k), rem, ...base.slice(k)];
  }
  retryAviso(id, i) {
    const fail = this.state.wTokBad || this.state.falhas; const now = this.nowTxt();
    this.updAppt(id, a => ({ ...a, hist: [...a.hist.map((x, j) => j === i ? { ...x, retry: false } : x), fail ? { t: 'Falha ao avisar o cidadão pelo WhatsApp', q: now, bad: true, retry: true } : { t: 'Cidadão avisado pelo WhatsApp', q: now }] }), fail ? 'Nova falha ao enviar o aviso.' : 'Cidadão avisado pelo WhatsApp.');
  }
  firstAllowed() { for (const [, keys] of NAV) for (const k of keys) if (this.allowed(k)) return k; return 'dashboard'; }
  dayStats(d) { if (this._empty) return { d, w: dt(d).getDay(), k: 0, conv: 0, ag: 0 }; const k = Math.round(dt(d) / 864e5); const w = dt(d).getDay(); let conv = Math.round((w === 0 || w === 6 ? 9 : 22) + rnd(k) * 16); if (d === TODAY) conv = Math.round(conv * 0.45); const ag = Math.round(conv * (0.13 + rnd(k + 50) * 0.1)); return { d, w, k, conv, ag }; }
  repRange() {
    const S = this.state; const y = addDays(TODAY, -1);
    const r = { '7d': [addDays(TODAY, -7), y], '30d': [addDays(TODAY, -30), y], '90d': [addDays(TODAY, -90), y] }[S.repPeriodo];
    if (r) return r;
    if (S.repPeriodo === 'mes') return [TODAY.slice(0, 8) + '01', TODAY];
    if (S.repPeriodo === 'mesAnt') { const d = dt(TODAY.slice(0, 8) + '01'); d.setDate(0); const e = isoOf(d); return [e.slice(0, 8) + '01', e]; }
    let a = S.repIni || addDays(TODAY, -30), b = S.repFim || TODAY; if (b > TODAY) b = TODAY; if (a > b) [a, b] = [b, a]; return [a, b];
  }
  reportCore(ini, fim) {
    const days = []; for (let d = ini; d <= fim; d = addDays(d, 1)) days.push(this.dayStats(d));
    const conv = days.reduce((a, x) => a + x.conv, 0), ag = days.reduce((a, x) => a + x.ag, 0);
    const fora = Math.round(conv * 0.04), semHor = Math.round(conv * (this.state.agendaCheia ? 0.07 : 0.028)), naoQuis = Math.round(conv * 0.024), remc = Math.round(conv * 0.035), aband = Math.round(conv * 0.115), andam = fim === TODAY ? 3 : 0;
    const resolv = Math.max(0, conv - ag - fora - semHor - naoQuis - remc - aband - andam);
    return { days, conv, ag, fora, semHor, naoQuis, remc, aband, andam, resolv };
  }
  stats() { const c = this.reportCore(addDays(TODAY, -7), addDays(TODAY, -1)); const pct = c.conv ? Math.round(c.resolv / c.conv * 1000) / 10 : 0; return { conv: c.conv, ag: c.ag, resolvPct: pct, resolvN: c.resolv }; }
  setRole(r) {
    this.setState({ role: r, modal: null, ud: null, uModal: null }, () => { if (!this.allowed(this.state.screen)) this.go(this.firstAllowed()); });
  }
  wzVals(S) {
    const W = S.wz; const D = S.wzd || W.cfg; const me = this.me().nome;
    const F = [{ k: 'phoneId', l: 'ID do número de telefone' }, { k: 'wabaId', l: 'ID da conta WhatsApp Business' }, { k: 'token', l: 'Token de acesso', secret: true }, { k: 'secret', l: 'App Secret', secret: true }];
    const setF = (k, v) => this.setState(s => { const b = s.wzd || s.wz.cfg; const n = { ...b, [k]: v }; return { wzd: JSON.stringify(n) === JSON.stringify(s.wz.cfg) ? null : n }; });
    const diffs = F.filter(f => { const v = D[f.k]; return f.secret ? !!v.novo : v.trim() !== W.cfg[f.k]; });
    const eff = () => JSON.stringify(F.map(f => { const v = D[f.k]; return f.secret ? (v.novo ? 'n:' + v.novo : 'l:' + v.last4) : v.trim(); }));
    const fields = F.map(f => { const v = D[f.k]; const tokHint = f.k === 'token'; const changed = f.secret ? !!v.novo : v !== W.cfg[f.k];
      return { l: f.l, tokHint, plain: !f.secret, secret: !!f.secret, v: f.secret ? (v.novo || '') : v, bd: changed ? '#D99A1E' : '#D9D5E8',
        onChange: e => { const x = e.target.value; setF(f.k, f.secret ? { ...v, novo: x } : x); },
        masked: '••••••••' + v.last4, replacing: f.secret && v.novo !== null, showMask: f.secret && v.novo === null,
        replace: () => setF(f.k, { ...v, novo: '' }), cancelReplace: () => setF(f.k, { ...v, novo: null }) }; });
    const sig = eff(); const T = S.wzTest && S.wzTest.sig === sig ? S.wzTest : null;
    const newTok = !!D.token.novo; const testOk = !!T && T.st === 'ok'; const n = diffs.length;
    const canSave = n > 0 && testOk;
    const runTest = () => {
      const miss = F.find(f => { const v = D[f.k]; return f.secret ? v.novo === '' : !v.trim(); });
      if (miss) return this.setState({ wzTest: { sig, st: 'err', msg: 'Preencha o campo "' + miss.l + '" ou cancele a substituição antes de testar.' } });
      this.setState({ wzTest: { sig, st: 'testing' } });
      clearTimeout(this._wzT); this._wzT = setTimeout(() => this.setState(s => {
        if (!s.wzTest || s.wzTest.sig !== sig) return null;
        if (s.wTokBad && !newTok) return { wzTest: { sig, st: 'err', msg: 'Token inválido ou expirado. Gere um novo token no painel da Meta e use Substituir no campo Token de acesso.' } };
        if (D.phoneId.trim() !== '109876543210987' && !/^\d{15}$/.test(D.phoneId.trim())) return { wzTest: { sig, st: 'err', msg: 'A Meta não encontrou o ID do número de telefone informado. Confira o valor em WhatsApp › Configuração da API.' } };
        return { wzTest: { sig, st: 'ok', num: '+55 (12) 3955-9000', nome: 'PROCON Jacareí' } };
      }), 1300);
    };
    const tpls = S.wzTpl.map(t => { const st = S.wzRej && t.k === 'lembrete' ? 'rejeitado' : t.st; const M = { aprovado: ['Aprovado', '#DFF1E6', '#1B6138'], analise: ['Em análise', '#FCEFD6', '#7A4F00'], rejeitado: ['Rejeitado', '#FAE3E0', '#8E2C22'] }[st];
      return { n: t.n, id: t.id, stL: M[0], stBg: M[1], stFg: M[2], alert: st !== 'aprovado', alertTxt: 'Enquanto este modelo não for aprovado, ' + t.efeito + ' não serão enviados.' + (st === 'rejeitado' ? ' A Meta rejeitou o modelo: revise o texto no Gerenciador do WhatsApp e envie novamente.' : ''), alertBg: st === 'rejeitado' ? '#FDF1EF' : '#FCF4E3', alertBd: st === 'rejeitado' ? '#EBC7C2' : '#E9C98A', alertFg: st === 'rejeitado' ? '#8E2C22' : '#7A4F00' }; });
    const WH = 'https://procon.jacarei.sp.gov.br/api/whatsapp/webhook'; const VT = 'pcj-wh-7Q2m9KxR4vT8';
    const copy = v => () => { try { navigator.clipboard.writeText(v).catch(() => {}); } catch (e) {} this.flash('Copiado.'); };
    const Q = S.wQualBaixa ? 'baixa' : 'alta';
    const quals = [['alta', 'Alta', 'Poucos bloqueios ou denúncias de usuários. Envio sem restrições.', '#DFF1E6', '#1B6138'], ['media', 'Média', 'Aumento recente de bloqueios ou denúncias. Vale revisar o texto das mensagens.', '#FCEFD6', '#7A4F00'], ['baixa', 'Baixa', 'Muitos bloqueios ou denúncias. A Meta pode limitar o envio de mensagens.', '#FAE3E0', '#8E2C22']].map(([k, l, d, bg, fg]) => ({ l, d, on: k === Q, bg: k === Q ? bg : 'transparent', fg: k === Q ? fg : '#55516A', bd: k === Q ? fg : '#E4E1EE', fw: k === Q ? '700' : '500' }));
    const st = S.wPaused ? ['Respostas pausadas', '#FCEFD6', '#7A4F00', '#D99A1E'] : S.wTokBad ? ['Credenciais inválidas', '#FAE3E0', '#8E2C22', '#C0392B'] : ['Operando', '#DFF1E6', '#1B6138', '#2E8B57'];
    const hist = (t) => ({ t, por: me, q: this.nowTxt() });
    const j = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a[0];
    return {
      wz: {
        modTxt: 'Última alteração por ' + W.mod.por + ' em ' + W.mod.em,
        stL: st[0], stBg: st[1], stFg: st[2], stDot: st[3],
        fields,
        testing: !!T && T.st === 'testing', testOk, testErr: !!T && T.st === 'err', testMsg: T ? T.msg || '' : '', testNum: T ? T.num || '' : '', testNome: T ? T.nome || '' : '',
        testOp: T && T.st === 'testing' ? '.6' : '1', runTest,
        dirty: n > 0, dirtyTxt: n + (n === 1 ? ' alteração não salva' : ' alterações não salvas'), dirtyTip: 'Pendentes: ' + diffs.map(d => d.l).join('; '),
        saveOp: n === 0 || canSave ? '1' : '.45', saveCursor: n === 0 || canSave ? 'pointer' : 'not-allowed', needTest: n > 0 && !testOk, saveTip: n > 0 && !testOk ? 'Teste a conexão com as credenciais novas antes de salvar.' : '',
        discard: () => this.setState({ wzd: null }),
        save: () => {
          if (!n) return this.setState({ wzd: null }, () => this.flash('Nenhuma alteração para salvar.'));
          if (!testOk) return this.flash('Teste a conexão com as credenciais novas antes de salvar.');
          const cfg = {}; F.forEach(f => { const v = D[f.k]; cfg[f.k] = f.secret ? { last4: v.novo ? v.novo.slice(-4) : v.last4, novo: null } : v.trim(); });
          const sec = diffs.filter(d => d.secret).map(d => d.l), pl = diffs.filter(d => !d.secret).map(d => d.l);
          const t = [pl.length ? j(pl) + (pl.length > 1 ? ' alterados' : ' alterado') : '', sec.length ? j(sec) + (sec.length > 1 ? ' substituídos' : ' substituído') : ''].filter(Boolean).join('; ');
          this.setState(s => ({ wzd: null, wzTest: null, wTokBad: newTok ? false : s.wTokBad, wz: { ...s.wz, cfg, mod: { por: me, em: br(TODAY) }, hist: [hist(t.charAt(0).toUpperCase() + t.slice(1)), ...s.wz.hist] } }));
          this.flash('Credenciais salvas. O chatbot já usa os novos valores.');
        },
        credBad: S.wTokBad, credOk: !S.wTokBad,
        hookOld: S.wHookOld, hookOk: !S.wHookOld, hookTxt: S.wHookOld ? '27/09/2026 às 08:03' : '28/09/2026 às 10:12', hookRel: S.wHookOld ? 'há mais de 24 horas' : 'há 3 minutos',
        quals, qualLow: S.wQualBaixa,
        lim: (() => { const used = S.wLimite ? 872 : 214, lem = S.wLimite ? 791 : 188, cancel = used - lem, pct = Math.round(used / 10); return { txt: '1.000 conversas por 24h', used: used.toLocaleString('pt-BR') + ' usadas nas últimas 24h (' + pct + '%)', det: lem + ' lembretes · ' + cancel + ' avisos de cancelamento', w: pct + '%', bar: pct > 80 ? '#C0392B' : '#483D8B', alert: pct > 80 }; })(),
        pauseMsg: 'O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde.',
        paused: S.wPaused, notPaused: !S.wPaused, pauseTrack: S.wPaused ? '#D99A1E' : '#C9C5D8', pauseKnob: S.wPaused ? '20px' : '2px', pauseLbl: S.wPaused ? 'Pausadas' : 'Desligado',
        togglePause: () => { if (S.wPaused) { this.setState(s => ({ wPaused: false, wz: { ...s.wz, hist: [hist('Respostas automáticas reativadas'), ...s.wz.hist] } })); this.flash('Respostas automáticas reativadas.'); } else this.setState({ wzPauseAsk: true }); },
        askPause: S.wzPauseAsk, closePause: () => this.setState({ wzPauseAsk: false }),
        doPause: () => { this.setState(s => ({ wzPauseAsk: false, wPaused: true, wz: { ...s.wz, hist: [hist('Respostas automáticas pausadas'), ...s.wz.hist] } })); this.flash('Respostas automáticas pausadas.'); },
        webhook: WH, verifyToken: VT, copyWebhook: copy(WH), copyToken: copy(VT),
        tpls, tplBtn: S.wzTplLoad ? 'Atualizando…' : 'Atualizar status',
        refreshTpl: () => { if (S.wzTplLoad) return; this.setState({ wzTplLoad: true }); setTimeout(() => { this.setState(s => ({ wzTplLoad: false, wzTpl: s.wzTpl.map(t => t.st === 'analise' ? { ...t, st: 'aprovado' } : t) })); this.flash('Status dos modelos atualizado com a Meta.'); }, 1100); },
        hist: W.hist.slice(0, 6),
        sims: [['Simular token expirado', 'wTokBad'], ['Simular webhook sem eventos', 'wHookOld'], ['Simular qualidade baixa', 'wQualBaixa'], ['Perto do limite de envios', 'wLimite'], ['Simular modelo rejeitado', 'wzRej']].map(([l, k]) => ({ l: (S[k] ? '✓ ' : '') + l, toggle: () => this.setState(s => ({ [k]: !s[k], wzTest: null })), bg: S[k] ? '#7A4F00' : '#fff', fg: S[k] ? '#fff' : '#7A4F00' }))
      }
    };
  }
  moreVals(S, can, isRoot, empty, sessAll) {
    const scr = S.screen;
    const badge = on => on ? { bg: '#DFF1E6', fg: '#1B6138', l: 'Ativa' } : { bg: '#EDECF1', fg: '#55516A', l: 'Inativa' };
    // Conteúdo
    const pageBreaks = n => { const b = {}; let i = 0, rem = n, pg = 1; while (rem > 10) { i += 9; rem -= 9; pg++; b[i] = 'Página ' + pg + ' no WhatsApp'; } return b; };
    const visCats = S.cats.filter(c => c.ativa && S.qs.some(q => q.cat === c.id && q.ativa)); const catBrk = pageBreaks(visCats.length);
    const catsVm = S.cats.map((c, i, arr) => {
      const qs = S.qs.filter(q => q.cat === c.id); const on = S.selCat === c.id; const b = badge(c.ativa); const nAt = qs.filter(q => q.ativa).length; const hidden = c.ativa && !nAt;
      return { ...c, hidden, notHidden: !hidden, pageBreak: catBrk[visCats.indexOf(c)] || '', tip: this.tipFor('cat_' + c.id, 'Categorias só aparecem ao cidadão quando têm ao menos uma pergunta ativa'), countTxt: qs.length + (qs.length === 1 ? ' pergunta' : ' perguntas') + ' · ' + nAt + (nAt === 1 ? ' ativa' : ' ativas'), bg: on ? '#EEEBFA' : '#fff', bd: on ? '#C9C2E6' : '#fff', nomeFg: c.ativa ? '#1F1B33' : '#8A869C', stL: b.l, stBg: b.bg, stFg: b.fg, pick: () => this.setState({ selCat: c.id }),
        pos: String(i + 1), upOp: i === 0 ? '.3' : '1', downOp: i === arr.length - 1 ? '.3' : '1',
        up: e => { stop(e); if (i > 0) this.setState(s => { const a = [...s.cats]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { cats: a }; }); },
        down: e => { stop(e); if (i < arr.length - 1) this.setState(s => { const a = [...s.cats]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { cats: a }; }); } };
    });
    const curCat = this.cat(S.selCat);
    const swapQ = (x, y) => this.setState(s => { const a = [...s.qs]; const ix = a.findIndex(q => q.id === x), iy = a.findIndex(q => q.id === y); [a[ix], a[iy]] = [a[iy], a[ix]]; return { qs: a }; });
    const qTerm = norm(S.qBusca.trim()); const qSearching = qTerm.length >= 2;
    const qSrc = qSearching ? S.qs.filter(q => norm(q.texto + ' ' + q.resposta + ' ' + (q.curto || '')).includes(qTerm)) : S.qs.filter(q => q.cat === S.selCat);
    const modNow = () => ({ por: this.me().nome, em: br(TODAY) });
    const actQ = qSrc.filter(q => q.ativa); const qBrk = qSearching ? {} : pageBreaks(actQ.length);
    const qsVm = qSrc.map((q, i, arr) => {
      const b = badge(q.ativa);
      return { ...q, pageBreak: q.ativa ? (qBrk[actQ.indexOf(q)] || '') : '', catNome: this.cat(q.cat).nome, showArrows: !qSearching, modTxt: q.mod ? 'Última alteração por ' + q.mod.por + ' em ' + q.mod.em : '', stL: b.l, stBg: b.bg, stFg: b.fg, txtFg: q.ativa ? '#1F1B33' : '#8A869C', docsN: q.docs.length ? q.docs.length + (q.docs.length > 1 ? ' documentos úteis' : ' documento útil') : 'Sem documentos úteis',
        toggleLbl: q.ativa ? 'Desativar' : 'Ativar',
        pos: String(i + 1), upOp: i === 0 ? '.3' : '1', downOp: i === arr.length - 1 ? '.3' : '1',
        up: () => i > 0 && swapQ(q.id, arr[i - 1].id), down: () => i < arr.length - 1 && swapQ(q.id, arr[i + 1].id),
        edit: () => this.setState({ editQ: { ...q, docs: [...q.docs] }, newDocQ: '', previewQ: false }),
        toggle: () => { this.setState(s => ({ qs: s.qs.map(x => x.id === q.id ? { ...x, ativa: !x.ativa, mod: modNow() } : x) })); this.flash(q.ativa ? 'Pergunta desativada. Deixa de aparecer no chatbot.' : 'Pergunta ativada.'); } };
    });
    const E = S.editQ;
    const setE = f => e => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; this.setState(s => { const n = { ...s.editQ, [f]: v };
      if (f === 'presencial' && v) n.fora = false; if (f === 'fora' && v) { n.presencial = false; n.ai = false; } return { editQ: n }; }); };
    const eq = E ? {
      ...E, isNew: !E.id, titulo: E.id ? 'Editar pergunta' : 'Nova pergunta', catNome: this.cat(E.cat).nome,
      setTexto: setE('texto'), setResposta: setE('resposta'), setBase: setE('base'), setNota: setE('nota'), setPresencial: setE('presencial'), setFora: setE('fora'), setAtiva: setE('ativa'),
      docsVm: E.docs.map((t, i) => ({ t, remove: () => this.setState(s => ({ editQ: { ...s.editQ, docs: s.editQ.docs.filter((_, j) => j !== i) } })) })),
      noDocs: !E.docs.length,
      err: !E.curto.trim() ? 'Informe o título curto (lista do WhatsApp).' : E.curto.length > 24 ? 'O título curto tem no máximo 24 caracteres.' : !E.texto.trim() || !E.resposta.trim() ? 'Texto da pergunta e resposta são obrigatórios.' : E.resposta.length > 3000 ? 'A resposta tem no máximo 3.000 caracteres.' : '',
      setCurto: setE('curto'), setDescCurta: setE('descCurta'), setAi: setE('ai'),
      curtoN: E.curto.length + '/24', curtoFg: E.curto.length >= 24 ? '#8A5A00' : '#6B6780',
      descN: (E.descCurta || '').length + '/72',
      respN: E.resposta.length.toLocaleString('pt-BR') + ' / 3.000', respLong: E.resposta.length >= 1000, respFg: E.resposta.length >= 1000 ? '#8A5A00' : '#6B6780',
      presDis: !!E.fora, foraDis: !!E.presencial, aiDis: !!E.fora, aiChecked: !!E.ai && !E.fora,
      presOp: E.fora ? '.5' : '1', foraOp: E.presencial ? '.5' : '1', aiOp: E.fora ? '.5' : '1',
      modTxt: E.mod ? 'Última alteração por ' + E.mod.por + ' em ' + E.mod.em : '', notNew: !!E.id,
      pv: { titulo: E.curto || E.texto || 'Título da pergunta', texto: E.texto, resposta: E.resposta || 'Resposta ainda não preenchida.', base: E.base, docs: E.docs.map(t => ({ t })), hasDocs: E.docs.length > 0,
        ai: !!E.ai && !E.fora, fora: !!E.fora, pres: !!E.presencial, nota: E.nota, normal: !E.fora && !E.presencial,
        ...(() => { const me = { id: E.id || 'novo', curto: E.curto || 'Esta pergunta' }; const all = []; let placed = false; S.qs.filter(q => q.cat === E.cat).forEach(q => { if (q.id === E.id) { if (E.ativa) all.push(me); placed = true; } else if (q.ativa) all.push(q); }); if (!placed && E.ativa) all.push(me); const paged = all.length > 10; const first = paged ? all.slice(0, 9) : all;
          return { hora: NOW.slice(11), hora2: fromMin(toMin(NOW.slice(11)) + 1), list: first.map(q => ({ t: q.curto || q.texto, fw: q.id === (E.id || 'novo') ? '700' : '400' })), more: paged, catCurto: this.cat(E.cat).curto || this.cat(E.cat).nome }; })() }
    } : {};
    // Sessões
    const [sIni, sFim] = this.sessRange();
    const sTerm = S.sessBusca.trim().toUpperCase().replace(/\s/g, ''); const sSearching = sTerm.length >= 2;
    const sMatch = s => s.cod.toUpperCase().includes(sTerm) || (s.ag && s.ag.id.startsWith(sTerm)) || (s.ret && s.ret.id.startsWith(sTerm));
    const sBase = sSearching ? sessAll.filter(sMatch) : sessAll.filter(s => s.data >= sIni && s.data <= sFim && (S.sessCat === 'todos' || s.cat === S.sessCat || (s.ret && this.q(S.appts.find(a => a.id === s.ret.id).q).cat === S.sessCat)));
    const sessF = sSearching ? sBase : sBase.filter(s => S.sessDesf === 'todos' || s.desf === S.sessDesf);
    const SPER = 20; const sPages = Math.max(1, Math.ceil(sessF.length / SPER)); const sPg = Math.min(S.sessPage, sPages - 1); const sFrom = sPg * SPER;
    const sessVm = sessF.slice(sFrom, sFrom + SPER).map(s => {
      const st = DESF[s.desf]; const q = s.q ? this.q(s.q) : null; const c = s.cat ? this.cat(s.cat) : null;
      const ra = s.ret ? S.appts.find(a => a.id === s.ret.id) : null; const rq = ra ? this.q(ra.q) : null;
      return { cod: s.cod, inicioTxt: brs(s.data) + ' · ' + s.hora, stL: st.l, stBg: st.bg, stFg: st.fg,
        etapaAtual: s.desf === 'andam' ? 'Etapa atual: ' + ETAPA_ATUAL[s.etapa] : '',
        catTxt: c ? c.nome : rq ? this.cat(rq.cat).nome : '—', pergTxt: q ? q.texto : s.ret ? 'Conversa de retorno sobre o agendamento ' + s.ret.id : '—',
        agSim: !!s.ag || !!s.ret, agNao: !s.ag && !s.ret, agId: s.ag ? s.ag.id : s.ret ? s.ret.id : '', agTag: s.ret ? (s.ret.acao === 'remarcou' ? 'Remarcou' : 'Cancelou') : 'Criado',
        agFg: s.ret ? '#1F5E57' : '#1B6138', open: () => this.setState({ selSess: s.cod }) };
    });
    const sCount = k => sBase.filter(s => k === 'todos' || s.desf === k).length;
    const sessChips = [['todos', 'Todos'], ...DESF_ORDER.map(k => [k, DESF[k].l])].map(([k, l]) => { const on = S.sessDesf === k; const D = DESF[k];
      return { l, n: String(sCount(k)), dot: D ? D.c : 'transparent', pick: () => this.setState({ sessDesf: k, sessPage: 0 }), bg: on ? '#483D8B' : '#fff', fg: on ? '#fff' : '#3B3654', bd: on ? '#483D8B' : '#E4E1EE' }; });
    const sessPerChips = [['7d', 'Últimos 7 dias'], ['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ['mes', 'Mês atual'], ['mesAnt', 'Mês anterior'], ['custom', 'Personalizado']].map(([k, l]) => { const on = S.sessPer === k; return { l, pick: () => this.setState({ sessPer: k, sessPage: 0 }), bg: on ? '#483D8B' : 'transparent', fg: on ? '#fff' : '#3B3654' }; });
    const ss = S.selSess ? sessAll.find(s => s.cod === S.selSess) : null;
    const ssVm = ss ? { cod: ss.cod, stL: DESF[ss.desf].l, stBg: DESF[ss.desf].bg, stFg: DESF[ss.desf].fg, inicio: br(ss.data) + ' às ' + ss.hora, timeline: this.timeline(ss),
      hasAg: !!ss.ag && can.verAg, agId: ss.ag ? ss.ag.id : '', openAg: () => { this.setState({ selSess: null }); this.openAppt(ss.ag.id, 'sessoes'); },
      outras: sessAll.filter(x => x.tel === ss.tel && x.cod !== ss.cod).map(x => ({ cod: x.cod, dataTxt: br(x.data) + ' às ' + x.hora, stL: DESF[x.desf].l, stBg: DESF[x.desf].bg, stFg: DESF[x.desf].fg, open: () => this.setState({ selSess: x.cod }) })) } : {};
    if (ss) ssVm.noOutras = !ssVm.outras.length;
    const sessVals = {
      sessVm, sessEmpty: !sessVm.length, sessChips, sessPerChips, sSearching, sNotSearching: !sSearching,
      sessCountTxt: sessF.length ? (sFrom + 1) + '–' + Math.min(sFrom + SPER, sessF.length) + ' de ' + sessF.length + (sessF.length === 1 ? ' sessão' : ' sessões') : '0 sessões',
      sessHasPages: sPages > 1, sessPagTxt: 'Página ' + (sPg + 1) + ' de ' + sPages, sessPrevOp: sPg > 0 ? '1' : '.4', sessNextOp: sPg < sPages - 1 ? '1' : '.4',
      sessPrev: () => sPg > 0 && this.setState({ sessPage: sPg - 1 }), sessNext: () => sPg < sPages - 1 && this.setState({ sessPage: sPg + 1 }),
      sessBusca: S.sessBusca, setSessBusca: e => this.setState({ sessBusca: e.target.value, sessPage: 0 }), clearSessBusca: () => this.setState({ sessBusca: '', sessPage: 0 }),
      sessBuscaHint: sSearching ? sessF.length + (sessF.length === 1 ? ' resultado' : ' resultados') + ' em todos os períodos, categorias e desfechos' : 'Busque pelo código da sessão (S-…) ou pelo protocolo do agendamento.',
      sessCat: S.sessCat, setSessCat: e => this.setState({ sessCat: e.target.value, sessPage: 0 }), sessCatOpts: [{ v: 'todos', l: 'Todas as categorias' }, ...S.cats.map(c => ({ v: c.id, l: c.nome }))],
      sessCustom: S.sessPer === 'custom', sessIni: S.sessIni, sessFim: S.sessFim, setSessIni: e => this.setState({ sessIni: e.target.value, sessPage: 0 }), setSessFim: e => this.setState({ sessFim: e.target.value, sessPage: 0 }),
      sessPerTxt: 'Período: ' + br(sIni) + ' a ' + br(sFim),
      sessEmptyTitle: sSearching ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão no período',
      sessEmptyText: sSearching ? 'Confira o código da sessão ou o protocolo do agendamento.' : 'Altere o desfecho, a categoria ou amplie o período para ver outras conversas.'
    };
    // Relatórios
    const [rIni, rFim] = this.repRange(); const RC = this.reportCore(rIni, rFim); const conv = RC.conv || 1;
    const nf = n => n.toLocaleString('pt-BR'); const pf = x => (Math.round(x * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    const nD = RC.days.length; const weekly = nD > 45;
    let bars = RC.days.map(x => ({ label: nD <= 8 ? WDS[x.w] + ' ' + brs(x.d) : brs(x.d), conv: x.conv, ag: x.ag }));
    if (weekly) { const wk = []; for (let i = 0; i < RC.days.length; i += 7) { const ch = RC.days.slice(i, i + 7); wk.push({ label: brs(ch[0].d), conv: ch.reduce((a, b) => a + b.conv, 0), ag: ch.reduce((a, b) => a + b.ag, 0) }); } bars = wk; }
    const maxB = Math.max(1, ...bars.map(b => b.conv)); const every = bars.length > 16 ? Math.ceil(bars.length / 8) : 1;
    const tipEl = (key, text) => { const t = this.tipFor(key, text); return React.createElement('span', { onMouseEnter: t.enter, onMouseLeave: t.leave, style: { position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 } },
      React.createElement('button', { onClick: t.toggle, 'aria-label': 'Mais informações', style: { border: 0, background: 'none', padding: '0 2px', margin: 0, cursor: 'help', color: '#8A84AB', display: 'inline-flex' } },
        React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none' }, React.createElement('circle', { cx: 8, cy: 8, r: 6.75, stroke: 'currentColor', strokeWidth: 1.5 }), React.createElement('rect', { x: 7.25, y: 7, width: 1.5, height: 4.5, rx: .75, fill: 'currentColor' }), React.createElement('circle', { cx: 8, cy: 4.9, r: .95, fill: 'currentColor' }))),
      t.open ? React.createElement('span', { role: 'tooltip', style: { position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 30, width: 'max-content', maxWidth: 'min(280px,80vw)', background: '#1E1938', color: '#fff', font: '400 12.5px/1.45 Inter,sans-serif', textAlign: 'left', whiteSpace: 'normal', padding: '9px 11px', borderRadius: 8, boxShadow: '0 8px 24px rgba(20,16,40,.25)', pointerEvents: 'none' } }, text) : null); };
    const DF = [
      ['resolv', 'Resolvida sem agendamento', '#3F8F63', 'O cidadão respondeu no chatbot que a dúvida foi resolvida.'],
      ['ag', 'Terminou em agendamento', '#483D8B', 'A conversa terminou com um agendamento criado.'],
      ['fora', 'Fora do escopo do PROCON', '#8A84AB', 'Encaminhada a outro órgão, conforme o conteúdo marcado como fora do escopo.'],
      ['semHor', 'Não resolvida, sem agendamento — sem horário disponível na janela', '#C0392B', 'O cidadão quis agendar, mas não havia horário livre na janela de agendamento.'],
      ['naoQuis', 'Não resolvida, sem agendamento — cidadão não quis agendar', '#D99A1E', 'O cidadão respondeu que a dúvida não foi resolvida e recusou o agendamento.'],
      ['remc', 'Remarcou ou cancelou um agendamento existente', '#6FA8A0', 'Conversas em que o cidadão voltou ao chatbot apenas para remarcar ou cancelar um agendamento já existente.'],
      ['aband', 'Abandonada', '#C98A7E', 'Sem interação por mais de 30 minutos antes de um desfecho.'],
      ['andam', 'Em andamento', '#5B8DC9', 'Conversas iniciadas hoje que ainda não terminaram.']
    ].filter(x => x[0] !== 'andam' || RC.andam > 0);
    const desf = DF.map(([k, l, c, def]) => { const n = RC[k]; const pct = n / conv * 100; const hi = k === 'semHor';
      return { l, c, n, pctTxt: pf(pct), nTxt: nf(n) + ' conversas', w: pct + '%', bg: hi ? '#FDF1EF' : 'transparent', bd: hi ? '#EBC7C2' : 'transparent', fg: hi ? '#8E2C22' : '#1F1B33', fw: hi ? '700' : '500', sub: hi ? 'O chatbot não conseguiu oferecer horário.' : '', link: hi && can.horarios, tipEl: tipEl('rd_' + k, def) }; });
    const catShare = [['c1', .24], ['c4', .2], ['c2', .15], ['c3', .12], ['c6', .1], ['c7', .11], ['c5', .08]];
    const qShare = [['q1', .1], ['q9', .085], ['q7', .07], ['q4', .062], ['q14', .05], ['q16', .046], ['q12', .04], ['q2', .035]];
    const nrShare = [['q9', .03], ['q4', .022], ['q1', .016], ['q11', .013], ['q5', .01], ['q15', .008], ['q13', .006], ['q10', .005]];
    const FUN = [['Na lista de categorias', .36], ['Na lista de perguntas', .13], ['Aguardando a resposta', .15], ["Na pergunta 'A dúvida foi resolvida?'", .17], ['Em quem vai comparecer', .06], ['Na escolha do horário', .13]];
    let fAcc = 0; const funN = FUN.map(([l, f], i) => { const n = i === FUN.length - 1 ? RC.aband - fAcc : Math.round(RC.aband * f); fAcc += n; return { l, n }; });
    const fMax = Math.max(1, ...funN.map(x => x.n));
    let agT = 0, aguardN = 0, futN = 0;
    RC.days.forEach(x => { const n = Math.round(x.ag * 1.02); agT += n; if (x.d === TODAY) { aguardN += Math.round(n * .25); futN += Math.round(n * .35); } else if (x.d === addDays(TODAY, -1)) aguardN += Math.round(n * .08); });
    for (let d = addDays(TODAY, 1); d <= rFim; d = addDays(d, 1)) { const n = this.dayStats(d).ag; agT += n; futN += n; }
    const done = Math.max(0, agT - aguardN - futN); const atend = Math.round(done * .7), nc = Math.round(done * .12), canc = Math.max(0, done - atend - nc);
    const fut = futN;
    const cChat = Math.round(canc * .62), cPainel = canc - cChat;
    const cm = [['Unidade fechada nesta data', .22], ['A pedido do cidadão', .45], ['Agendamento duplicado', .15]]; let cmAcc = 0; const cMotN = cm.map(([l, f]) => { const n = Math.round(cPainel * f); cmAcc += n; return { l, n }; }); cMotN.push({ l: 'Outro motivo', n: Math.max(0, cPainel - cmAcc) });
    const BANDS = ['00–06', '06–08', '08–10', '10–12', '12–14', '14–16', '16–18', '18–20', '20–22', '22–24'], BW = [.02, .05, .14, .16, .12, .14, .13, .11, .09, .04];
    const byW = [0, 0, 0, 0, 0, 0, 0]; RC.days.forEach(x => byW[x.w] += x.conv);
    const picoRaw = [1, 2, 3, 4, 5, 6, 0].map(w => ({ w, vals: BW.map((b, j) => Math.round(byW[w] * b * (0.85 + rnd(w * 13 + j) * 0.3))) }));
    const pMax = Math.max(1, ...picoRaw.flatMap(r => r.vals));
    const rep = {
      totalTxt: nf(RC.conv), mediaTxt: 'Média de ' + (Math.round(RC.conv / Math.max(1, nD) * 10) / 10).toLocaleString('pt-BR') + ' por dia · ' + nf(RC.ag) + ' agendamentos criados',
      desf,
      bars: bars.map((b, i) => ({ h: Math.round(b.conv / maxB * 100) + '%', ha: (b.conv ? Math.round(b.ag / b.conv * 100) : 0) + '%', lbl: i % every === 0 ? b.label : '', tip: (weekly ? 'Semana de ' : '') + b.label + ': ' + b.conv + ' conversas, ' + b.ag + ' agendamentos' })),
      cats: catShare.map(([id, f]) => ({ nome: this.cat(id).nome, n: Math.round(RC.conv * f), nTxt: nf(Math.round(RC.conv * f)), w: Math.round(f / .24 * 100) + '%' })),
      qs: qShare.map(([id, f], i) => ({ pos: String(i + 1), texto: this.q(id).texto, cat: this.cat(this.q(id).cat).nome, n: Math.round(RC.conv * f), nTxt: nf(Math.round(RC.conv * f)) })),
      nr: nrShare.map(([id, f], i) => ({ pos: String(i + 1), texto: this.q(id).texto, cat: this.cat(this.q(id).cat).nome, n: Math.round(RC.conv * f), nTxt: nf(Math.round(RC.conv * f)) })),
      funilSub: nf(RC.aband) + ' conversas abandonadas no período (' + pf(RC.aband / conv * 100) + ' do total). Etapa em que o cidadão parou de responder.',
      funil: funN.map((x, i) => ({ pos: String(i + 1), l: x.l, n: x.n, nTxt: nf(x.n), pTxt: pf(x.n / conv * 100), w: Math.round(x.n / fMax * 100) + '%', tipEl: i === 2 ? tipEl('rf_2', 'O cidadão escolheu a pergunta e saiu antes de receber a resposta. Abandonos aqui costumam indicar resposta demorada.') : null })),
      ncTxt: pf(nc / Math.max(1, atend + nc) * 100), ncSub: nf(nc) + ' não compareceram de ' + nf(atend + nc) + ' agendamentos já registrados (Atendido ou Não compareceu).',
      resRows: [['Atendido', atend, ST.atendido], ['Não compareceu', nc, ST.nao_compareceu], ['Cancelado', canc, ST.cancelado], ['Aguardando registro (horário já passou)', aguardN, { bg: '#FCF4E3', fg: '#7A4F00' }], ['Pendente ou Confirmado (ainda futuro)', fut, ST.confirmado]].map(([l, n, s]) => ({ l, n, nTxt: nf(n), pTxt: pf(n / Math.max(1, agT) * 100), bg: s.bg, fg: s.fg })),
      agTotalTxt: nf(agT),
      cOrig: [{ l: 'Cidadão no chatbot', n: cChat }, { l: 'Equipe no painel', n: cPainel }].map(x => ({ ...x, nTxt: nf(x.n) })),
      cMot: cMotN.map(x => ({ ...x, nTxt: nf(x.n) })),
      picoHead: BANDS.map(l => ({ l })),
      pico: picoRaw.map(r => ({ l: WDS[r.w], cells: r.vals.map((v, j) => { const a = 0.08 + 0.92 * v / pMax; return { v: String(v), tip: WDS[r.w] + ', ' + BANDS[j] + ': ' + v + ' conversas', bg: 'rgba(72,61,139,' + a.toFixed(2) + ')', fg: a > 0.5 ? '#fff' : '#2E2757' }; }) })),
      picoMax: 'Pico: ' + (() => { let best = null; picoRaw.forEach(r => r.vals.forEach((v, j) => { if (!best || v > best.v) best = { v, l: WDS[r.w] + ', ' + BANDS[j] }; })); return best.l + ' (' + best.v + ' conversas)'; })()
    };
    const rtipTxt = {
      total: 'Conversas iniciadas no WhatsApp com o chatbot no período selecionado.',
      desf: 'Cada conversa do período tem um único desfecho. As categorias somam 100%.',
      bars: 'Conversas iniciadas e agendamentos criados pelo chatbot em cada ' + (weekly ? 'semana' : 'dia') + ' do período.',
      cats: 'Quantidade de conversas distintas que escolheram cada categoria no período.',
      qs: 'Quantidade de conversas distintas que escolheram cada pergunta no período.',
      nr: 'Perguntas em que mais cidadãos responderam que a dúvida não foi resolvida no período. Indica respostas que podem precisar de revisão.',
      funil: 'Etapa em que estava cada conversa abandonada (sem interação por mais de 30 minutos).',
      res: 'Situação atual dos agendamentos cuja data do atendimento está no período selecionado, independentemente de quando foram criados.',
      nc: 'Não compareceu dividido por (Atendido + Não compareceu), entre os agendamentos com atendimento no período. Cancelados, aguardando registro e futuros não entram na conta.',
      corig: 'Quem cancelou: o próprio cidadão, pelo chatbot, ou a equipe, pelo painel.',
      cmot: 'Motivo escolhido pela equipe ao cancelar pelo painel.',
      pico: 'Conversas iniciadas em cada combinação de dia da semana e faixa de horário no período.'
    };
    const rtip = {}; Object.keys(rtipTxt).forEach(k => rtip[k] = this.tipFor('rt_' + k, rtipTxt[k]));
    const PER = [['7d', 'Últimos 7 dias'], ['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ['mes', 'Mês atual'], ['mesAnt', 'Mês anterior'], ['custom', 'Personalizado']];
    const repPerChips = PER.map(([k, l]) => { const on = S.repPeriodo === k; return { l, pick: () => this.setState({ repPeriodo: k }), bg: on ? '#483D8B' : 'transparent', fg: on ? '#fff' : '#3B3654' }; });
    const perTxt = brs(rIni) + (rIni.slice(0, 4) !== rFim.slice(0, 4) ? '/' + rIni.slice(0, 4) : '') + ' a ' + br(rFim);
    const perShort = brs(rIni) + ' a ' + brs(rFim);
    // Export
    const sheets = [
      { name: 'Resumo', rows: [['Indicador', 'Valor'], ['Período', perTxt], ['Dias no período', nD], ['Conversas', RC.conv], ['Agendamentos criados', RC.ag], ['Resolvidas sem agendamento (%)', Math.round(RC.resolv / conv * 1000) / 10], ['Taxa de não comparecimento (%)', Math.round(nc / Math.max(1, atend + nc) * 1000) / 10]] },
      { name: 'Desfechos', rows: [['Desfecho', 'Conversas', 'Percentual (%)'], ...desf.map(d => [d.l, d.n, Math.round(d.n / conv * 1000) / 10])] },
      { name: weekly ? 'Conversas por semana' : 'Conversas por dia', rows: [[weekly ? 'Semana iniciada em' : 'Data', 'Conversas', 'Agendamentos'], ...(weekly ? bars.map(b => [b.label, b.conv, b.ag]) : RC.days.map(x => [br(x.d), x.conv, x.ag]))] },
      { name: 'Categorias', rows: [['Categoria', 'Conversas'], ...catShare.map(([id, f]) => [this.cat(id).nome, Math.round(RC.conv * f)])] },
      { name: 'Perguntas', rows: [['Pergunta', 'Categoria', 'Conversas'], ...qShare.map(([id, f]) => [this.q(id).texto, this.cat(this.q(id).cat).nome, Math.round(RC.conv * f)])] },
      { name: 'Perguntas que não resolveram', rows: [['Pergunta', 'Categoria', 'Responderam que não resolveu'], ...nrShare.map(([id, f]) => [this.q(id).texto, this.cat(this.q(id).cat).nome, Math.round(RC.conv * f)])] },
      { name: 'Abandono por etapa', rows: [['Etapa', 'Conversas abandonadas', '% do total de conversas'], ...funN.map(x => [x.l, x.n, Math.round(x.n / conv * 1000) / 10])] },
      { name: 'Resultado dos agendamentos', rows: [['Item', 'Quantidade'], ['Atendido', atend], ['Não compareceu', nc], ['Cancelado', canc], ['Aguardando registro (horário já passou)', aguardN], ['Pendente ou Confirmado (futuro)', fut], ['Total com atendimento no período', agT], ['Cancelados pelo cidadão no chatbot', cChat], ['Cancelados pela equipe no painel', cPainel], ...cMotN.map(x => ['Motivo (painel): ' + x.l, x.n])] },
      { name: 'Horário de pico', rows: [['Dia', ...BANDS], ...picoRaw.map(r => [WDS[r.w], ...r.vals])] }
    ];
    const charts = { Desfechos: { rows: desf.map(d => ({ l: d.l, v: d.n, w: d.n / conv * 100, c: d.c })) }, Categorias: { color: '#7A6FC4', rows: rep.cats.map(c => ({ l: c.nome, v: c.n, w: parseFloat(c.w) })) }, 'Abandono por etapa': { color: '#C98A7E', rows: funN.map(x => ({ l: x.l, v: x.n, w: x.n / fMax * 100 })) } };
    charts[sheets[2].name] = { color: '#7A6FC4', rows: bars.map(b => ({ l: b.label, v: b.conv, w: b.conv / maxB * 100 })) };
    const FMT = { pdf: ['PDF', 'Relatório formatado para apresentação'], xlsx: ['Excel (.xlsx)', 'Uma aba por seção'], csv: ['CSV (.zip)', 'Um CSV por seção, separador ";"'] };
    const fileBase = 'proconchat-relatorio-' + rIni + '_a_' + rFim;
    const EF = S.expFmt;
    const exp = EF ? {
      title: 'Exportar relatório · ' + FMT[EF][0],
      preview: { pdf: 'PDF com ' + sheets.length + ' seções', xlsx: 'Excel com ' + sheets.length + ' abas', csv: 'Arquivo .zip com ' + sheets.length + ' CSVs' }[EF] + ' · período ' + perShort,
      desc: { pdf: 'Cabeçalho "PROCON Jacareí · Relatório do ProconChat", período, data e hora de geração e seu nome. Gráficos e tabelas na mesma ordem da tela, com paginação no rodapé. Abre a janela de impressão: escolha "Salvar como PDF".', xlsx: 'Cabeçalhos em negrito, colunas com largura ajustada e números como números.', csv: 'Separador ";" e codificação UTF-8 com BOM, para abrir corretamente no Excel em português.' }[EF],
      sections: sheets.map(s => ({ l: s.name })), generating: S.expGen, btnTxt: S.expGen ? 'Gerando…' : 'Gerar e baixar', btnOp: S.expGen ? '.6' : '1'
    } : {};
    const runExp = () => {
      if (S.expGen) return; this.setState({ expGen: true });
      const d = new Date(); const pad = n => String(n).padStart(2, '0');
      const meta = { file: fileBase, periodo: perTxt, geradoEm: br(TODAY) + ' às ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), autor: this.me().nome };
      setTimeout(() => import('./report-export.js').then(X => {
        if (EF === 'pdf') X.printPdf(meta, sheets, charts);
        else if (EF === 'xlsx') X.download(X.xlsx(sheets), fileBase + '.xlsx');
        else X.download(X.csvZip(sheets), fileBase + '-csv.zip');
        this.setState({ expGen: false, expFmt: null }); this.flash(EF === 'pdf' ? 'Relatório pronto. Escolha "Salvar como PDF" na janela de impressão.' : 'Arquivo gerado e baixado.');
      }).catch(err => { console.error(err); this.setState({ expGen: false }); this.flash('Não foi possível gerar o arquivo.'); }), 1100);
    };
    // Horários
    const H = S.hd ? { ...S, ...S.hd } : S; const durH = +H.duracao || 30;
    const setH = fn => this.setState(s => { const b = s.hd || pickCfg(s); return { hd: { ...b, ...fn(b) } }; });
    const setDia = (dow, fn) => setH(b => ({ dias: b.dias.map(d => d.dow === dow ? fn(d) : d) }));
    let horErr = 0;
    const diasVm = H.dias.map(d => ({
      nome: WD[d.dow].replace('-feira', ''), on: d.on, off: !d.on,
      toggle: () => setDia(d.dow, x => ({ ...x, on: !x.on, faixas: !x.on && !x.faixas.length ? [['08:30', '11:30']] : x.faixas })),
      addFaixa: () => setDia(d.dow, x => ({ ...x, faixas: [...x.faixas, ['13:30', '16:30']] })),
      faixas: d.faixas.map((f, j) => {
        let err = '';
        if (d.on) {
          if (!f[0] || !f[1]) err = 'Informe o início e o fim da faixa.';
          else if (toMin(f[1]) <= toMin(f[0])) err = 'O fim deve ser depois do início.';
          else if (d.faixas.some((g, k) => k !== j && g[0] && g[1] && Math.max(toMin(f[0]), toMin(g[0])) < Math.min(toMin(f[1]), toMin(g[1])))) err = 'Esta faixa se sobrepõe a outra faixa do mesmo dia.';
          else if (toMin(f[1]) - toMin(f[0]) < durH) err = 'Esta faixa não comporta nenhum atendimento de ' + durH + ' minutos.';
        }
        if (err) horErr++;
        return { ini: f[0], fim: f[1], err, bd: err ? '#D9776B' : '#E4E1EE', bg: err ? '#FDF1EF' : '#FAF9FD',
          setIni: e => { const v = e.target.value; setDia(d.dow, x => ({ ...x, faixas: x.faixas.map((g, k) => k === j ? [v, g[1]] : g) })); },
          setFim: e => { const v = e.target.value; setDia(d.dow, x => ({ ...x, faixas: x.faixas.map((g, k) => k === j ? [g[0], v] : g) })); },
          remove: () => setDia(d.dow, x => ({ ...x, faixas: x.faixas.filter((_, k) => k !== j) })) };
      }),
      canAdd: d.on && d.faixas.length < 3
    }));
    const preview = H.dias.map(d => { const sl = this.slotsFor(d.dow, H); return { nome: WDS[d.dow], slots: sl.map(t => ({ t })), vazio: !sl.length, total: sl.length ? sl.length + ' horários · ' + sl.length * H.vagas + ' vagas' : 'Fechado' }; });
    const bloqVm = [...H.bloqueios].sort((a, b) => (a.data + (a.ini || '')).localeCompare(b.data + (b.ini || ''))).map(b => ({ dataBr: br(b.data), dia: WD[dt(b.data).getDay()], desc: b.desc, periodo: b.ini ? b.ini + '–' + b.fim : 'Dia inteiro', perFg: b.ini ? '#7A4F00' : '#6B6780',
      remove: () => setH(c => ({ bloqueios: c.bloqueios.filter(x => !(x.data === b.data && (x.ini || '') === (b.ini || ''))) })) }));
    const applyNow = patch => { this.setState({ ...patch, horMod: { por: this.me().nome, em: br(TODAY) } }); };
    const horVals = {
      ...(() => { const lbls = { dias: 'grade semanal', duracao: 'duração', vagas: 'vagas', janela: 'janela', antecedencia: 'antecedência', alertaEspera: 'alerta de espera', bloqueios: 'datas bloqueadas', endereco: 'endereço', enderecoCompl: 'complemento', lembreteOn: 'lembrete', lembreteHoras: 'horas do lembrete' };
        const ch = S.hd ? HCFG.filter(k => JSON.stringify(H[k]) !== JSON.stringify(S[k])) : [];
        return { horDirty: ch.length > 0, horDirtyTxt: ch.length + (ch.length === 1 ? ' alteração não salva' : ' alterações não salvas'), horDirtyTip: 'Pendentes: ' + ch.map(k => lbls[k]).join(', ') }; })(), horModTxt: 'Última alteração por ' + S.horMod.por + ' em ' + S.horMod.em, horErrTxt: horErr ? horErr + (horErr === 1 ? ' faixa com erro. Corrija para salvar.' : ' faixas com erro. Corrija para salvar.') : '',
      saveOp: horErr ? '.5' : '1', descartarHor: () => this.setState({ hd: null }),
      saveHorarios: () => {
        if (horErr) return this.flash('Corrija as faixas de horário com erro antes de salvar.');
        if (!S.hd || HCFG.every(k => JSON.stringify(H[k]) === JSON.stringify(S[k]))) return this.flash('Nenhuma alteração para salvar.');
        const list = this.conflicts(H);
        if (list.length) return this.setState({ confl: { list, patch: pickCfg(H), source: 'save' } });
        this.setState({ ...pickCfg(H), hd: null, horMod: { por: this.me().nome, em: br(TODAY) } }); this.flash('Horários salvos. O chatbot passa a oferecer a nova grade.');
      },
      newBlqTipo: S.newBlqTipo, blqPeriodo: S.newBlqTipo === 'periodo', newBlqIni: S.newBlqIni, newBlqFim: S.newBlqFim,
      blqTipos: [['dia', 'Dia inteiro'], ['periodo', 'Apenas um período']].map(([k, l]) => { const on = S.newBlqTipo === k; return { l, pick: () => this.setState({ newBlqTipo: k }), bg: on ? '#483D8B' : 'transparent', fg: on ? '#fff' : '#3B3654' }; }),
      setNewBlqIni: e => this.setState({ newBlqIni: e.target.value }), setNewBlqFim: e => this.setState({ newBlqFim: e.target.value }),
      addBloq: () => {
        if (!S.newBlqData) return this.flash('Informe a data.');
        const per = S.newBlqTipo === 'periodo';
        if (per && (!S.newBlqIni || !S.newBlqFim || toMin(S.newBlqFim) <= toMin(S.newBlqIni))) return this.flash('Informe um período válido (fim depois do início).');
        if (H.bloqueios.some(b => b.data === S.newBlqData && (!b.ini || !per))) return this.flash('Esta data já tem um bloqueio.');
        const nb = { data: S.newBlqData, desc: S.newBlqDesc.trim() || 'Sem descrição', ...(per ? { ini: S.newBlqIni, fim: S.newBlqFim } : {}) };
        setH(c => ({ bloqueios: [...c.bloqueios, nb] })); this.setState({ newBlqData: '', newBlqDesc: '' }); this.flash('Bloqueio adicionado. Salve as alterações para aplicar.');
      },
      conflOpen: !!S.confl, confl: S.confl ? { n: String(S.confl.list.length), titulo: 'Esta alteração afeta ' + S.confl.list.length + (S.confl.list.length === 1 ? ' agendamento' : ' agendamentos'),
        rows: S.confl.list.map(x => ({ id: x.a.id, nome: x.a.nome, quando: WDS[dt(x.a.data).getDay()] + ', ' + br(x.a.data) + ' às ' + x.a.hora, motivo: x.motivo, stL: ST[x.a.status].l, stBg: ST[x.a.status].bg, stFg: ST[x.a.status].fg })),
        cancelMot: S.confl.list.every(x => x.tipo === 'fechada') ? '"Unidade fechada nesta data"' : S.confl.list.some(x => x.tipo === 'fechada') ? '"Unidade fechada nesta data" (datas bloqueadas) ou "Outro motivo" (demais casos)' : '"Outro motivo"' } : {},
      conflBack: () => this.setState({ confl: null }), conflKeep: () => this.resolveConfl('keep'), conflCancel: () => this.resolveConfl('cancel'),
      goConteudoHor: () => this.go('conteudo')
    };
    // Documentos
    const D = S.dd || { docsTit: S.docsTit, docsRep: S.docsRep, log: [] };
    const GL = { docsTit: 'Titular', docsRep: 'Representante' };
    const setD = (fn, msg) => this.setState(s => { const b = s.dd || { docsTit: s.docsTit, docsRep: s.docsRep, log: [] }; const n = { ...b, ...fn(b), log: [...b.log, msg] }; const same = JSON.stringify([n.docsTit, n.docsRep]) === JSON.stringify([s.docsTit, s.docsRep]); return { dd: same ? null : n, docEdit: null }; });
    const edRef = el => { if (el && this._docEdEl !== el) { this._docEdEl = el; el.focus(); el.select(); } };
    const docList = key => D[key].map((t, i, arr) => {
      const ed = !!S.docEdit && S.docEdit.key === key && S.docEdit.i === i;
      const commit = () => { const v = (S.docEdit.v || '').trim(); if (!v) return this.flash('O texto do documento não pode ficar vazio.'); if (v === t) return this.setState({ docEdit: null }); if (arr.some((x, j) => j !== i && norm(x) === norm(v))) return this.flash('Este documento já está na lista.'); setD(b => ({ [key]: b[key].map((x, j) => j === i ? v : x) }), GL[key] + ': editado "' + t + '" para "' + v + '"'); };
      return { t, pos: String(i + 1), upOp: i === 0 ? '.3' : '1', downOp: i === arr.length - 1 ? '.3' : '1', editing: ed, viewing: !ed, edV: ed ? S.docEdit.v : '', edRef,
        edit: () => this.setState({ docEdit: { key, i, v: t } }),
        setEdV: e => { const v = e.target.value; this.setState(s => ({ docEdit: { ...s.docEdit, v } })); },
        edKey: e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.setState({ docEdit: null }); } },
        edOk: commit, edCancel: () => this.setState({ docEdit: null }),
        up: () => i > 0 && setD(b => { const a = [...b[key]]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { [key]: a }; }, GL[key] + ': "' + t + '" movido para cima'),
        down: () => i < arr.length - 1 && setD(b => { const a = [...b[key]]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { [key]: a }; }, GL[key] + ': "' + t + '" movido para baixo'),
        remove: () => setD(b => ({ [key]: b[key].filter((_, j) => j !== i) }), GL[key] + ': removido "' + t + '"') };
    });
    const addDoc = (key, dk) => () => { const t = S[dk].trim(); if (!t) return; if (D[key].some(x => norm(x) === norm(t))) return this.flash('Este documento já está na lista.'); setD(b => ({ [key]: [...b[key], t] }), GL[key] + ': adicionado "' + t + '"'); this.setState({ [dk]: '' }); };
    const addKey = (key, dk) => e => { if (e.key === 'Enter') { e.preventDefault(); addDoc(key, dk)(); } };
    const DSTOP = ['ou', 'de', 'da', 'do', 'das', 'dos', 'em', 'se', 'com', 'para', 'comprovante', 'documento', 'outro', 'copia', 'houver'];
    const kw = t => norm(t).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 1 && !DSTOP.includes(w)).map(w => w.replace(/s$/, ''));
    const isDup = (x, y) => { const A = kw(x), B = kw(y); return !!A.length && !!B.length && (A.every(w => B.includes(w)) || B.every(w => A.includes(w))); };
    const docsVals = (() => {
      const n = S.dd ? S.dd.log.length : 0;
      const pqList = S.qs.filter(q => q.ativa); const pq = pqList.find(q => q.id === S.docPvQ) || pqList[0];
      const grp = S.docPvG === 'rep' ? D.docsRep : D.docsTit; const qd = pq ? pq.docs : [];
      const ex = S.appts.find(a => a.id === 'A3F9C21B') || S.appts[0];
      const gi = grp.map(t => { const dup = qd.some(y => isDup(t, y)); return { t, dup, bg: dup ? '#FFF1BF' : 'transparent' }; });
      const qi = qd.map(t => { const dup = grp.some(y => isDup(t, y)); return { t, dup, bg: dup ? '#FFF1BF' : 'transparent' }; });
      const nDup = gi.filter(x => x.dup).length;
      return {
        docsTitVm: docList('docsTit'), docsRepVm: docList('docsRep'), docsTitEmpty: !D.docsTit.length, docsRepEmpty: !D.docsRep.length,
        docsDirty: n > 0, docsDirtyTxt: n + (n === 1 ? ' alteração não salva' : ' alterações não salvas'), docsDirtyTip: S.dd ? 'Pendentes: ' + S.dd.log.join('; ') : '',
        docsModTxt: 'Última alteração por ' + S.docsMod.por + ' em ' + S.docsMod.em,
        descartarDocs: () => this.setState({ dd: null, docEdit: null }),
        saveDocs: () => {
          if (!S.dd) return this.flash('Nenhuma alteração para salvar.');
          const vaz = [D.docsTit.length ? '' : 'do titular', D.docsRep.length ? '' : 'do representante'].filter(Boolean);
          this.setState({ docsTit: D.docsTit, docsRep: D.docsRep, dd: null, docEdit: null, docsMod: { por: this.me().nome, em: br(TODAY) } });
          this.flash(vaz.length === 2 ? 'Listas salvas. As listas do titular e do representante ficaram sem documentos.' : vaz.length ? 'Listas salvas. A lista ' + vaz[0] + ' ficou sem documentos.' : 'Listas de documentos salvas. Valem para os próximos agendamentos.');
        },
        newDocTit: S.newDocTit, newDocRep: S.newDocRep, setNewDocTit: e => this.setState({ newDocTit: e.target.value }), setNewDocRep: e => this.setState({ newDocRep: e.target.value }),
        addDocTit: addDoc('docsTit', 'newDocTit'), addDocRep: addDoc('docsRep', 'newDocRep'), addDocTitKey: addKey('docsTit', 'newDocTit'), addDocRepKey: addKey('docsRep', 'newDocRep'),
        dpv: {
          tabs: [['tit', 'Titular comparece'], ['rep', 'Representante comparece']].map(([k, l]) => { const on = S.docPvG === k; return { l, pick: () => this.setState({ docPvG: k }), bg: on ? '#483D8B' : 'transparent', fg: on ? '#fff' : '#3B3654' }; }),
          qOpts: pqList.map(q => ({ v: q.id, l: q.curto || q.texto })), qVal: pq ? pq.id : '', setQ: e => this.setState({ docPvQ: e.target.value }),
          proto: ex.id, quando: WD[dt(ex.data).getDay()].toLowerCase() + ', ' + brs(ex.data) + ', às ' + ex.hora,
          end: S.endereco.trim() ? S.endereco.trim() + (S.enderecoCompl.trim() ? ' (' + S.enderecoCompl.trim() + ')' : '') : '[endereço não informado em Horários de atendimento]',
          grpTit: S.docPvG === 'rep' ? 'A pessoa que comparecer em seu nome deve levar:' : 'Leve ao atendimento:',
          grp: gi, hasGrp: gi.length > 0, grpEmpty: !gi.length,
          grpAlert: 'Nenhum documento será pedido quando ' + (S.docPvG === 'rep' ? 'um representante' : 'o titular') + ' comparecer. O cidadão pode chegar sem o necessário para o atendimento.',
          qDocs: qi, hasQ: qi.length > 0, qSemDocs: !qi.length,
          dupTxt: nDup ? nDup + (nDup === 1 ? ' item aparece' : ' itens aparecem') + ' nas duas listas. O cidadão recebe o pedido repetido.' : '',
          draftNote: S.dd ? 'A prévia já inclui as alterações não salvas.' : '',
          avisos: 'Você receberá neste número avisos sobre este agendamento, como ' + (S.lembreteOn ? 'um lembrete ' + S.lembreteHoras + (S.lembreteHoras === 1 ? ' hora' : ' horas') + ' antes do atendimento e o aviso' : 'o aviso') + ' em caso de cancelamento.',
          hora: NOW.slice(11)
        }
      };
    })();
    // Usuários
    const UD = S.ud || { users: S.users, reas: [] };
    const actor = this.me(); const actorP = actor.root ? ALLP : actor.perms;
    const byId = id => UD.users.find(u => u.id === id);
    const reasIds = UD.reas.flatMap(r => r.ids);
    const futOf = u => S.appts.filter(a => a.resp === u.nome && (a.status === 'pendente' || a.status === 'confirmado') && (a.data > TODAY || (a.data === TODAY && a.hora > NOW.slice(11))) && !reasIds.includes(a.id)).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
    const uDiffs = users => { const out = []; users.forEach(u => { const o = S.users.find(x => x.id === u.id); if (!o) return; if (o.ativo !== u.ativo) out.push({ id: u.id, t: u.nome + ': ' + (u.ativo ? 'reativar conta' : 'desativar conta') }); PERMS.forEach(p => { const was = o.perms.includes(p.k), is = u.perms.includes(p.k); if (was !== is) out.push({ id: u.id, t: u.nome + ': ' + (is ? 'conceder ' : 'remover ') + p.n }); }); }); return out; };
    const commitDraft = (users, reas) => { const keep = reas.filter(r => { const u = users.find(x => x.id === r.uid); return u && (!u.ativo || !u.perms.includes('gerAg')); }); this.setState({ ud: uDiffs(users).length ? { users, reas: keep } : null, uModal: null }); };
    const applyU = (uid, fn, kind) => { const users = UD.users.map(u => u.id === uid ? fn(u) : u); const nu = users.find(u => u.id === uid); const lost = kind === 'desativar' ? !nu.ativo : !nu.perms.includes('gerAg'); const fut = lost ? futOf(nu) : []; if (fut.length) { const tgt = users.filter(u => u.id !== uid && u.ativo && (u.root || u.perms.includes('gerAg'))); this.setState({ uModal: { uid, kind, users, ids: fut.map(a => a.id), mode: 'pend', to: tgt[0] ? tgt[0].nome : '' } }); } else commitDraft(users, UD.reas); };
    const accTxt = u => u.lastAcc ? 'Último acesso em ' + u.lastAcc : 'Nunca acessou';
    const usersVm = UD.users.map(u => { const on = S.selUser === u.id; const pend = uDiffs([u]).length > 0; return { ...u, ini: ini(u.nome), stL: u.ativo ? 'Ativo' : 'Inativo', stBg: u.ativo ? '#DFF1E6' : '#EDECF1', stFg: u.ativo ? '#1B6138' : '#55516A', permTxt: u.root ? 'Todas as permissões' : u.perms.length + ' de 8 permissões', accTxt: accTxt(u), pend, bg: on ? '#F7F6FC' : '#fff', pick: () => this.setState({ selUser: u.id }), notRoot: !u.root }; });
    const su = byId(S.selUser) || UD.users[0];
    const self = su.id === actor.id;
    const lockSelf = self && !su.root;
    const outranks = !actor.root && !su.root && su.perms.some(k => !actorP.includes(k));
    const canManage = !lockSelf && !outranks;
    const suVm = { ...su, ini: ini(su.nome), notRoot: !su.root, lockSelf, self, notSelf: !self, showActions: !su.root || self, canToggleNR: !su.root && canManage, noToggleNR: !su.root && !canManage, canResetNR: !su.root && canManage, noReset: !su.root && !self && !canManage, lockTip: lockSelf ? 'Você não pode alterar a própria conta' : 'Esta conta tem permissões que você não possui', showOutranks: outranks && !self, ativoLbl: su.ativo ? 'Desativar conta' : 'Reativar conta',
      accTxt: accTxt(su), modTxt: su.permMod ? 'Permissões alteradas por ' + su.permMod.por + ' em ' + su.permMod.em : 'Permissões ainda não alteradas',
      toggleAtivo: () => { if (!canManage) return; applyU(su.id, u => ({ ...u, ativo: !u.ativo }), 'desativar'); },
      perms: PERMS.map(p => { const checked = su.root || su.perms.includes(p.k); const lacks = !actor.root && !actorP.includes(p.k); const cascadeBlock = p.k === 'verAg' && checked && su.perms.includes('gerAg') && !actor.root && !actorP.includes('gerAg'); const disabled = !!su.root || lockSelf || lacks || cascadeBlock;
        return { ...p, checked, disabled, op: disabled ? '.55' : '1', cursor: disabled ? 'not-allowed' : 'pointer', tip: su.root || lockSelf ? '' : lacks ? 'Você não possui esta permissão' : cascadeBlock ? 'Desmarcar remove também Gerenciar agendamentos, que você não possui' : '', inc: p.k === 'gerAg' ? 'Inclui Ver agendamentos' : '',
          toggle: () => { if (disabled) return; applyU(su.id, u => { let ps = u.perms.includes(p.k) ? u.perms.filter(x => x !== p.k) : [...u.perms, p.k]; if (p.k === 'gerAg' && ps.includes('gerAg') && !ps.includes('verAg')) ps.push('verAg'); if (p.k === 'verAg' && !ps.includes('verAg')) ps = ps.filter(x => x !== 'gerAg'); return { ...u, perms: ALLP.filter(k => ps.includes(k)) }; }, 'gerAg'); } }; }) };
    const UM = S.uModal;
    const umVals = (() => { if (!UM) return { hasUModal: false, um: {} }; const u = UM.users.find(x => x.id === UM.uid); const tgt = UM.users.filter(x => x.id !== UM.uid && x.ativo && (x.root || x.perms.includes('gerAg'))); const n = UM.ids.length;
      return { hasUModal: true, um: { title: 'Esta conta é responsável por ' + n + (n === 1 ? ' agendamento futuro' : ' agendamentos futuros'),
        sub: u.nome + (UM.kind === 'desativar' ? ' será desativada' : ' perderá a permissão Gerenciar agendamentos') + '. Escolha o que acontece com ' + (n === 1 ? 'este agendamento' : 'estes agendamentos') + '. A mudança só vale ao salvar.',
        list: UM.ids.map(id => { const a = S.appts.find(x => x.id === id); return { id, nome: a.nome, quando: brs(a.data) + ' às ' + a.hora, st: a.status === 'pendente' ? 'Pendente' : 'Confirmado' }; }),
        pendOn: UM.mode === 'pend', outroOn: UM.mode === 'outro', pendBd: UM.mode === 'pend' ? '#483D8B' : '#E4E1EE', outroBd: UM.mode === 'outro' ? '#483D8B' : '#E4E1EE', pendBg: UM.mode === 'pend' ? '#F7F6FC' : '#fff', outroBg: UM.mode === 'outro' ? '#F7F6FC' : '#fff',
        pickPend: () => this.setState(s => ({ uModal: { ...s.uModal, mode: 'pend' } })), pickOutro: () => this.setState(s => ({ uModal: { ...s.uModal, mode: 'outro' } })),
        tgtOpts: tgt.map(x => ({ v: x.nome, l: x.nome })), noTgt: !tgt.length, hasTgt: tgt.length > 0, to: UM.to, setTo: e => { const v = e.target.value; this.setState(s => ({ uModal: { ...s.uModal, to: v, mode: 'outro' } })); },
        okOp: UM.mode === 'outro' && !UM.to ? '.45' : '1',
        close: () => this.setState({ uModal: null }),
        ok: () => { if (UM.mode === 'outro' && !UM.to) return; commitDraft(UM.users, [...UD.reas, { uid: UM.uid, nome: u.nome, kind: UM.kind, ids: UM.ids, mode: UM.mode, to: UM.to }]); } } }; })();
    const dfs = S.ud ? uDiffs(S.ud.users) : [];
    const uSave = {
      usersDirty: dfs.length > 0, usersDirtyTxt: dfs.length + (dfs.length === 1 ? ' alteração não salva' : ' alterações não salvas'), usersDirtyTip: 'Pendentes: ' + dfs.map(x => x.t).join('; ') + (S.ud && S.ud.reas.length ? '; ' + S.ud.reas.reduce((n, r) => n + r.ids.length, 0) + ' agendamento(s) redistribuído(s)' : ''),
      descartarUsers: () => this.setState({ ud: null, uModal: null }),
      saveUsers: () => {
        if (!S.ud) return this.flash('Nenhuma alteração para salvar.');
        const me = actor.nome; const now = this.nowTxt(); const changed = new Set(dfs.map(x => x.id)); const R = S.ud.reas;
        const motivo = r => r.kind === 'desativar' ? 'conta de ' + r.nome + ' desativada' : r.nome + ' sem a permissão Gerenciar agendamentos';
        this.setState(s => ({ users: S.ud.users.map(u => changed.has(u.id) ? { ...u, permMod: { por: me, em: br(TODAY) } } : u), ud: null,
          appts: s.appts.map(a => { const r = R.find(x => x.ids.includes(a.id)); if (!r) return a; return r.mode === 'pend' ? { ...a, resp: null, status: 'pendente', hist: [...a.hist, { t: 'Voltou para Pendente sem responsável (' + motivo(r) + ') por ' + me, q: now }] } : { ...a, resp: r.to, status: 'confirmado', hist: [...a.hist, { t: 'Atribuído a ' + r.to + ' (' + motivo(r) + ') por ' + me + ' · Confirmado', q: now }] }; }) }));
        const nA = R.reduce((n, r) => n + r.ids.length, 0);
        this.flash('Alterações de usuários salvas.' + (nA ? ' ' + nA + (nA === 1 ? ' agendamento redistribuído.' : ' agendamentos redistribuídos.') : ''));
      }, ...umVals };
    const NU = S.newUser;
    const setNU = f => e => { const v = e.target.value; this.setState(s => ({ newUser: { ...s.newUser, [f]: v } })); };
    const nuEmailErr = NU && NU.email.trim() && S.users.some(u => norm(u.email) === norm(NU.email.trim())) ? 'Este e-mail já está em uso por outra conta.' : '';
    const nuOk = NU && NU.nome.trim() && /\S+@\S+\.\S+/.test(NU.email) && NU.senha.length >= 8 && !nuEmailErr;
    const CE = S.catEdit;
    const ceErr = CE ? (!CE.nome.trim() ? 'Informe o nome da categoria.' : !(CE.curto || '').trim() ? 'Informe o título curto (lista do WhatsApp).' : CE.curto.length > 24 ? 'O título curto tem no máximo 24 caracteres.' : S.cats.some(c => c.id !== CE.id && norm(c.nome) === norm(CE.nome.trim())) ? 'Já existe uma categoria com esse nome.' : '') : '';
    const setCE = f => e => { const v = e.target.value; this.setState(s => ({ catEdit: { ...s.catEdit, [f]: v } })); };
    const meU = this.me(); const PWm = S.modalPwd; const PW = S.pwd; const pwMe = PWm === 'me';
    const setPW = f => e => { const v = e.target.value; this.setState(s => ({ pwd: { ...s.pwd, [f]: v } })); };
    const pwErr = PW.nova && PW.nova.length < 8 ? 'A senha deve ter no mínimo 8 caracteres.' : PW.conf && PW.conf !== PW.nova ? 'As senhas não coincidem.' : '';
    const pwOk = (!pwMe || PW.atual) && PW.nova.length >= 8 && PW.conf === PW.nova;
    const openPwd = m => this.setState({ modalPwd: m, userMenu: false, pwd: { atual: '', nova: '', conf: '' } });
    return {
      userMenu: S.userMenu, toggleUserMenu: () => this.setState(s => ({ userMenu: !s.userMenu })), closeUserMenu: () => this.setState({ userMenu: false }),
      openMyPwd: () => openPwd('me'), openResetPwd: () => openPwd('reset'),
      pwdOpen: !!PWm, pwdIsMe: pwMe,
      pwdTitle: pwMe ? 'Alterar minha senha' : 'Redefinir senha de ' + su.nome,
      pwdText: pwMe ? meU.email + ' · A nova senha vale a partir do próximo acesso.' : 'Defina uma nova senha inicial e informe-a pessoalmente ao funcionário. A senha anterior deixa de funcionar imediatamente.',
      pwdNovaLbl: pwMe ? 'Nova senha' : 'Nova senha inicial',
      pwd: PW, setPwAtual: setPW('atual'), setPwNova: setPW('nova'), setPwConf: setPW('conf'), pwErr, pwOpacity: pwOk ? '1' : '.45',
      closePwd: () => this.setState({ modalPwd: null }),
      savePwd: () => { if (!pwOk) return; this.setState({ modalPwd: null }); this.flash(pwMe ? 'Sua senha foi alterada.' : 'Senha de ' + su.nome + ' redefinida. Informe-a pessoalmente.'); },
      hasCatEdit: !!CE, ce: CE ? { ...CE, titulo: CE.id ? 'Editar categoria' : 'Nova categoria', err: ceErr, isNew: !CE.id, curtoN: (CE.curto || '').length + '/24', modTxt: CE.mod ? 'Última alteração por ' + CE.mod.por + ' em ' + CE.mod.em : '' } : {}, ceOpacity: ceErr ? '.45' : '1',
      setCeNome: setCE('nome'), setCeDesc: setCE('desc'), setCeCurto: setCE('curto'),
      newCat: () => this.setState({ catEdit: { id: null, nome: '', desc: '', curto: '' } }),
      editCat: () => this.setState({ catEdit: { id: curCat.id, nome: curCat.nome, desc: curCat.desc || '', curto: curCat.curto || '', mod: curCat.mod } }),
      closeCat: () => this.setState({ catEdit: null }),
      saveCat: () => {
        if (ceErr) return;
        if (CE.id) { this.setState(s => ({ cats: s.cats.map(c => c.id === CE.id ? { ...c, nome: CE.nome.trim(), desc: CE.desc.trim(), curto: CE.curto.trim(), mod: { por: this.me().nome, em: br(TODAY) } } : c), catEdit: null })); this.flash('Categoria atualizada.'); }
        else { const id = 'c' + Date.now(); this.setState(s => ({ cats: [...s.cats, { id, nome: CE.nome.trim(), desc: CE.desc.trim(), curto: CE.curto.trim(), ativa: true, mod: { por: this.me().nome, em: br(TODAY) } }], catEdit: null, selCat: id })); this.flash('Categoria criada no fim da lista. Adicione perguntas a ela.'); }
      },
      isConteudo: scr === 'conteudo', catsVm, curCat: { ...(curCat || {}), toggleLbl: curCat && curCat.ativa ? 'Desativar categoria' : 'Ativar categoria', stL: badge(curCat && curCat.ativa).l, stBg: badge(curCat && curCat.ativa).bg, stFg: badge(curCat && curCat.ativa).fg },
      toggleCat: () => { this.setState(s => ({ cats: s.cats.map(c => c.id === S.selCat ? { ...c, ativa: !c.ativa, mod: { por: this.me().nome, em: br(TODAY) } } : c) })); this.flash(curCat.ativa ? 'Categoria desativada. Suas perguntas deixam de aparecer no chatbot.' : 'Categoria ativada.'); },
      qsVm, qsEmpty: !qsVm.length, qSearching, notQSearching: !qSearching, qBusca: S.qBusca, setQBusca: e => this.setState({ qBusca: e.target.value }), clearQBusca: () => this.setState({ qBusca: '' }),
      qEmptyTxt: qSearching ? 'Nenhuma pergunta encontrada para “' + S.qBusca.trim() + '”.' : 'Nenhuma pergunta nesta categoria.',
      qResultTxt: qSearching ? qsVm.length + (qsVm.length === 1 ? ' pergunta encontrada' : ' perguntas encontradas') + ' em todas as categorias' : '',
      catTooMany: !qSearching && actQ.length > 10, catsTooMany: visCats.length > 10,
      curCatMod: curCat && curCat.mod ? 'Última alteração por ' + curCat.mod.por + ' em ' + curCat.mod.em : '',
      previewQ: S.previewQ, openPreviewQ: () => this.setState({ previewQ: true }), closePreviewQ: () => this.setState({ previewQ: false }),
      newQ: () => this.setState({ editQ: { id: null, cat: S.selCat, curto: '', descCurta: '', texto: '', resposta: '', base: '', docs: [], presencial: false, nota: '', fora: false, ativa: true, ai: true }, newDocQ: '', previewQ: false }),
      hasEditQ: !!E, eq, closeQ: () => this.setState({ editQ: null }),
      newDocQ: S.newDocQ, setNewDocQ: e => this.setState({ newDocQ: e.target.value }),
      addDocQ: () => { const t = S.newDocQ.trim(); if (!t) return; this.setState(s => ({ editQ: { ...s.editQ, docs: [...s.editQ.docs, t] }, newDocQ: '' })); },
      saveQ: () => { if (eq.err) return this.flash(eq.err); const E2 = { ...E, mod: modNow(), ai: !!E.ai && !E.fora }; this.setState(s => ({ qs: E.id ? s.qs.map(x => x.id === E.id ? E2 : x) : [...s.qs, { ...E2, id: 'q' + (s.qs.length + 1) + 'n' }], previewQ: false, editQ: null })); this.flash(E.id ? 'Pergunta atualizada.' : 'Pergunta criada.'); },

      isSessoes: scr === 'sessoes', ...sessVals,
      hasSelSess: !!ss, ss: ssVm, closeSess: () => this.setState({ selSess: null }),

      isRelatorios: scr === 'relatorios', rep, rtip, repPerChips, barsTitle: weekly ? 'Conversas e agendamentos por semana' : 'Conversas e agendamentos por dia',
      repPeriodoTxt: 'Uso do chatbot e dos agendamentos presenciais · ' + perTxt + (rFim === TODAY ? ' (hoje até agora)' : ''),
      repCustom: S.repPeriodo === 'custom', repIni: S.repIni, repFim: S.repFim, repMax: TODAY,
      setRepIni: e => this.setState({ repIni: e.target.value }), setRepFim: e => this.setState({ repFim: e.target.value }),
      goConteudoRep: () => { this.setState({ selCat: this.q('q9').cat }); this.go('conteudo'); },
      expMenu: S.expMenu, toggleExpMenu: () => this.setState(s => ({ expMenu: !s.expMenu })), closeExpMenu: () => this.setState({ expMenu: false }),
      expFormats: Object.keys(FMT).map(k => ({ l: FMT[k][0], d: FMT[k][1], pick: () => this.setState({ expMenu: false, expFmt: k, expGen: false }) })),
      expOpen: !!EF, exp, runExp, closeExp: () => !S.expGen && this.setState({ expFmt: null }),
      expBar: React.createElement('div', { style: { height: '100%', width: '40%', background: '#483D8B', borderRadius: 99, animation: 'pcjbar 1s ease-in-out infinite' } }),

      ...(() => {
        const AG = this.agendaInfo(S.appts, pickCfg(H)); const map = {}; AG.days.forEach(x => map[x.d] = x);
        const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const m0 = dt(TODAY.slice(0, 8) + '01'); m0.setMonth(m0.getMonth() + S.prevMes); const mIso = isoOf(m0);
        const lastM = dt(AG.end.slice(0, 8) + '01'); const maxOff = (lastM.getFullYear() - dt(TODAY).getFullYear()) * 12 + lastM.getMonth() - dt(TODAY).getMonth();
        const mEnd = (() => { const x = dt(mIso); x.setMonth(x.getMonth() + 1); x.setDate(0); return isoOf(x); })();
        const g0 = addDays(mIso, -dt(mIso).getDay()); const g1 = addDays(mEnd, 6 - dt(mEnd).getDay());
        const firstOpen = (AG.days.find(x => x.st === 'aberto' && x.u < x.cap) || AG.days.find(x => x.st === 'aberto') || {}).d || TODAY;
        const selD = S.prevDia || firstOpen;
        const cells = []; for (let d = g0; d <= g1; d = addDays(d, 1)) {
          const x = map[d]; const inMonth = d.slice(0, 7) === mIso.slice(0, 7); const sel = d === selD; const num = String(+d.slice(8));
          let lbl = '', bg = '#F7F6FA', fg = '#8A869C', bd = '#ECEAF2', tip = br(d);
          if (!x) { lbl = ''; tip += d < TODAY ? ' · Data passada' : ' · Fora da janela de agendamento'; }
          else if (x.st === 'aberto') { const liv = x.cap - x.u; lbl = liv > 0 ? String(liv) : 'Lotado'; bg = liv > 0 ? '#EEEBFA' : '#FCEFD6'; fg = liv > 0 ? '#2E2757' : '#7A4F00'; bd = liv > 0 ? '#C9C2E6' : '#E9C98A'; tip += ' · ' + x.n + ' horários · ' + liv + ' de ' + x.cap + ' vagas livres' + (x.desc ? ' · ' + x.desc : ''); }
          else if (x.st === 'antecedencia') { lbl = ''; bg = 'repeating-linear-gradient(135deg,#F1EFF6 0 4px,#E4E1EE 4px 8px)'; fg = '#55516A'; bd = '#E4E1EE'; tip += ' · Antes da antecedência mínima'; }
          else if (x.st === 'bloqueado') { lbl = '✕'; bg = '#FAE3E0'; fg = '#8E2C22'; bd = '#EBC7C2'; tip += ' · ' + x.desc; }
          else if (x.st === 'encerrado') { lbl = ''; tip += ' · Horários de hoje já passaram'; }
          else { tip += ' · Sem atendimento'; }
          cells.push({ num, lbl, bg, fg, tip, op: inMonth ? '1' : '.35', fw: d === TODAY ? '800' : '600', bd: sel ? '#483D8B' : d === TODAY ? '#8A84AB' : bd, bw: sel ? '2px' : '1px', cur: inMonth ? 'pointer' : 'default', pick: () => inMonth && this.setState({ prevDia: d }) });
        }
        const sx = map[selD]; const allSl = this.slotsOnDate(selD, H); const nowT = NOW.slice(11);
        const stMap = { aberto: ['Oferecido pelo chatbot', '#1B6138'], antecedencia: ['Antes da antecedência mínima · não oferecido', '#55516A'], bloqueado: ['Bloqueado · ' + ((sx && sx.desc) || ''), '#8E2C22'], encerrado: ['Horários de hoje já passaram', '#6B6780'], fechado: ['Sem atendimento neste dia', '#6B6780'] };
        const stx = sx ? stMap[sx.st] : [selD < TODAY ? 'Data passada' : 'Fora da janela de agendamento · não oferecido', '#6B6780'];
        const diaSel = { titulo: WD[dt(selD).getDay()] + ', ' + br(selD), status: stx[0], stFg: stx[1],
          slots: allSl.map(t => { const used = S.appts.filter(a => a.data === selD && a.hora === t && (a.status === 'pendente' || a.status === 'confirmado')).length; const liv = Math.max(0, H.vagas - used); const past = selD === TODAY && t <= nowT;
            return { t, livres: past ? 'Já passou' : liv ? liv + ' de ' + H.vagas + ' livres' : 'Lotado', bg: past ? '#F7F6FA' : liv ? '#EEEBFA' : '#FCEFD6', bd: past ? '#ECEAF2' : liv ? '#C9C2E6' : '#E9C98A', fg: past ? '#8A869C' : liv ? '#2E2757' : '#7A4F00' }; }),
          nota: !allSl.length ? (sx && sx.st === 'bloqueado' ? '' : 'Nenhum horário configurado para este dia.') : (sx && sx.st === 'aberto' ? '' : 'Horários da grade para este dia. O chatbot não os oferece por estar ' + (sx ? (sx.st === 'antecedencia' ? 'antes da antecedência mínima.' : 'encerrado.') : 'fora da janela de agendamento.')) };
        diaSel.hasSlots = diaSel.slots.length > 0;
        const abertos = AG.days.filter(x => x.st === 'aberto');
        return { mesCells: cells, calHead: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(l => ({ l })), diaSel,
          calMesTxt: MESES[m0.getMonth()].charAt(0).toUpperCase() + MESES[m0.getMonth()].slice(1) + ' de ' + m0.getFullYear(),
          calPrev: () => S.prevMes > 0 && this.setState({ prevMes: S.prevMes - 1, prevDia: null }), calNext: () => S.prevMes < maxOff && this.setState({ prevMes: S.prevMes + 1, prevDia: null }),
          calPrevOp: S.prevMes > 0 ? '1' : '.35', calNextOp: S.prevMes < maxOff ? '1' : '.35',
          prevSub: 'Como o chatbot oferece horários hoje, de ' + brs(AG.start) + ' a ' + brs(AG.end) + ' (janela, antecedência e bloqueios). Clique em um dia para ver os horários.',
          totSemanaTxt: abertos.reduce((a, x) => a + x.n, 0) + ' horários · ' + AG.total + ' vagas na janela' };
      })(),
      lembreteOn: H.lembreteOn, lembreteLbl: H.lembreteOn ? 'Ativado' : 'Desativado', toggleLembrete: () => setH(c => ({ lembreteOn: !c.lembreteOn })),
      lembreteHoras: String(H.lembreteHoras), setLembreteHoras: e => { const v = +e.target.value; setH(() => ({ lembreteHoras: v })); },
      ...(() => {
        const ex = S.appts.find(a => a.id === 'A3F9C21B') || S.appts[0];
        const docs = [...ex.docsSent, ...ex.docsQSent];
        const end = H.endereco.trim() ? H.endereco.trim() + (H.enderecoCompl.trim() ? ' (' + H.enderecoCompl.trim() + ')' : '') : '[endereço não informado em Dados da unidade]';
        return {
          lembretePreview: 'Olá, ' + ex.nome.split(' ')[0] + '. Lembrete do seu atendimento no PROCON Jacareí: ' + WD[dt(ex.data).getDay()].toLowerCase() + ', ' + brs(ex.data) + ', às ' + ex.hora + ' (protocolo ' + ex.id + '). Endereço: ' + end + '. Traga: ' + docs.join('; ') + '. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem.',
          lembreteNota: 'Exemplo com o agendamento ' + ex.id + '. Os documentos do lembrete são os que foram enviados ao cidadão no momento do agendamento (a lista guardada em cada agendamento), não a configuração atual de Documentos.'
        };
      })(),
      endereco: H.endereco, enderecoCompl: H.enderecoCompl, setEndereco: e => { const v = e.target.value; setH(() => ({ endereco: v })); }, setEnderecoCompl: e => { const v = e.target.value; setH(() => ({ enderecoCompl: v })); },
      ...horVals, janela: String(H.janela), antecedencia: String(H.antecedencia), alertaEspera: String(H.alertaEspera),
      setJanela: e => { const v = Math.max(1, Math.min(180, +e.target.value || 1)); setH(() => ({ janela: v })); },
      setAntecedencia: e => { const v = +e.target.value; setH(() => ({ antecedencia: v })); },
      setAlertaEspera: e => { const v = Math.max(1, Math.min(60, +e.target.value || 1)); setH(() => ({ alertaEspera: v })); },
      isHorarios: scr === 'horarios', diasVm, preview,
      duracao: String(H.duracao), vagas: String(H.vagas),
      setDuracao: e => { const v = +e.target.value; setH(() => ({ duracao: v })); }, setVagas: e => { const v = Math.max(1, Math.min(20, +e.target.value || 1)); setH(() => ({ vagas: v })); },
      bloqVm, bloqEmpty: !bloqVm.length, newBlqData: S.newBlqData, newBlqDesc: S.newBlqDesc,
      setNewBlqData: e => this.setState({ newBlqData: e.target.value }), setNewBlqDesc: e => this.setState({ newBlqDesc: e.target.value }),

      isDocumentos: scr === 'documentos', ...docsVals,

      isUsuarios: scr === 'usuarios', usersVm, su: suVm, ...uSave, nuEmailErr, nuEmailBd: nuEmailErr ? '#C0392B' : '#D9D5E8',
      openNewUser: () => this.setState({ newUser: { nome: '', email: '', senha: '' } }), hasNewUser: !!NU, nu: NU || {},
      setNuNome: setNU('nome'), setNuEmail: setNU('email'), setNuSenha: setNU('senha'), nuOpacity: nuOk ? '1' : '.45',
      closeNewUser: () => this.setState({ newUser: null }),
      createUser: () => { if (!nuOk) return; const id = 'u' + Date.now(); const nu = { id, nome: NU.nome.trim(), email: NU.email.trim(), ativo: true, perms: [], lastAcc: null, permMod: { por: this.me().nome, em: br(TODAY) } }; this.setState(s => ({ users: [...s.users, nu], ud: s.ud ? { ...s.ud, users: [...s.ud.users, nu] } : null, newUser: null, selUser: id })); this.flash('Conta criada sem permissões. Marque as permissões abaixo.'); },

      isWhatsapp: scr === 'whatsapp' && isRoot, ...this.wzVals(S)
    };
  }
};
window.PCJ_LOGICA_OK = true;
