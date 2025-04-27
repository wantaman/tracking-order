import React, { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { Icon, divIcon, point } from "leaflet";
import axios from "axios";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { Client } from "@stomp/stompjs";

// Red icon for pending
const redIcon = new Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [38, 38],
});

// Blue icon for in_transit
const blueIcon = new Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [38, 38],
});

const deliveryIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/9018/9018802.png",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
});

const createClusterCustomIcon = function (cluster) {
  return new divIcon({
    html: `<span class="cluster-icon">${cluster.getChildCount()}</span>`,
    className: "custom-marker-cluster",
    iconSize: point(33, 33, true),
  });
};

export default function App() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchShippings = async () => {
      try {
        const response = await axios.get(
          "http://localhost:9001/api/public/shippings"
        );

        const filtered = response.data.data.filter(
          (location) => location.status.toLowerCase() !== "delivered"
        );
        setLocations(filtered);
      } catch (error) {
        console.error("Error fetching shipping data:", error);
      }
    };
    fetchShippings();
  }, []);

  useEffect(() => {
    const client = new Client({
      brokerURL: "ws://localhost:9001/ws",
      reconnectDelay: 5000,
    });
    client.onConnect = (frame) => {
      // console.log("Connected: " + frame);
      client.subscribe("/topic/shipping", (message) => {
        const newShipping = JSON.parse(message.body);
        setLocations((prev) => [newShipping, ...prev]);
      });
    };

    client.activate();
    return () => client.deactivate();
  }, []);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          fontSize: "14px",
        }}
      >
        <div style={{ marginBottom: "5px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              backgroundColor: "red",
              borderRadius: "50%",
              marginRight: "6px",
            }}
          ></span>
          Pending
        </div>
        <div>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              backgroundColor: "blue",
              borderRadius: "50%",
              marginRight: "6px",
            }}
          ></span>
          In Transit
        </div>
      </div>
      <MapContainer
        center={[11.530283383729236, 104.93863708561429]}
        zoom={13}
        style={{ position: "relative" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
        >
          {locations.map((location) => {
            const status = location.status.toLowerCase();
            const position = [
              parseFloat(location.location.latitude),
              parseFloat(location.location.longitude),
            ];
            const icon = status === "pending" ? redIcon : blueIcon;

            return (
              <Marker key={location.shippingId} position={position} icon={icon}>
                <Popup>
                  <b>Tracking Number:</b> {location.trackingNumber} <br />
                  <b>City: </b> {location.location.city} <br />
                  <b>Status:</b> {status}
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </>
  );
}
