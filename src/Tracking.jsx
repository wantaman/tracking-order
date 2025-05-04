import React, { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { Icon, divIcon, point } from "leaflet";
import axios from "axios";
import "./App.css";
import "leaflet/dist/leaflet.css";
import RouteMachine from "./config/RouteMachine";
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
// Green icon for delivered
const greenIcon = new Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [38, 38],
});

const warehouseIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3774/3774895.png",
  iconSize: [50, 50],
  iconAnchor: [25, 50],
})

const createClusterCustomIcon = function (cluster) {
  return new divIcon({
    html: `<span class="cluster-icon">${cluster.getChildCount()}</span>`,
    className: "custom-marker-cluster",
    iconSize: point(33, 33, true),
  });
};

export default function Tracking() {
  const [locations, setLocations] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);


  const shouldShowDelivered = (delivery) => {
    if (delivery.status.toLowerCase() !== 'delivered') return true;
    if (!delivery.createdDate) return false;
    
    const deliveredDate = new Date(delivery.createdDate);
    const now = new Date();
    const hoursSinceDelivery = (now - deliveredDate) / (1000 * 60 * 60);
    
    return hoursSinceDelivery <= 24;
  };

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setLocations(prev => prev.filter(shouldShowDelivered));
      setActiveDeliveries(prev => prev.filter(shouldShowDelivered));
    }, 3600000); 

    return () => clearInterval(cleanupInterval);
  }, []);


  useEffect(() => {
    const client = new Client({
      brokerURL: "ws://localhost:9001/ws",
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      
      // Subscrine to new order
      client.subscribe("/topic/shipping", (message) => {
        try {
          const shippingData = JSON.parse(message.body);

          if (!shippingData?.shippingId || !shippingData?.status || !shippingData?.location) {
            return;
          }

          setLocations((prev) => {
            const status = shippingData.status.toLowerCase();
            const existingIndex = prev.findIndex(loc => loc.shippingId === shippingData.shippingId);

            // Remove if delivered more than 24 hours ago
            if (status === "delivered" && !shouldShowDelivered(shippingData)) {
              return prev.filter((loc) => loc. shippingId !== shippingData.shippingId);
            }

            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...shippingData,
                status: status
              };
              return updated;
            } else {
              return [{
                ...shippingData,
                status: status
              }, ...prev];
            }
          });
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      // // Subscribe to real-time location updates for all active deliveries
      // client.subscribe(`/topic/delivery/${trackingNumber}/location`, (message) => {
      //   const update = JSON.parse(message.body);
      //   console.log(update)
        
      //   setActiveDeliveries(prev => 
      //     prev.map(delivery => 
      //       delivery.trackingNumber === update.trackingNumber
      //         ? { 
      //             ...delivery, 
      //             position: {
      //               lat: parseFloat(update.latitude),
      //               lng: parseFloat(update.longitude)
      //             },
      //             lastUpdated: update.timestamp,
      //             speed: update.speed,
      //             heading: update.heading
      //           }
      //         : delivery
      //     )
      //   );
      // });

    };

    client.activate();
    return () => client.deactivate();
  }, []);

  useEffect(() => {
    const fetchShippings = async () => {
      try {
        const response = await axios.get(
          // "https://96.9.77.143:7001/loar-tinh/api/public/shippings",
          "http://localhost:9001/api/public/shippings"
        );

        const filtered = response.data.data.filter(
          (location) => location.status.toLowerCase() !== "delivered" || shouldShowDelivered(location)
        );
        setLocations(filtered);
      } catch (error) {
        console.error("Error fetching shipping data:", error);
      }
    };
    fetchShippings();
  }, []);


  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    } else {
      console.log('Geolocation is not supported by your browser');
    }
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "5rem",
          left: "10px",
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
        <div style={{ marginBottom: "5px" }}>
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
        <div>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              backgroundColor: "green",
              borderRadius: "50%",
              marginRight: "6px",
            }}
          ></span>
          Delivered
        </div>
      </div>
      <button
        onClick={() => handleCurrentLocation()}
        style={{
          position: "absolute",
          bottom: "5%",
          right: "2%",
          zIndex: 1000,
          border: "none",
          backgroundColor: "white",
          paddingInline: "10px",
          paddingTop: "10px",
          borderRadius: "50%",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          fontSize: "2rem",
          cursor: "pointer",
        }}
      >
        <ion-icon name="navigate-circle-outline"></ion-icon>
      </button>

      <MapContainer
        center={[11.530283383729236, 104.93863708561429]}
        zoom={13}
        style={{ position: "relative" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={warehouseIcon}>
            <Popup>
              <b>My Warehouse</b>
            </Popup>
          </Marker>
        )}

        {selectedRoute && (
          <RouteMachine 
          from={selectedRoute.from} 
          to={selectedRoute.to} />
        )}

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
        >
          {locations
            .filter((location) => location.location && location.location.latitude && location.location.longitude)
            .map((location) => {
              const status = location.status.toLowerCase();
              const position = [
                parseFloat(location.location.latitude),
                parseFloat(location.location.longitude),
              ];
              const icon = status === "delivered" ? greenIcon : status === "pending" ? redIcon : blueIcon;

              return (
                <Marker
                  key={location.shippingId}
                  position={position}
                  icon={icon}
                  eventHandlers={{
                    click: (e) => {

                      if (!currentLocation) {
                        console.log("Please set your current warehouse location first!");
                        return;
                      }

                      if (selectedRoute &&
                        selectedRoute.from.lat === position[0] &&
                        selectedRoute.from.lng === position[1]) {
                        setSelectedRoute(null);
                      } else {

                        setSelectedRoute({
                          from: { lat: position[0], lng: position[1] },
                          to: currentLocation,
                        });
                      }
                      e.target.openPopup();
                    }
                  }}
                >
                  <Popup>
                    <b>OrderNo:</b> {location.orderNo} <br />
                    <b>City: </b> {location.location.city} <br />
                    <b>Status:</b> {status.toUpperCase()} <br />
                    {status === 'delivered' && location.deliveredAt && (
                      <><b>Delivered at:</b> {new Date(location.createdDate).toLocaleString()}<br /></>
                    )}
                    
                  </Popup>
                </Marker>
              );
            })}
        </MarkerClusterGroup>
      </MapContainer>
    </>
  );
}
