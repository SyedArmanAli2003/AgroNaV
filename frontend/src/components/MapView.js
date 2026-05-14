import React, { useEffect, useRef } from "react";

const PIN_COLOR = { HIGH: "red", MEDIUM: "orange", LOW: "green" };

function MapView({ outlets }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (!window.google || !window.google.maps) return;
    if (!mapObj.current && mapRef.current) {
      mapObj.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 17.0575, lng: 79.2671 },
        zoom: 13
      });
    }
  }, []);

  useEffect(() => {
    if (!window.google || !mapObj.current) return;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    outlets.forEach((outlet) => {
      const marker = new window.google.maps.Marker({
        position: { lat: outlet.lat, lng: outlet.lng },
        map: mapObj.current,
        title: outlet.name,
        icon: {
          url: `http://maps.google.com/mapfiles/ms/icons/${PIN_COLOR[outlet.label] || "green"}-dot.png`
        }
      });
      const info = new window.google.maps.InfoWindow({
        content: `<b>${outlet.name}</b><br>${outlet.label}<br>${(outlet.reasons || [])[0] || ""}`
      });
      marker.addListener("click", () => info.open(mapObj.current, marker));
      markers.current.push(marker);
    });
  }, [outlets]);

  if (!window.google) {
    return (
      <div
        style={{
          height: "220px",
          background: "var(--bg-card)",
          border: "1px dashed var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontSize: "13px",
          marginBottom: "16px",
          backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
        Map loads when GOOGLE_MAPS_KEY is added
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        height: 260, borderRadius: "var(--radius-lg)", marginBottom: 16,
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      }}
    />
  );
}

export default MapView;
