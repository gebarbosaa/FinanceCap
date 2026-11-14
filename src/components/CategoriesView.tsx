import React, { useMemo, useState } from 'react';
import { Archive, Check, Edit3, Plus, Tags, X } from 'lucide-react';
import { Category, Transaction } from '../types/finance';
import { BRAND_CATEGORY_PALETTE, getBrandCategoryColor } from '../utils/brandPalette';

interface Props {
  categories: Category[];
  transactions: Transaction[];
  onAdd: (category: Omit<Category, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onArchive: (id: string) => void;
}

const palette = [...BRAND_CATEGORY_PALETTE];

export const CategoriesView: React.FC<Props> = ({ categories, transactions, onAdd, onUpdate, onArchive }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [cor, setCor] = useState(palette[0]);
  const [limite, setLimite] = useState('');
  const [isGranaExtra, setIsGranaExtra] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useMemo(() => categories.filter(c => c.ativo !== false), [categories]);
  const visible = categories.filter(c => showArchived ? c.ativo === false : c.ativo !== false);
  const usage = (id: string) => transactions.filter(tx => tx.categoriaId === id && !tx.isDeleted).length;

  const reset = () => { setEditing(null); setNome(''); setTipo('DESPESA'); setCor(palette[0]); setLimite(''); setIsGranaExtra(false); setError(''); };
  const beginEdit = (category: Category) => {
    setEditing(category); setNome(category.nome); setTipo(category.tipo); setCor(getBrandCategoryColor(category.id, category.cor));
    setLimite(category.limiteMensalCentavos ? String(category.limiteMensalCentavos / 100) : '');
    setIsGranaExtra(Boolean(category.isGranaExtra)); setError('');
    document.getElementById('category-editor')?.scrollIntoView({ behavior: 'smooth' });
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      const payload: Omit<Category, 'id'> = {
        nome: nome.trim(), tipo, cor, icone: editing?.icone || 'Tags',
        limiteMensalCentavos: tipo === 'DESPESA' && limite.trim() ? Math.round(Number(limite.replace(',', '.')) * 100) : undefined,
        isGranaExtra: tipo === 'RECEITA' && isGranaExtra, ativo: true,
      };
      if (editing) { onUpdate(editing.id, payload); setNotice('Categoria atualizada.'); }
      else { onAdd(payload); setNotice('Categoria criada.'); }
      reset();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
  };
  const archive = (category: Category) => {
    if (category.id === 'cat-desp-12') { setError('Categoria reservada para liquidações internas.'); return; }
    if (!confirm('Arquivar "' + category.nome + '"? O histórico e os lançamentos existentes serão preservados.')) return;
    try { onArchive(category.id); setNotice('Categoria arquivada; histórico preservado.'); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível arquivar.'); }
  };

  return <div className="max-w-5xl mx-auto space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><div className="flex items-center gap-2 text-orange-600 dark:text-orange-300"><Tags size={20}/><span className="text-xs font-bold uppercase tracking-widest">Gestão financeira</span></div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Categorias</h2>
        <p className="text-sm text-slate-500 mt-1">Personalize receitas e despesas sem apagar o histórico.</p></div>
      <button onClick={() => { reset(); document.getElementById('category-editor')?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Nova categoria</button>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><p className="text-xs text-slate-500">Ativas</p><p className="text-2xl font-extrabold">{active.length}</p></div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><p className="text-xs text-slate-500">Receitas</p><p className="text-2xl font-extrabold text-emerald-600">{active.filter(c => c.tipo === 'RECEITA').length}</p></div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><p className="text-xs text-slate-500">Despesas</p><p className="text-2xl font-extrabold text-rose-600">{active.filter(c => c.tipo === 'DESPESA').length}</p></div>
    </div>
    <section id="category-editor" className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      <div className="flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">{editing ? 'Editar categoria' : 'Nova categoria'}</h3>{editing && <button onClick={reset} className="text-slate-400"><X size={18}/></button>}</div>
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="sm:col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Nome<input required maxLength={60} value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Saúde e bem-estar" className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-2.5 text-sm"/></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo<select value={tipo} onChange={e=>setTipo(e.target.value as 'RECEITA'|'DESPESA')} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-2.5 text-sm"><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Limite mensal (R$)<input inputMode="decimal" value={limite} onChange={e=>setLimite(e.target.value)} disabled={tipo==='RECEITA'} placeholder="Opcional" className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-2.5 text-sm disabled:opacity-40"/></label>
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-2">Cor:</span>{palette.map(color=><button key={color} type="button" aria-label={'Selecionar cor ' + color} onClick={()=>setCor(color)} className={'h-7 w-7 rounded-full border-2 ' + (cor===color?'border-slate-900 dark:border-white scale-110':'border-transparent')} style={{backgroundColor:color}}/>)}{tipo==='RECEITA' && <label className="ml-auto flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={isGranaExtra} onChange={e=>setIsGranaExtra(e.target.checked)}/> Marcar como Grana Extra</label>}</div>
        {error && <p className="sm:col-span-4 text-xs text-rose-600">{error}</p>}
        <div className="sm:col-span-4 flex justify-end gap-2"><button type="button" onClick={reset} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Limpar</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950"><Check size={15}/>{editing?'Salvar alterações':'Criar categoria'}</button></div>
      </form>
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}
    </section>
    <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900 dark:text-white">{showArchived?'Categorias arquivadas':'Categorias ativas'}</h3><button onClick={()=>setShowArchived(!showArchived)} className="text-xs font-semibold text-orange-600 dark:text-orange-300">{showArchived?'Ver ativas':'Ver arquivadas'}</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {visible.map(category=><article key={category.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <span className="h-10 w-10 rounded-xl flex-shrink-0" style={{backgroundColor:getBrandCategoryColor(category.id, category.cor)}}/>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{category.nome}</p><p className="text-xs text-slate-500">{category.tipo==='RECEITA'?'Receita':'Despesa'} · {usage(category.id)} lançamento(s){category.isGranaExtra?' · Grana Extra':''}</p></div>
        {category.ativo===false ? <><span className="text-[10px] font-bold text-slate-400">ARQUIVADA</span><button title="Reativar" onClick={()=>{ onUpdate(category.id, { ativo: true }); setNotice('Categoria reativada.'); }} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"><Check size={16}/></button></> : <><button title="Editar" onClick={()=>beginEdit(category)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit3 size={16}/></button><button title="Arquivar" onClick={()=>archive(category)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Archive size={16}/></button></>}
      </article>)}
      {visible.length===0 && <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nenhuma categoria nesta visualização.</p>}
    </div>
    <p className="text-xs text-slate-500">Arquivar não apaga lançamentos nem altera valores históricos. Categorias internas de liquidação permanecem protegidas.</p>
  </div>;
};
