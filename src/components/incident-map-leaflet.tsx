import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import type { getWorkspace } from "@/lib/dms.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Hospital, 
  MapPin, 
  Search, 
  Eye, 
  ShieldCheck, 
  TentTree, 
  AlertTriangle 
} from "lucide-react";

type ResponseWorkspace = Awaited<ReturnType<typeof getWorkspace>>;

interface IncidentMapLeafletProps {
  data: ResponseWorkspace;
}

type LayerType = "osm" | "carto_light" | "satellite";

interface MapMarker {
  id: string;
  kind: "Disasters" | "Shelters" | "Hospitals" | "Response Teams" | "Warehouses";
  name: string;
  lat: number;
  lng: number;
  severity?: string | undefined;
  status?: string | undefined;
  details: string;
  address?: string | undefined;
  stats?: string | undefined;
}

export function IncidentMapLeaflet({ data }: IncidentMapLeafletProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeLayer, setActiveLayer] = useState<LayerType>("osm");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MapMarker | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Collect all markers across all entities
  const allMarkers = useMemo(() => {
    const items: MapMarker[] = [];

    // Disasters
    (data.disasters || []).forEach((d: { id: string; title: string; latitude: number | string | null; longitude: number | string | null; severity?: string; status?: string; disaster_type?: string; response_status?: string | null; address?: string | null; city?: string; district?: string; people_affected?: number; evacuated?: number }) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        items.push({
          id: `disaster-${d.id}`,
          kind: "Disasters",
          name: d.title,
          lat,
          lng,
          severity: d.severity,
          status: d.status,
          details: `${d.disaster_type ?? "Disaster"} · ${d.response_status || d.status || ""}`,
          address: `${d.address || d.city || ""}, ${d.district || ""}`,
          stats: `${(d.people_affected ?? 0).toLocaleString()} affected · ${(d.evacuated ?? 0).toLocaleString()} evacuated`,
        });
      }
    });

    // Shelters
    (data.shelters || []).forEach((s: { id: string; shelter_name: string; latitude: number | string | null; longitude: number | string | null; status?: string; shelter_type?: string; address?: string | null; city?: string; district?: string; current_occupancy?: number; capacity?: number; available_capacity?: number | null }) => {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        const capacity = s.capacity ?? 0;
        const occ = s.current_occupancy ?? 0;
        items.push({
          id: `shelter-${s.id}`,
          kind: "Shelters",
          name: s.shelter_name,
          lat,
          lng,
          status: s.status,
          details: `${s.shelter_type ?? "Shelter"} · ${s.status ?? "Open"}`,
          address: `${s.address || s.city || ""}, ${s.district || ""}`,
          stats: `${occ} / ${capacity} occupied (${s.available_capacity ?? Math.max(0, capacity - occ)} available)`,
        });
      }
    });

    // Hospitals
    (data.hospitals || []).forEach((h: { id: string; hospital_name: string; latitude: number | string | null; longitude: number | string | null; status?: string; location?: string; address?: string | null; available_beds?: number; ambulance_count?: number }) => {
      const lat = Number(h.latitude);
      const lng = Number(h.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        items.push({
          id: `hospital-${h.id}`,
          kind: "Hospitals",
          name: h.hospital_name,
          lat,
          lng,
          status: h.status,
          details: `${h.location ?? "Hospital"} · ${h.status ?? "Operational"}`,
          address: h.address || h.location || "",
          stats: `${h.available_beds ?? 0} beds available · ${h.ambulance_count ?? 0} ambulances`,
        });
      }
    });

    // Response Teams
    (data.teams || []).forEach((t: { id: string; team_name: string; latitude: number | string | null; longitude: number | string | null; status?: string; team_type?: string; current_location?: string; phone?: string }) => {
      const lat = Number(t.latitude);
      const lng = Number(t.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        items.push({
          id: `team-${t.id}`,
          kind: "Response Teams",
          name: t.team_name,
          lat,
          lng,
          status: t.status,
          details: `${t.team_type ?? "Response Team"} · ${t.status ?? "Available"}`,
          address: t.current_location || "",
          stats: `Contact: ${t.phone || "Emergency Line"}`,
        });
      }
    });

    // Warehouses
    (data.warehouses || []).forEach((w: { id: string; warehouse_name: string; latitude: number | string | null; longitude: number | string | null; status?: string; location?: string; address?: string | null; capacity?: number; current_utilization?: number | null }) => {
      const lat = Number(w.latitude);
      const lng = Number(w.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        items.push({
          id: `warehouse-${w.id}`,
          kind: "Warehouses",
          name: w.warehouse_name,
          lat,
          lng,
          status: w.status,
          details: `${w.location ?? "Storage Hub"} · ${w.status ?? "Active"}`,
          address: w.address || w.location || "",
          stats: `Capacity: ${(w.capacity ?? 1000).toLocaleString()} units · Utilized: ${(w.current_utilization ?? 0).toLocaleString()}`,
        });
      }
    });

    return items;
  }, [data]);

  // Filtered markers based on Category and Search
  const filteredMarkers = useMemo(() => {
    return allMarkers.filter((m) => {
      const matchCategory = activeCategory === "All" || m.kind === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.details.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [allMarkers, activeCategory, searchQuery]);

  // Marker icon builder
  const createMarkerIcon = (kind: string, severity?: string) => {
    let bgColor = "#3b82f6";
    let iconChar = "📍";

    if (kind === "Disasters") {
      bgColor = severity === "Critical" ? "#dc2626" : "#ea580c";
      iconChar = "⚠️";
    } else if (kind === "Shelters") {
      bgColor = "#059669";
      iconChar = "⛺";
    } else if (kind === "Hospitals") {
      bgColor = "#2563eb";
      iconChar = "🏥";
    } else if (kind === "Response Teams") {
      bgColor = "#7c3aed";
      iconChar = "🛡️";
    } else if (kind === "Warehouses") {
      bgColor = "#d97706";
      iconChar = "🏢";
    }

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
        ${kind === "Disasters" ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${bgColor}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ""}
        <div style="position: relative; z-index: 10; width: 34px; height: 34px; border-radius: 50%; background-color: ${bgColor}; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; font-size: 15px; color: white;">
          ${iconChar}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-leaflet-marker",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  };

  // Base tile layers
  const getTileLayer = (layer: LayerType) => {
    switch (layer) {
      case "carto_light":
        return L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        });
      case "satellite":
        return L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          maxZoom: 18,
        });
      case "osm":
      default:
        return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mounted || !mapContainerRef.current || mapInstanceRef.current) return;

    // Default center over Tamil Nadu / South India
    const defaultCenter: L.LatLngTuple = [12.2, 79.5];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 8,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const baseTile = getTileLayer(activeLayer);
    baseTile.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mounted]);

  // Update base tile layer on layer change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const newTile = getTileLayer(activeLayer);
    newTile.addTo(map);
  }, [activeLayer]);

  // Update markers when data/filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    filteredMarkers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], {
        icon: createMarkerIcon(m.kind, m.severity),
      });

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 9999px; background: ${
              m.kind === "Disasters" ? "#fee2e2; color: #dc2626" : m.kind === "Shelters" ? "#d1fae5; color: #059669" : m.kind === "Hospitals" ? "#dbeafe; color: #2563eb" : "#f3e8ff; color: #7c3aed"
            };">${m.kind}</span>
            ${m.severity ? `<span style="font-size: 11px; font-weight: 700; color: #ea580c;">${m.severity}</span>` : ""}
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${m.name}</h4>
          ${m.address ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">📍 ${m.address}</p>` : ""}
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">${m.details}</p>
          ${m.stats ? `<p style="margin: 0; font-size: 11px; padding: 4px 6px; background: #f8fafc; border-radius: 4px; color: #475569; border: 1px solid #e2e8f0;">${m.stats}</p>` : ""}
          <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; font-family: monospace;">GPS: ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.on("click", () => {
        setSelectedItem(m);
      });

      marker.addTo(layerGroup);
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredMarkers]);

  // Recenter map
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !filteredMarkers.length) return;
    const bounds: L.LatLngTuple[] = filteredMarkers.map((m) => [m.lat, m.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  // Focus specific item
  const handleFocusItem = (item: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([item.lat, item.lng], 13, { animate: true });
  };

  const categories = [
    { label: "All", count: allMarkers.length },
    { label: "Disasters", count: allMarkers.filter((m) => m.kind === "Disasters").length },
    { label: "Shelters", count: allMarkers.filter((m) => m.kind === "Shelters").length },
    { label: "Hospitals", count: allMarkers.filter((m) => m.kind === "Hospitals").length },
    { label: "Response Teams", count: allMarkers.filter((m) => m.kind === "Response Teams").length },
    { label: "Warehouses", count: allMarkers.filter((m) => m.kind === "Warehouses").length },
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="size-5 text-primary" /> Live GIS Incident & Infrastructure Map
          </h2>
          <p className="text-xs text-muted-foreground">
            Interactive geographic command view of active disasters, relief shelters, medical trauma units, and response depots.
          </p>
        </div>

        {/* Layer Selector & Recenter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
            <Button
              size="sm"
              variant={activeLayer === "osm" ? "default" : "ghost"}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveLayer("osm")}
            >
              Standard
            </Button>
            <Button
              size="sm"
              variant={activeLayer === "carto_light" ? "default" : "ghost"}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveLayer("carto_light")}
            >
              Voyager
            </Button>
            <Button
              size="sm"
              variant={activeLayer === "satellite" ? "default" : "ghost"}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveLayer("satellite")}
            >
              Satellite
            </Button>
          </div>

          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleRecenter} title="Fit all locations on screen">
            <Eye className="size-3.5" /> Recenter
          </Button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Button
              key={c.label}
              size="sm"
              variant={activeCategory === c.label ? "default" : "outline"}
              className="h-8 text-xs font-medium"
              onClick={() => setActiveCategory(c.label)}
            >
              {c.label}
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-semibold">
                {c.count}
              </span>
            </Button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search incident, district, shelter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Map Display Container */}
      <div className="relative h-[640px] w-full overflow-hidden rounded-xl border border-border shadow-md">
        {/* Leaflet Map Target Element */}
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 rounded-lg border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5">
          <div className="font-bold text-foreground mb-1 flex items-center justify-between">
            <span>Map Legend</span>
            <span className="text-[10px] text-muted-foreground font-normal ml-2">{filteredMarkers.length} active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-600 border border-white shadow-sm inline-block" />
            <span className="text-muted-foreground">Disasters & Hazards</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-600 border border-white shadow-sm inline-block" />
            <span className="text-muted-foreground">Relief Shelters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-blue-600 border border-white shadow-sm inline-block" />
            <span className="text-muted-foreground">Hospitals & Trauma Centres</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-purple-600 border border-white shadow-sm inline-block" />
            <span className="text-muted-foreground">Response Teams</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-amber-600 border border-white shadow-sm inline-block" />
            <span className="text-muted-foreground">Logistics Depots</span>
          </div>
        </div>

        {/* Selected Location Card Overlay */}
        {selectedItem && (
          <div className="absolute bottom-5 left-5 z-10 max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className={
                  selectedItem.kind === "Disasters"
                    ? "border-red-500 bg-red-500/10 text-red-600 font-bold"
                    : selectedItem.kind === "Shelters"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold"
                    : selectedItem.kind === "Hospitals"
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 font-bold"
                    : "border-purple-500 bg-purple-500/10 text-purple-600 font-bold"
                }
              >
                {selectedItem.kind}
              </Badge>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setSelectedItem(null)}>
                ✕
              </Button>
            </div>

            <h3 className="mt-2 text-sm font-bold text-foreground">{selectedItem.name}</h3>
            {selectedItem.address && (
              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-primary shrink-0" /> {selectedItem.address}
              </p>
            )}

            <p className="mt-2 text-xs font-medium text-foreground/90">{selectedItem.details}</p>
            {selectedItem.stats && (
              <p className="mt-2 rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
                {selectedItem.stats}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
              <span className="font-mono">
                {selectedItem.lat.toFixed(4)}, {selectedItem.lng.toFixed(4)}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs gap-1"
                onClick={() => handleFocusItem(selectedItem)}
              >
                Focus <Eye className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Active Disasters</p>
          <p className="mt-1 text-lg font-bold text-red-600">
            {(data.disasters || []).filter((d: { status?: string }) => d.status === "Active" || d.status === "Under Response").length} Active
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Shelter Spaces</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">
            {(data.shelters || []).reduce((acc: number, s: { available_capacity?: number | null; capacity?: number; current_occupancy?: number }) => acc + (s.available_capacity ?? Math.max(0, (s.capacity ?? 0) - (s.current_occupancy ?? 0))), 0).toLocaleString()} Available
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Hospital Beds</p>
          <p className="mt-1 text-lg font-bold text-blue-600">
            {(data.hospitals || []).reduce((acc: number, h: { available_beds?: number }) => acc + (h.available_beds ?? 0), 0).toLocaleString()} Free Beds
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Deployed Teams</p>
          <p className="mt-1 text-lg font-bold text-purple-600">
            {(data.teams || []).filter((t: { status?: string }) => t.status === "Deployed" || t.status === "Assigned").length} Deployed
          </p>
        </div>
      </div>
    </div>
  );
}
