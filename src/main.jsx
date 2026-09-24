import React, {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {ArrowUpRight, Eye, EyeOff, LogOut, Pencil, Plus, Star, Trash2, X} from 'lucide-react';
import './styles.css';

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const MONTHS=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const fmt=d=>{if(!d)return ''; const [y,m,day]=d.split('-').map(Number);return `${String(day).padStart(2,'0')} ${MONTHS[m-1]} ${y}`};
const dateLabel=a=>{
  if(a.date_type==='annual') return String(new Date(a.start_date+'T12:00:00').getFullYear());
  if(!a.end_date) return fmt(a.start_date);
  const [sy,sm,sd]=a.start_date.split('-').map(Number),[ey,em,ed]=a.end_date.split('-').map(Number);
  return sy===ey ? (sm===em?`${String(sd).padStart(2,'0')}–${String(ed).padStart(2,'0')} ${MONTHS[sm-1]} ${sy}`:`${String(sd).padStart(2,'0')} ${MONTHS[sm-1]} — ${String(ed).padStart(2,'0')} ${MONTHS[em-1]} ${sy}`):`${fmt(a.start_date)} — ${fmt(a.end_date)}`;
};
const cover=a=>supabase.storage.from('album-covers').getPublicUrl(a.cover_path).data.publicUrl;
const Logo=()=> <div className="brand"><div className="mark">IBE</div><div><b>IGREJA BATISTA</b><span>EMANUEL</span></div></div>;

function PublicSite(){
 const [albums,setAlbums]=useState([]),[year,setYear]=useState(null);
 useEffect(()=>{supabase.from('albums').select('*').eq('is_visible',true).order('start_date',{ascending:false}).then(({data})=>{setAlbums(data||[]); if(data?.length)setYear(new Date(data[0].start_date+'T12:00:00').getFullYear())})},[]);
 const featured=albums.find(a=>a.is_featured);
 const years=[...new Set(albums.map(a=>new Date(a.start_date+'T12:00:00').getFullYear()))].sort((a,b)=>b-a);
 const shown=albums.filter(a=>new Date(a.start_date+'T12:00:00').getFullYear()===year);
 return <><header><Logo/><div className="toplabel">FOTOS</div></header>
 {featured?<section className="hero" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,.12)),url("${cover(featured)}")`}}><div className="heroText"><small>EM DESTAQUE</small><h1>{featured.title}</h1><p>{featured.description||'Registros da nossa vida em comunidade.'}</p><a className="lightBtn" href={featured.google_photos_url} target="_blank">VER ÁLBUM <ArrowUpRight size={16}/></a></div></section>:<section className="emptyHero"><h1>Nossa história em fotos.</h1><p>Os novos álbuns da IBE aparecerão aqui.</p></section>}
 <main><div className="eyebrow">NOSSA HISTÓRIA EM FOTOS</div><div className="sectionHead"><h2>Álbuns</h2><div className="years">{years.map(y=><button className={y===year?'active':''} onClick={()=>setYear(y)} key={y}>{y}</button>)}</div></div>
 <div className="grid">{shown.map(a=><a className="album" href={a.google_photos_url} target="_blank" key={a.id}><div className="photo"><img src={cover(a)}/><span>VER ÁLBUM →</span></div><h3>{a.title}</h3><p>{dateLabel(a)}</p></a>)}</div>
 <div className="googleCall"><div><b>Encontrou sua foto?</b><p>Abra o álbum no Google Fotos para visualizar e baixar as imagens.</p></div>{featured&&<a href={featured.google_photos_url} target="_blank">ACESSAR NO GOOGLE FOTOS <ArrowUpRight size={16}/></a>}</div>
 </main><footer><Logo/><span>Igreja Batista Emanuel · Várzea Grande — MT</span><a href="/admin">Administração</a></footer></>
}

const blank={title:'',description:'',date_type:'event',start_date:'',end_date:'',google_photos_url:'',is_visible:true,is_featured:false};
function Admin(){
 const [session,setSession]=useState(null),[albums,setAlbums]=useState([]),[form,setForm]=useState(null),[file,setFile]=useState(null),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false);
 const [email,setEmail]=useState('comunicacao@ibemanuelvg.com.br'),[password,setPassword]=useState('');
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));return supabase.auth.onAuthStateChange((_e,s)=>setSession(s)).data.subscription.unsubscribe},[]);
 const load=()=>supabase.from('albums').select('*').order('start_date',{ascending:false}).then(({data})=>setAlbums(data||[]));
 useEffect(()=>{if(session)load()},[session]);
 if(!session)return <div className="login"><Logo/><div className="loginBox"><div className="eyebrow">ADMINISTRAÇÃO</div><h1>Fotos IBE</h1><p>Entre para gerenciar os álbuns.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail"/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Senha"/><button onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alert(error.message)}}>Entrar</button></div></div>;
 const visible=albums.filter(a=>filter==='all'||(filter==='visible'?a.is_visible:!a.is_visible));
 async function save(){
  if(!form.title||!form.start_date||!form.google_photos_url){alert('Preencha título, data e link do Google Fotos.');return}
  setBusy(true); let cover_path=form.cover_path;
  if(file){const ext=file.name.split('.').pop().toLowerCase();cover_path=`${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('album-covers').upload(cover_path,file,{contentType:file.type});if(error){alert(error.message);setBusy(false);return}}
  if(!cover_path){alert('Escolha uma imagem de capa.');setBusy(false);return}
  const payload={title:form.title.trim(),description:form.description?.trim()||null,date_type:form.date_type,start_date:form.start_date,end_date:form.date_type==='annual'?null:(form.end_date||null),google_photos_url:form.google_photos_url.trim(),cover_path,is_visible:form.is_visible,is_featured:form.is_featured};
  let res=form.id?await supabase.from('albums').update(payload).eq('id',form.id):await supabase.from('albums').insert(payload);
  if(res.error)alert(res.error.message);else{setForm(null);setFile(null);load()} setBusy(false);
 }
 async function patch(id,p){const {error}=await supabase.from('albums').update(p).eq('id',id);if(error)alert(error.message);else load()}
 async function remove(a){if(confirm(`Excluir "${a.title}" do site? O álbum no Google Fotos não será apagado.`)){await supabase.from('albums').delete().eq('id',a.id);if(a.cover_path)await supabase.storage.from('album-covers').remove([a.cover_path]);load()}}
 return <div className="admin"><aside><Logo/><nav><b>Álbuns</b></nav><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sair</button></aside><section className="adminMain"><div className="adminTitle"><div><div className="eyebrow">FOTOS · ADMINISTRAÇÃO</div><h1>Álbuns</h1><p>Gerencie os álbuns que aparecem no site público.</p></div><button className="darkBtn" onClick={()=>setForm({...blank})}><Plus size={17}/> Novo álbum</button></div>
 <div className="tabs"><button onClick={()=>setFilter('all')} className={filter==='all'?'on':''}>Todos ({albums.length})</button><button onClick={()=>setFilter('visible')} className={filter==='visible'?'on':''}>Visíveis ({albums.filter(a=>a.is_visible).length})</button><button onClick={()=>setFilter('hidden')} className={filter==='hidden'?'on':''}>Ocultos ({albums.filter(a=>!a.is_visible).length})</button></div>
 <div className="table">{visible.map(a=><div className="row" key={a.id}><img src={cover(a)}/><div className="rowName"><b>{a.title}</b><small>{dateLabel(a)}</small></div><span className={a.is_visible?'badge':'badge off'}>{a.is_visible?'Visível':'Oculto'}</span><button title="Destaque" className={a.is_featured?'star activeStar':'star'} onClick={()=>patch(a.id,{is_featured:!a.is_featured,is_visible:a.is_featured?a.is_visible:true})}><Star size={18}/></button><div className="actions"><button onClick={()=>setForm({...a})}><Pencil size={17}/></button><button onClick={()=>patch(a.id,{is_visible:!a.is_visible})}>{a.is_visible?<EyeOff size={17}/>:<Eye size={17}/>}</button><button className="danger" onClick={()=>remove(a)}><Trash2 size={17}/></button></div></div>)}</div>
 </section>{form&&<div className="drawer"><div className="drawerHead"><div><div className="eyebrow">{form.id?'EDITAR':'NOVO'} ÁLBUM</div><h2>{form.id?'Editar álbum':'Novo álbum'}</h2></div><button onClick={()=>setForm(null)}><X/></button></div><label>Título *<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Descrição<textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Tipo de data<select value={form.date_type} onChange={e=>setForm({...form,date_type:e.target.value})}><option value="event">Evento</option><option value="annual">Álbum anual</option></select></label><div className="two"><label>Data inicial *<input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>{form.date_type==='event'&&<label>Data final<input type="date" value={form.end_date||''} onChange={e=>setForm({...form,end_date:e.target.value})}/></label>}</div><label>Link do Google Fotos *<input type="url" value={form.google_photos_url} onChange={e=>setForm({...form,google_photos_url:e.target.value})}/></label><label>Capa *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files[0])}/><small>JPG, PNG ou WebP · recomendado 16:9 · até 5 MB</small></label><label className="switch"><input type="checkbox" checked={form.is_visible} onChange={e=>setForm({...form,is_visible:e.target.checked,is_featured:e.target.checked?form.is_featured:false})}/><span/> Visível no site público</label><label className="switch"><input type="checkbox" checked={form.is_featured} onChange={e=>setForm({...form,is_featured:e.target.checked,is_visible:e.target.checked?true:form.is_visible})}/><span/> Definir como álbum em destaque</label><div className="drawerActions"><button onClick={()=>setForm(null)}>Cancelar</button><button className="darkBtn" disabled={busy} onClick={save}>{busy?'Salvando...':'Salvar álbum'}</button></div></div>}</div>
}
function App(){return location.pathname.startsWith('/admin')?<Admin/>:<PublicSite/>}
createRoot(document.getElementById('root')).render(<App/>);
