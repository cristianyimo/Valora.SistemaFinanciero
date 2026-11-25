import React, { useState, useEffect, useCallback } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

// Autenticación
import Login from './componentes/auth/Login'

// Componentes del Dashboard
import BarraSuperior from './componentes/barraSuperior/barraSuperior'
import ModalCliente from './componentes/botonesDeAccion/ModalesBotones/ModalClientes'
import ModalAgregarOpcionPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarOpcionPrestamo'
import ModalAgregarPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarPrestamo'
import ModalPago from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarPago'
import ModalDirectorio from './componentes/barraSuperior/modalDirectorio/ModalDirectorio'
import BotonesDeAccion from './componentes/botonesDeAccion/BotonesDeAccion'
import ModalFichaPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalFichaPrestamo'
import PanoramaEstadisticas from './componentes/PanoramaEstadisticas/PanoramaEstadisticas'
import ModalAdmin from './componentes/botonesDeAccion/ModalesBotones/ModalAdmin'
import RegistrosRecientes from './componentes/Registros/RegistrosRecientes'
import GraficoEstadistico from './componentes/PanoramaEstadisticas/GraficoEstadistico'
import ModalCobranzas from './componentes/Cobranzas/ModalCobranzas'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [avisoLogin, setAvisoLogin] = useState('')

  const [prestamoFicha, setPrestamoFicha] = useState(null)
  const [modalActivo, setModalActivo] = useState(null)
  const [versionCobros, setVersionCobros] = useState(0)
  const [perfilSeleccionadoId, setPerfilSeleccionadoId] = useState(null)
  const [modalFichaAbierta, setModalFichaAbierta] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // FUNCIÓN PARA REDIMENSIONAR LA VENTANA NATIVA DE TAURI
  const redimensionarVentana = useCallback(async (esDashboard) => {
    try {
      if (window.__TAURI__?.window) {
        const appWindow = window.__TAURI__.window.getCurrentWindow()
        if (esDashboard) {
          await appWindow.setSize({ type: 'Logical', width: 1280, height: 800 })
          await appWindow.center()
        } else {
          await appWindow.setSize({ type: 'Logical', width: 750, height: 500 })
          await appWindow.center()
        }
      }
    } catch (err) {
      console.warn('No se pudo redimensionar la ventana:', err)
    }
  }, [])

  // Carga completa del perfil del usuario
  const cargarPerfilUsuario = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUsuario(null)
      redimensionarVentana(false)
      return
    }

    try {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle()

      // Un usuario desactivado no puede ingresar al sistema
      if (profile && profile.activo === false) {
        // Diferido: llamar a auth dentro de onAuthStateChange puede bloquear supabase-js
        setTimeout(() => supabase.auth.signOut(), 0)
        setUsuario(null)
        setAvisoLogin('Tu cuenta está desactivada. Contactá al administrador.')
        redimensionarVentana(false)
        return
      }

      setAvisoLogin('')

      // Sin perfil en la tabla 'usuarios' se asigna el rol con menos privilegios
      const rolAsignado = profile?.rol || 'inversionista'
      const nombreAsignado = profile?.nombre_completo || profile?.nombre || sessionUser.email

      setUsuario({
        ...sessionUser,
        rol: rolAsignado,
        nombre: nombreAsignado
      })
      redimensionarVentana(true)
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      setUsuario({
        ...sessionUser,
        rol: 'inversionista',
        nombre: sessionUser.email
      })
      redimensionarVentana(true)
    }
  }, [redimensionarVentana])

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await cargarPerfilUsuario(session.user)
      } else {
        redimensionarVentana(false)
      }
      setCheckingAuth(false)
    })

    // 2. Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await cargarPerfilUsuario(session.user)
      } else {
        setUsuario(null)
        redimensionarVentana(false)
      }
      setCheckingAuth(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [cargarPerfilUsuario, redimensionarVentana])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    redimensionarVentana(false)
  }

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleAbrirFichaPrestamo = (prestamo) => {
    setPrestamoFicha(prestamo)
    setModalFichaAbierta(true)
  }

  const handleOpenDirectorioClientes = () => {
    setPerfilSeleccionadoId(null)
    setModalActivo('directorio')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-xs font-bold text-slate-400 space-y-2">
        <div className="w-8 h-8 border-3 border-[#0d6b63] border-t-transparent rounded-full animate-spin" />
        <span>Cargando...</span>
      </div>
    )
  }

  if (!usuario) {
    return <Login key={avisoLogin} avisoInicial={avisoLogin} onLoginSuccess={(u) => cargarPerfilUsuario(u)} />
  }

  const esAdmin = usuario.rol === 'admin' || usuario.rol === 'owner'

  return (
    <div key={`${usuario.id}-${usuario.rol}-${refreshKey}`} className="min-h-screen bg-paper pb-12 safe-pt safe-px">
      {/* Barra de usuario y Logout */}
      <div className="w-[95%] mx-auto pt-3 flex items-center justify-between text-xs font-medium text-slate-600 border-b border-line/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">{usuario.nombre}</span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              esAdmin ? 'bg-[#0d6b63]/10 text-[#0d6b63]' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {usuario.rol}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-line text-slate-600 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer font-bold shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <BarraSuperior rolUsuario={usuario?.rol} />

      <BotonesDeAccion
        rolUsuario={usuario?.rol}
        onOpenModal={(tipo) => setModalActivo(tipo)}
        onOpenClientes={handleOpenDirectorioClientes}
        onOpenCobranzas={() => setModalActivo('cobranzas')}
      />

      {/* Modales */}
      <ModalAdmin
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'admin'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
        usuarioLogueado={usuario}
      />

      <ModalCliente
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'cliente'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
        usuarioLogueado={usuario}
      />

      <ModalAgregarOpcionPrestamo
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'opcionPrestamo'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      <ModalAgregarPrestamo
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'prestamo'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
        usuarioLogueado={usuario}
      />

      <ModalPago
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'pago'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
        usuarioLogueado={usuario}
      />

      <ModalCobranzas
        isOpen={modalActivo === 'cobranzas'}
        version={versionCobros}
        onClose={() => setModalActivo(null)}
        onVerFichaPrestamo={handleAbrirFichaPrestamo}
      />

      <ModalDirectorio
        rolUsuario={usuario?.rol}
        isOpen={modalActivo === 'directorio'}
        itemInicialId={perfilSeleccionadoId}
        usuarioLogueado={usuario}
        onClose={() => {
          setModalActivo(null)
          setPerfilSeleccionadoId(null)
        }}
        onVerFichaPrestamo={handleAbrirFichaPrestamo}
      />

      <ModalFichaPrestamo
        rolUsuario={usuario?.rol}
        isOpen={modalFichaAbierta}
        onClose={() => {
          setModalFichaAbierta(false)
          setPrestamoFicha(null)
        }}
        prestamo={prestamoFicha}
        usuarioLogueado={usuario}
        onCobroRegistrado={() => setVersionCobros((v) => v + 1)}
      />

      {/* Métricas y Estadísticas */}
      {esAdmin && (
        <>
          <PanoramaEstadisticas rolUsuario={usuario?.rol} />
          <GraficoEstadistico />
        </>
      )}

      {/* Registros Recientes */}
      {usuario?.rol === 'owner' && (
        <RegistrosRecientes
          rolUsuario={usuario?.rol}
          onVerFichaPrestamo={handleAbrirFichaPrestamo}
          onAbrirCliente={(cliente) => {
            setPerfilSeleccionadoId(cliente?.id || null)
            setModalActivo('directorio')
          }}
        />
      )}
    </div>
  )
}