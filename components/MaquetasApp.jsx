'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080808', surf: '#111', bord: '#1e1e1e',
  acc: '#e8a020', txt: '#f0ebe0', mut: '#888', fnt: '#555', dim: '#2a2a2a'
}
const mono = "'IBM Plex Mono', monospace"
const disp = "'Bebas Neue', sans-serif"
const base = "'Space Grotesk', sans-serif"

const aBtn = { background: C.acc, color: C.bg, border: 'none', padding: '.5rem 1.2rem', borderRadius: '4px', cursor: 'pointer', fontFamily: mono, fontSize: '.82rem', fontWeight: '500' }
const gBtn = { background: 'transparent', color: C.txt, border: `1px solid ${C.dim}`, padding: '.5rem 1.2rem', borderRadius: '4px', cursor: 'pointer', fontFamily: mono, fontSize: '.82rem' }
const inp = { width: '100%', background: '#0d0d0d', border: `1px solid ${C.bord}`, color: C.txt, padding: '.7rem 1rem', borderRadius: '4px', fontFamily: base, fontSize: '.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '.85rem' }
const lbl = { fontFamily: mono, fontSize: '.68rem', color: C.fnt, letterSpacing: '.15em', display: 'block', marginBottom: '.35rem' }

function Bars({ active, n = 26 }) {
  const h = Array.from({ length: n }, (_, i) => Math.round(6 + 18 * Math.sin(i / n * Math.PI) * (0.5 + 0.5 * Math.sin(i * 2.4))))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '28px' }}>
      {h.map((v, i) => (
        <div key={i} style={{
          width: '3px', height: `${v}px`, background: active ? C.acc : C.dim, borderRadius: '2px',
          animation: active ? `brc ${(0.45 + (i % 5) * 0.08).toFixed(2)}s ease-in-out ${(i * 0.025).toFixed(2)}s infinite alternate` : 'none'
        }} />
      ))}
    </div>
  )
}

