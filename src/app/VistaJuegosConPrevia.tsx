"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

type ItemJuegoApp = {
  id: string | number; // <- Actualizado para soportar los UUID de tu backend
  title: string;
  slug: string;
  description?: string | null;
  item_type: "game" | "app";
  category: string;
  is_active: boolean;
  featured: boolean;
  target_url?: string | null;
  icon_url?: string | null;
};

type Props = {
  items?: ItemJuegoApp[];
  loading?: boolean;
  activeItems?: any[];
  activeLoading?: boolean;
  onToggle?: (item: { id: string }) => Promise<void>;
  onBulkActivate?: (slugs: string[], deactivateOthers?: boolean) => Promise<void>;
  onReorder?: (items: { slug: string; sort_order: number }[]) => Promise<void>;
};

export default function VistaJuegosConPrevia({ 
  items, 
  loading = false,
  activeItems,
  activeLoading,
  onToggle,
  onBulkActivate,
  onReorder
}: Props) {
  // Ahora usamos estrictamente los datos que vienen del backend
  const datosIniciales = useMemo(
    () => (items ? items : []),
    [items]
  );

  const [lista, setLista] = useState<ItemJuegoApp[]>(datosIniciales);
  // Protegemos el estado inicial por si el arreglo viene vacío
  const [seleccionadoId, setSeleccionadoId] = useState<string | number | null>(
    datosIniciales.length > 0 ? datosIniciales[0].id : null
  );
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | number | null>(null);
  const [errorPrevia, setErrorPrevia] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLista(datosIniciales);
    // Si la lista cambia y el seleccionado no existe en la nueva lista, seleccionar el primero
    if (datosIniciales.length > 0 && (!seleccionadoId || !datosIniciales.find(i => i.id === seleccionadoId))) {
      setSeleccionadoId(datosIniciales[0].id);
    } else if (datosIniciales.length === 0) {
      setSeleccionadoId(null);
    }
  }, [datosIniciales, seleccionadoId]);

  // Cerrar el desplegable al hacer clic fuera o con Escape.
  useEffect(() => {
    if (menuAbiertoId === null) return;
    const alHacerClic = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setMenuAbiertoId(null);
    };
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbiertoId(null);
    };
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [menuAbiertoId]);

  const activos = useMemo(() => lista.filter((i) => i.is_active), [lista]);

  const seleccionado =
    activos.find((i) => i.id === seleccionadoId) || activos[0] || null;

  // Si el juego seleccionado se desactiva, saltamos al primer activo disponible.
  useEffect(() => {
    if (activos.length === 0) return;
    if (!activos.find((i) => i.id === seleccionadoId)) {
      setSeleccionadoId(activos[0].id);
      setErrorPrevia(false);
    }
  }, [activos, seleccionadoId]);

  // Función modificada para conectarse a tu API
  const cambiarEstado = async (id: string | number, activar: boolean) => {
    if (onToggle) {
      // Llamado a la API
      await onToggle({ id: String(id) });
    } else {
      // Comportamiento local de fallback
      setLista((actual) =>
        actual.map((i) => (i.id === id ? { ...i, is_active: activar } : i))
      );
    }
    setMenuAbiertoId(null);
  };

  const seleccionar = (id: string | number) => {
    setSeleccionadoId(id);
    setErrorPrevia(false);
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-[14px] p-8 text-center text-xs text-gray-500 shadow-sm" style={{ borderColor: "var(--line)" }}>
        Cargando catálogo...
      </div>
    );
  }

  // Si no hay datos (porque falló el fetch o la DB está vacía) mostramos un mensaje claro
  if (!loading && lista.length === 0) {
    return (
      <div className="bg-white border rounded-[14px] p-8 text-center text-xs text-gray-500 shadow-sm" style={{ borderColor: "var(--line)" }}>
        No hay juegos ni aplicaciones disponibles. Revisa la conexión con el servidor.
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={contenedorRef}>
      {/* LISTA */}
      <div className="bg-white border rounded-[14px] shadow-sm overflow-hidden" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--line)" }}>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Juegos y aplicaciones</h3>
            <p className="text-[11px] text-[#8b95a3] mt-0.5">
              Selecciona un módulo para verlo abajo. Usa el menú para activarlo o desactivarlo.
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-400">{lista.length} módulos</span>
        </div>

        <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
          {lista.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 px-5 py-3 transition ${
                item.id === seleccionadoId ? "bg-blue-50/60 shadow-[inset_3px_0_0_#3b6fd4]" : "hover:bg-gray-50/70"
              }`}
            >
              <button onClick={() => seleccionar(item.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <span className="w-9 h-9 rounded-[10px] bg-[#eef1f6] flex items-center justify-center text-base flex-shrink-0">
                  {item.item_type === "game" ? "\u{1F3AE}" : "\u{1F4F1}"}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-gray-900 truncate">{item.title}</span>
                    {item.featured && <span className="text-amber-500 text-xs">{"\u2605"}</span>}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {item.category} {"\u00B7"} {item.slug}
                  </span>
                </span>
              </button>

              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                item.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                {item.is_active ? "Activo" : "Inactivo"}
              </span>

              {/* BOTÓN DESPLEGABLE */}
              <div className="relative">
                <button
                  onClick={() => setMenuAbiertoId(menuAbiertoId === item.id ? null : item.id)}
                  aria-haspopup="menu"
                  aria-expanded={menuAbiertoId === item.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-gray-600 bg-white hover:bg-gray-50 flex items-center gap-1.5"
                  style={{ borderColor: "var(--line)" }}
                >
                  Estado
                  <span className="text-[9px] text-gray-400">{"\u25BC"}</span>
                </button>

                {menuAbiertoId === item.id && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-30 overflow-hidden"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <button
                      role="menuitem"
                      onClick={() => cambiarEstado(item.id, true)}
                      disabled={item.is_active}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-emerald-50 text-emerald-700 font-semibold disabled:text-gray-300 disabled:hover:bg-white"
                    >
                      Activar
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => cambiarEstado(item.id, false)}
                      disabled={!item.is_active}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-red-50 text-red-600 font-semibold border-t disabled:text-gray-300 disabled:hover:bg-white"
                      style={{ borderColor: "var(--line)" }}
                    >
                      Desactivar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* SELECTOR DE JUEGOS ACTIVOS */}
      <div className="bg-white border rounded-[14px] shadow-sm overflow-hidden" style={{ borderColor: "var(--line)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <h4 className="text-sm font-bold text-gray-900">Previsualizar un módulo activo</h4>
          <p className="text-[11px] text-[#8b95a3] mt-0.5">
            Elige uno de los módulos que los usuarios pueden ver ahora mismo.
          </p>
        </div>

        {activos.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            No hay ningún módulo activo. Activa uno desde la lista de arriba.
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2 p-4">
            {activos.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setSeleccionadoId(item.id);
                    setErrorPrevia(false);
                  }}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                    seleccionado?.id === item.id
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                  style={seleccionado?.id !== item.id ? { borderColor: "var(--line)" } : undefined}
                >
                  <span>{item.item_type === "game" ? "\u{1F3AE}" : "\u{1F4F1}"}</span>
                  {item.title}
                  {item.featured && <span className="text-amber-500">{"\u2605"}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* IFRAME */}
      <div className="bg-white border rounded-[14px] shadow-sm overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {!seleccionado ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Activa al menos un módulo para ver su vista previa aquí.
          </div>
        ) : (
        <>
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <h4 className="text-sm font-bold text-gray-900">{seleccionado.title}</h4>
          <span className="text-[11px] text-gray-400 font-mono truncate">{seleccionado.target_url}</span>
          <div className="flex-1" />
          {seleccionado.target_url && (
            <a
              href={seleccionado.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
            >
              Abrir en pestaña nueva
            </a>
          )}
        </div>

        <div className="relative bg-[#f4f6f9] aspect-video">
          {!seleccionado.target_url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-sm font-semibold text-gray-700">Sin URL de destino</p>
              <p className="text-xs text-gray-500 max-w-sm">Agrega la URL del módulo para poder previsualizarlo.</p>
            </div>
          ) : errorPrevia ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-sm font-semibold text-gray-700">Este módulo no permite incrustarse</p>
              <p className="text-xs text-gray-500 max-w-sm">
                El sitio bloquea la carga dentro de la consola. Ábrelo en una pestaña nueva para revisarlo.
              </p>
            </div>
          ) : (
            <iframe
              key={seleccionado.id}
              src={seleccionado.target_url}
              title={`Vista previa de ${seleccionado.title}`}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-popups"
              referrerPolicy="no-referrer"
              onError={() => setErrorPrevia(true)}
            />
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}