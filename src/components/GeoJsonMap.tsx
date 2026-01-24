import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { GeoFeatureCollection } from '../lib/types'
import L from 'leaflet'
import { getMapStyleById, getMapStyleId, type MapStyleId } from '../lib/mapTiles'
import { getRegionStyleById, getRegionStyleId, type RegionStyleId } from '../lib/regionStyles'

type RegionState = 'none' | 'target' | 'correct' | 'wrong'

type Props = {
  geojson: GeoFeatureCollection
  idKey: string
  labelKey: string
  onRegionClick?: (regionId: string) => void
  regionStates?: Record<string, RegionState>
  disabled?: boolean
}

export default function GeoJsonMap({
  geojson,
  idKey,
  labelKey,
  onRegionClick,
  regionStates,
  disabled
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const geoLayerRef = useRef<L.GeoJSON | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const disabledRef = useRef(disabled)
  const onRegionClickRef = useRef(onRegionClick)
  const [regionStyleId, setRegionStyleIdState] = useState<RegionStyleId>(getRegionStyleId())

  useEffect(() => {
    disabledRef.current = disabled
    onRegionClickRef.current = onRegionClick
  }, [disabled, onRegionClick])

  useEffect(() => {
    const onStyle = (e: Event) => {
      const id = (e as CustomEvent).detail as RegionStyleId
      setRegionStyleIdState(id)
    }
    window.addEventListener('hqmin.regionstyle', onStyle)
    return () => window.removeEventListener('hqmin.regionstyle', onStyle)
  }, [])

  const styleForState = useMemo(() => {
    const base = getRegionStyleById(regionStyleId)
    const baseFillOpacity = base.fillOpacity ?? 1
    return (state: RegionState) => {
      const fillColor =
        baseFillOpacity === 0
          ? 'rgba(0,0,0,0)'
          : state === 'correct'
            ? 'rgba(34,197,94,0.35)'
            : state === 'wrong'
              ? 'rgba(244,63,94,0.30)'
              : state === 'target'
                ? 'rgba(99,102,241,0.30)'
                : base.fill

      const color =
        state === 'correct'
          ? 'rgba(34,197,94,0.9)'
          : state === 'wrong'
            ? 'rgba(244,63,94,0.9)'
            : state === 'target'
              ? 'rgba(99,102,241,0.9)'
              : base.stroke

      return {
        color,
        weight: 1,
        fillColor,
        fillOpacity: baseFillOpacity
      } as L.PathOptions
    }
  }, [regionStyleId])

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false
    })

    const applyStyle = (id: MapStyleId) => {
      const style = getMapStyleById(id)
      if (tileLayerRef.current) tileLayerRef.current.remove()
      if (!style.url) {
        tileLayerRef.current = null
        return
      }
      tileLayerRef.current = L.tileLayer(style.url, { maxZoom: 19, attribution: style.attribution })
      tileLayerRef.current.addTo(map)
    }

    applyStyle(getMapStyleId())

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
    }
    const container = map.getContainer()
    container.addEventListener('wheel', onWheel, { passive: false })

    const onStyle = (e: Event) => {
      const id = (e as CustomEvent).detail as MapStyleId
      applyStyle(id)
    }
    window.addEventListener('hqmin.mapstyle', onStyle)

    mapRef.current = map

    return () => {
      container.removeEventListener('wheel', onWheel as EventListener)
      window.removeEventListener('hqmin.mapstyle', onStyle)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (geoLayerRef.current) {
      geoLayerRef.current.remove()
      geoLayerRef.current = null
    }

    const layer = L.geoJSON(geojson as any, {
      style: feature => {
        const id = getFeatureId(feature as any, idKey)
        const state = regionStates?.[id] || 'none'
        return styleForState(state)
      },
      onEachFeature: (feature, layer) => {
        const id = getFeatureId(feature as any, idKey)
        layer.on('click', () => {
          if (disabledRef.current) return
          onRegionClickRef.current?.(id)
        })
      }
    })

    layer.addTo(map)
    geoLayerRef.current = layer

    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [16, 16] })
    }

    setTimeout(() => map.invalidateSize(), 0)
  }, [geojson, idKey, labelKey, styleForState])

  useEffect(() => {
    const layer = geoLayerRef.current
    if (!layer) return
    layer.eachLayer(l => {
      const feature = (l as any).feature
      if (!feature) return
      const id = getFeatureId(feature, idKey)
      const state = regionStates?.[id] || 'none'
      if ('setStyle' in l) {
        ;(l as L.Path).setStyle(styleForState(state))
      }
    })
  }, [regionStates, idKey, styleForState])

  const noMap = getMapStyleId() === 'none'
  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden rounded-2xl ring-1 ring-white/10 ${noMap ? 'bg-neutral-800/70' : ''}`}
    />
  )
}

function getFeatureId(feature: any, idKey: string) {
  const p = feature?.properties || {}
  const raw = p[idKey]
  return raw != null ? String(raw) : String(feature?.id ?? '')
}

function getFeatureLabel(feature: any, labelKey: string, fallback: string) {
  const p = feature?.properties || {}
  const raw = p[labelKey]
  return raw != null ? String(raw) : fallback
}