function TrackRow({ m, playing, onPlay, onLike, liked, onDetail }) {
  const likesCount = Array.isArray(m.likes) ? m.likes.length : 0
  const cmtsCount = Array.isArray(m.comments) ? m.comments.length : 0
  const fecha = new Date(m.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.85rem 0', borderBottom: `1px solid ${C.bord}` }}>
      <button onClick={() => onPlay(m)} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, border: `1px solid ${playing ? C.acc : C.dim}`, background: playing ? C.acc : 'transparent', color: playing ? C.bg : C.fnt, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onDetail(m)}>
        <div style={{ fontWeight: '500', color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{m.title}</div>
        <div style={{ fontFamily: mono, fontSize: '.7rem', color: C.fnt }}>{fecha}</div>
      </div>
      <div style={{ width: '70px', flexShrink: 0 }}><Bars active={playing} n={14} /></div>
      <button onClick={() => onLike(m.id)} style={{ background: 'none', border: 'none', color: liked ? C.acc : C.fnt, fontFamily: mono, fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        ♥ {likesCount}
      </button>
      <div style={{ color: C.fnt, fontFamily: mono, fontSize: '.75rem', flexShrink: 0, cursor: 'pointer' }} onClick={() => onDetail(m)}>
        💬 {cmtsCount}
      </div>
    </div>
  )
}

export default function MaquetasApp() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [maquetas, setMaquetas] = useState([])
  const [selected, setSelected] = useState(null)
  const [userLiked, setUserLiked] = useState(new Set())
  const [playingId, setPlayingId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [newCmt, setNewCmt] = useState('')
  const [loginF, setLoginF] = useState({ email: '', pass: '' })
  const [regF, setRegF] = useState({ name: '', email: '', pass: '' })
  const [upF, setUpF] = useState({ title: '', desc: '', file: null })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const audioRef = useRef(null)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadProfile(session.user.id) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      if (s) { setUser(s.user); loadProfile(s.user.id) }
      else { setUser(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { loadMaquetas() }, [])

  useEffect(() => {
    if (user && maquetas.length > 0) {
      const liked = new Set(maquetas.flatMap(m =>
        (m.likes || []).filter(l => l.user_id === user.id).map(() => m.id)
      ))
      setUserLiked(liked)
    }
  }, [maquetas, user])

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }

  async function loadMaquetas() {
    const { data } = await supabase
      .from('maquetas')
      .select('*, profiles(username), likes(id, user_id), comments(id)')
      .order('created_at', { ascending: false })
    if (data) setMaquetas(data)
  }

  async function loadDetail(id) {
    const { data } = await supabase
      .from('maquetas')
      .select('*, profiles(username), likes(id, user_id), comments(id, content, created_at, profiles(username))')
      .eq('id', id).single()
    if (data) setSelected(data)
  }

  async function doLogin() {
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginF.email, password: loginF.pass })
    setBusy(false)
    if (error) { setErr('Email o contraseña incorrectos'); return }
    setLoginF({ email: '', pass: '' }); loadMaquetas(); setView('maquetas')
  }

  async function doRegister() {
    if (!regF.name.trim()) { setErr('Ingresa tu nombre'); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.auth.signUp({ email: regF.email, password: regF.pass })
    if (error) { setBusy(false); setErr(error.message); return }
    if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, username: regF.name })
    setBusy(false); setRegF({ name: '', email: '', pass: '' }); loadMaquetas(); setView('maquetas')
  }

  async function doLogout() {
    await supabase.auth.signOut()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setPlayingId(null); setIsPlaying(false); setView('home'); loadMaquetas()
  }

  async function toggleLike(maquetaId) {
    if (!user) { setView('login'); return }
    if (userLiked.has(maquetaId)) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('maqueta_id', maquetaId)
      setUserLiked(p => { const n = new Set(p); n.delete(maquetaId); return n })
    } else {
      await supabase.from('likes').insert({ user_id: user.id, maqueta_id: maquetaId })
      setUserLiked(p => new Set([...p, maquetaId]))
    }
    loadMaquetas()
    if (selected?.id === maquetaId) loadDetail(maquetaId)
  }

  async function sendComment() {
    if (!user || !newCmt.trim()) return
    await supabase.from('comments').insert({ user_id: user.id, maqueta_id: selected.id, content: newCmt })
    setNewCmt(''); loadDetail(selected.id); loadMaquetas()
  }

  async function doUpload() {
    if (!upF.title.trim()) return
    setBusy(true)
    let audioUrl = null
    if (upF.file) {
      const fname = `${Date.now()}-${upF.file.name}`
      const { error: eUp } = await supabase.storage.from('maquetas').upload(fname, upF.file)
      if (!eUp) {
        const { data: ud } = supabase.storage.from('maquetas').getPublicUrl(fname)
        audioUrl = ud.publicUrl
      }
    }
    await supabase.from('maquetas').insert({ title: upF.title, description: upF.desc, audio_url: audioUrl, artist_id: user.id })
    setBusy(false); setUpF({ title: '', desc: '', file: null }); loadMaquetas(); setView('maquetas')
  }

  function handlePlay(m) {
    if (!m.audio_url) return
    if (playingId === m.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
      else { audioRef.current?.play(); setIsPlaying(true) }
    } else {
      setPlayingId(m.id); setIsPlaying(true)
      if (audioRef.current) { audioRef.current.src = m.audio_url; audioRef.current.play() }
    }
  }

  const goView = (v) => { setView(v); setErr('') }
  const isArtist = profile?.is_artist
  const totalLikes = maquetas.reduce((a, m) => a + (m.likes || []).length, 0)
  const totalCmts = maquetas.reduce((a, m) => a + (m.comments || []).length, 0)
  const artName = profile?.username || 'TU NOMBRE'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.txt, fontFamily: base }}>
      <style>{`@keyframes brc { 0% { transform: scaleY(1) } 100% { transform: scaleY(1.7) } }`}</style>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderBottom: `1px solid ${C.bord}`, background: C.bg }}>
        <div style={{ fontFamily: disp, fontSize: '1.5rem', cursor: 'pointer', letterSpacing: '.04em' }} onClick={() => goView('home')}>{artName}</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: C.fnt, fontFamily: mono, fontSize: '.78rem' }} onClick={() => goView('maquetas')}>Maquetas</button>
          {user ? (
            <>
              {isArtist && <button style={aBtn} onClick={() => goView('upload')}>+ Subir</button>}
              <span style={{ fontFamily: mono, fontSize: '.75rem', color: C.fnt }}>@{profile?.username}</span>
              <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem' }} onClick={doLogout}>Salir</button>
            </>
          ) : (
            <>
              <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem' }} onClick={() => goView('login')}>Entrar</button>
              <button style={aBtn} onClick={() => goView('register')}>Registrarse</button>
            </>
          )}
        </div>
      </nav>

      {/* HOME */}
      {view === 'home' && (
        <div>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '4.5rem 1.5rem 2.5rem' }}>
            <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.65rem', letterSpacing: '.2em', marginBottom: '1.25rem' }}>DEMO PORTAL</div>
            <h1 style={{ fontFamily: disp, fontSize: 'clamp(3.5rem,13vw,8rem)', lineHeight: '.9', margin: '0 0 1.25rem', letterSpacing: '.02em' }}>{artName}</h1>
            <p style={{ color: C.mut, maxWidth: '440px', lineHeight: '1.7', marginBottom: '2.25rem' }}>Maquetas crudas, sin filtros. Ideas antes de que alguien las toque.</p>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button style={aBtn} onClick={() => goView('maquetas')}>Escuchar maquetas</button>
              {!user && <button style={gBtn} onClick={() => goView('register')}>Pedir acceso</button>}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.bord}`, borderBottom: `1px solid ${C.bord}` }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '2.5rem', padding: '1.25rem 1.5rem' }}>
              {[{ n: maquetas.length, l: 'MAQUETAS' }, { n: totalLikes, l: 'LIKES' }, { n: totalCmts, l: 'COMENTARIOS' }].map(({ n, l }) => (
                <div key={l}><div style={{ fontFamily: disp, fontSize: '2rem', color: C.acc }}>{n}</div><div style={{ fontFamily: mono, fontSize: '.62rem', color: C.fnt, letterSpacing: '.12em' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2.25rem 1.5rem' }}>
            <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.2em', marginBottom: '1.1rem' }}>ÚLTIMAS SUBIDAS</div>
            {maquetas.slice(0, 3).map(m => (
              <TrackRow key={m.id} m={m} playing={playingId === m.id && isPlaying} onPlay={handlePlay} onLike={toggleLike} liked={userLiked.has(m.id)} onDetail={async (m) => { await loadDetail(m.id); goView('detail') }} />
            ))}
          </div>
        </div>
      )}

      {/* MAQUETAS LIST */}
      {view === 'maquetas' && (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem' }}>
            <div>
              <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.2em', marginBottom: '.35rem' }}>ARCHIVO</div>
              <h2 style={{ fontFamily: disp, fontSize: '2.6rem', margin: 0 }}>{maquetas.length} Maquetas</h2>
            </div>
            {isArtist && <button style={aBtn} onClick={() => goView('upload')}>+ Subir</button>}
          </div>
          {maquetas.map(m => (
            <TrackRow key={m.id} m={m} playing={playingId === m.id && isPlaying} onPlay={handlePlay} onLike={toggleLike} liked={userLiked.has(m.id)} onDetail={async (m) => { await loadDetail(m.id); goView('detail') }} />
          ))}
          {maquetas.length === 0 && <p style={{ color: C.fnt, fontFamily: mono, fontSize: '.8rem' }}>Aún no hay maquetas.</p>}
        </div>
      )}

      {/* DETAIL */}
      {view === 'detail' && selected && (
        <div style={{ maxWidth: '660px', margin: '0 auto', padding: '2.25rem 1.5rem' }}>
          <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem', marginBottom: '1.75rem' }} onClick={() => goView('maquetas')}>← Volver</button>
          <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.15em', marginBottom: '.35rem' }}>
            {new Date(selected.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <h1 style={{ fontFamily: disp, fontSize: 'clamp(2.5rem,8vw,4.5rem)', lineHeight: '1', margin: '0 0 .75rem' }}>{selected.title}</h1>
          {selected.description && <p style={{ color: C.mut, lineHeight: '1.65', marginBottom: '1.75rem' }}>{selected.description}</p>}
          <div style={{ background: C.surf, border: `1px solid ${C.bord}`, borderRadius: '8px', padding: '1.1rem 1.3rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '.5rem' }}>
              <button onClick={() => handlePlay(selected)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: selected.audio_url ? C.acc : C.dim, border: 'none', color: C.bg, fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {playingId === selected.id && isPlaying ? '⏸' : '▶'}
              </button>
              <div style={{ flex: 1 }}><Bars active={playingId === selected.id && isPlaying} /></div>
            </div>
            <div style={{ fontFamily: mono, fontSize: '.65rem', color: C.dim, letterSpacing: '.1em' }}>
              {selected.audio_url ? (playingId === selected.id && isPlaying ? '▶ REPRODUCIENDO' : '— PAUSADO') : 'SIN ARCHIVO DE AUDIO'}
            </div>
          </div>
          <button onClick={() => toggleLike(selected.id)} style={{ background: userLiked.has(selected.id) ? `${C.acc}18` : 'transparent', border: `1px solid ${userLiked.has(selected.id) ? C.acc : C.dim}`, color: userLiked.has(selected.id) ? C.acc : C.mut, padding: '.5rem 1.25rem', borderRadius: '4px', cursor: 'pointer', fontFamily: mono, fontSize: '.82rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ♥ {userLiked.has(selected.id) ? 'Te gustó' : 'Me gusta'} · {(selected.likes || []).length}
          </button>
          <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.15em', marginBottom: '1.1rem' }}>
            COMENTARIOS ({(selected.comments || []).length})
          </div>
          {(selected.comments || []).length === 0 && <p style={{ color: C.dim, fontFamily: mono, fontSize: '.8rem', marginBottom: '1.25rem' }}>Sin comentarios aún.</p>}
          {(selected.comments || []).map(c => (
            <div key={c.id} style={{ padding: '.85rem 0', borderBottom: `1px solid ${C.bord}` }}>
              <div style={{ fontFamily: mono, fontSize: '.73rem', color: C.acc, marginBottom: '4px' }}>
                @{c.profiles?.username} <span style={{ color: C.fnt, marginLeft: '8px' }}>{new Date(c.created_at).toLocaleDateString('es-CL')}</span>
              </div>
              <div style={{ color: '#ccc', lineHeight: '1.55', fontSize: '.93rem' }}>{c.content}</div>
            </div>
          ))}
          <div style={{ marginTop: '1.5rem' }}>
            {user ? (
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <input value={newCmt} onChange={e => setNewCmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()} placeholder={`Comenta como @${profile?.username}...`} style={{ ...inp, marginBottom: 0, flex: 1 }} />
                <button style={aBtn} onClick={sendComment}>Enviar</button>
              </div>
            ) : (
              <div style={{ background: C.surf, border: `1px solid ${C.bord}`, borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ color: C.mut, marginBottom: '.85rem', fontSize: '.88rem' }}>Inicia sesión para comentar</p>
                <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
                  <button style={aBtn} onClick={() => goView('login')}>Entrar</button>
                  <button style={gBtn} onClick={() => goView('register')}>Registrarse</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGIN */}
      {view === 'login' && (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem', marginBottom: '1.75rem' }} onClick={() => goView('home')}>← Volver</button>
          <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.2em', marginBottom: '.35rem' }}>ACCESO</div>
          <h2 style={{ fontFamily: disp, fontSize: '2.6rem', margin: '0 0 1.75rem' }}>Iniciar sesión</h2>
          {err && <div style={{ background: '#ff000015', border: '1px solid #ff333333', color: '#ff6666', padding: '.6rem 1rem', borderRadius: '4px', fontFamily: mono, fontSize: '.78rem', marginBottom: '1rem' }}>{err}</div>}
          <span style={lbl}>EMAIL</span>
          <input style={inp} placeholder="tu@email.com" value={loginF.email} onChange={e => setLoginF({ ...loginF, email: e.target.value })} />
          <span style={lbl}>CONTRASEÑA</span>
          <input style={inp} type="password" placeholder="••••••••" value={loginF.pass} onChange={e => setLoginF({ ...loginF, pass: e.target.value })} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          <button style={{ ...aBtn, width: '100%', padding: '.75rem', fontSize: '.88rem' }} onClick={doLogin} disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
          <p style={{ textAlign: 'center', color: C.fnt, marginTop: '1.1rem', fontSize: '.8rem', fontFamily: mono }}>
            ¿No tienes cuenta? <span style={{ color: C.acc, cursor: 'pointer' }} onClick={() => goView('register')}>Regístrate</span>
          </p>
        </div>
      )}

      {/* REGISTER */}
      {view === 'register' && (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem', marginBottom: '1.75rem' }} onClick={() => goView('home')}>← Volver</button>
          <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.2em', marginBottom: '.35rem' }}>ACCESO</div>
          <h2 style={{ fontFamily: disp, fontSize: '2.6rem', margin: '0 0 1.75rem' }}>Crear cuenta</h2>
          {err && <div style={{ background: '#ff000015', border: '1px solid #ff333333', color: '#ff6666', padding: '.6rem 1rem', borderRadius: '4px', fontFamily: mono, fontSize: '.78rem', marginBottom: '1rem' }}>{err}</div>}
          <span style={lbl}>TU NOMBRE O ALIAS</span>
          <input style={inp} placeholder="¿Cómo te llaman?" value={regF.name} onChange={e => setRegF({ ...regF, name: e.target.value })} />
          <span style={lbl}>EMAIL</span>
          <input style={inp} placeholder="tu@email.com" value={regF.email} onChange={e => setRegF({ ...regF, email: e.target.value })} />
          <span style={lbl}>CONTRASEÑA</span>
          <input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={regF.pass} onChange={e => setRegF({ ...regF, pass: e.target.value })} onKeyDown={e => e.key === 'Enter' && doRegister()} />
          <button style={{ ...aBtn, width: '100%', padding: '.75rem', fontSize: '.88rem' }} onClick={doRegister} disabled={busy}>{busy ? 'Creando...' : 'Crear cuenta'}</button>
          <p style={{ textAlign: 'center', color: C.fnt, marginTop: '1.1rem', fontSize: '.8rem', fontFamily: mono }}>
            ¿Ya tienes cuenta? <span style={{ color: C.acc, cursor: 'pointer' }} onClick={() => goView('login')}>Inicia sesión</span>
          </p>
        </div>
      )}

      {/* UPLOAD */}
      {view === 'upload' && isArtist && (
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2.25rem 1.5rem' }}>
          <button style={{ ...gBtn, padding: '.4rem .9rem', fontSize: '.75rem', marginBottom: '1.75rem' }} onClick={() => goView('maquetas')}>← Volver</button>
          <div style={{ fontFamily: mono, color: C.fnt, fontSize: '.62rem', letterSpacing: '.2em', marginBottom: '.35rem' }}>ARTISTA</div>
          <h2 style={{ fontFamily: disp, fontSize: '2.6rem', margin: '0 0 1.75rem' }}>Subir maqueta</h2>
          <span style={lbl}>TÍTULO *</span>
          <input style={inp} placeholder="Nombre del track" value={upF.title} onChange={e => setUpF({ ...upF, title: e.target.value })} />
          <span style={lbl}>DESCRIPCIÓN</span>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Cuéntales de qué va..." value={upF.desc} onChange={e => setUpF({ ...upF, desc: e.target.value })} />
          <span style={lbl}>ARCHIVO DE AUDIO</span>
          <div style={{ border: `2px dashed ${C.dim}`, borderRadius: '8px', padding: '1.75rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '.4rem' }}>🎵</div>
            <div style={{ fontFamily: mono, fontSize: '.75rem', color: C.fnt }}>{upF.file ? upF.file.name : 'MP3, WAV, FLAC'}</div>
            <label style={{ display: 'inline-block', marginTop: '.85rem', ...gBtn }}>
              Elegir archivo
              <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => setUpF({ ...upF, file: e.target.files[0] })} />
            </label>
          </div>
          <button style={{ ...aBtn, width: '100%', padding: '.75rem', fontSize: '.88rem' }} onClick={doUpload} disabled={busy}>{busy ? 'Subiendo...' : 'Publicar maqueta'}</button>
        </div>
      )}
    </div>
  )
}